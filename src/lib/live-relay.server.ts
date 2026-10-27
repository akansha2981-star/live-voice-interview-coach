import process from "node:process";
import { authorizeInterviewSession } from "./interview-session.server";
import { recordUsage, type Attribution } from "./finance.server";

// Live interviewer runs directly on the owner's OpenAI Realtime account (OPENAI_API_KEY).
// The browser keeps its existing event contract; this relay translates OpenAI events into it.
export type LiveConfig = {
  baseURL: string;
  key: string;
  liveModel: string;
  transcribeModel: string;
};

const liveSettings = {
  baseURL: "https://api.openai.com/v1",
  liveModel: "gpt-realtime-2.1",
  transcribeModel: "gpt-4o-transcribe",
};

export type LiveSocket = {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onMessage(handler: (data: unknown) => void): void;
  onClose(handler: () => void): void;
  onError(handler: () => void): void;
};

export type LiveExecutionContext = { waitUntil(task: Promise<unknown>): void };
export type LiveConnector = (url: string, headers: Record<string, string>, signal: AbortSignal) => Promise<LiveSocket>;

type WorkerSocket = WebSocket & { accept(): void };
declare const WebSocketPair: { new (): { 0: WorkerSocket; 1: WorkerSocket } };

type OpenAIEvent = {
  type: string;
  delta?: string;
  transcript?: string;
  item_id?: string;
  error?: { message?: string; code?: string };
};

export function getLiveConfig(): LiveConfig {
  const config: LiveConfig = { ...liveSettings, key: process.env["OPENAI_API_KEY"] ?? "" };
  if (!config.key) throw new Error("Missing OpenAI key for live voice");
  return config;
}

export function validateLiveUpgrade(request: Request, options: { allowMissingOrigin?: boolean } = {}): Response | null {
  const origin = request.headers.get("origin");
  if (origin === null ? !options.allowMissingOrigin : origin !== new URL(request.url).origin) {
    return new Response("Voice connection origin rejected", { status: 403 });
  }
  if (request.method !== "GET" || request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return new Response("WebSocket required", { status: 426 });
  }
  return null;
}

function workerSocket(socket: WorkerSocket): LiveSocket {
  return {
    get readyState() {
      return socket.readyState;
    },
    send: (data) => socket.send(data),
    close: (code, reason) => socket.close(code, reason),
    onMessage: (handler) => socket.addEventListener("message", (event) => handler(event.data)),
    onClose: (handler) => socket.addEventListener("close", handler),
    onError: (handler) => socket.addEventListener("error", handler),
  };
}

export function handleLiveRequest(request: Request): Response {
  const waitUntil = (request as Request & Partial<LiveExecutionContext>).waitUntil;
  if (!waitUntil) return new Response("Live runtime unavailable", { status: 503 });
  const config = getLiveConfig();
  const rejected = validateLiveUpgrade(request);
  if (rejected) return rejected;
  const pair = new WebSocketPair();
  pair[1].accept();
  bindLiveConnection(workerSocket(pair[1]), config, { waitUntil }, async (url, headers, signal) => {
    const response = await fetch(url, { headers: { ...headers, Upgrade: "websocket" }, signal });
    const socket = (response as Response & { webSocket?: WorkerSocket | null }).webSocket;
    if (!socket) throw new Error(`OpenAI rejected the voice control connection (${response.status})`);
    socket.accept();
    return workerSocket(socket);
  });
  const response: ResponseInit & { webSocket: WebSocket } = { status: 101, webSocket: pair[0] };
  return new Response(null, response);
}

async function openAIError(response: Response) {
  const body = (await response.json().catch(() => null)) as { error?: { message?: unknown; code?: unknown } } | null;
  if (response.status === 401) return new Error("The OpenAI key is invalid or revoked.");
  if (response.status === 429 && body?.error?.code === "insufficient_quota") return new Error("The OpenAI account has run out of credit.");
  if (response.status === 429) return new Error("OpenAI voice is busy. Please try again in a minute.");
  const message = typeof body?.error?.message === "string" ? body.error.message.slice(0, 300) : "";
  return new Error(message || `OpenAI voice rejected the call (${response.status})`);
}

export function bindLiveConnection(
  browser: LiveSocket,
  config: LiveConfig,
  execution: LiveExecutionContext,
  connect: LiveConnector,
): void {
  const setupAbort = new AbortController();
  let control: LiveSocket | undefined;
  let callID: string | undefined;
  let opening = "";
  let attribution: Attribution | undefined;
  let startedAt = 0;
  let startedIso = new Date().toISOString();
  let starting = false;
  let closing = false;
  let finished = false;
  let greeted = false;
  let browserReady = false;
  let interviewTimer: ReturnType<typeof setTimeout> | undefined;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  const startTimer = setTimeout(() => {
    emit({ type: "app.error", error: { message: "Voice startup message timed out" } });
    stop();
  }, 5000);

  const elapsed = () => (startedAt ? Date.now() - startedAt : 0);
  const seconds = () => Math.max(0, Math.round(elapsed() / 1000));

  function emit(event: object) {
    if (browser.readyState !== 1) return;
    try {
      browser.send(JSON.stringify(event));
    } catch {
      stop();
    }
  }

  function persist(finalized: boolean) {
    if (!attribution || !callID) return;
    execution.waitUntil(
      recordUsage({
        eventKey: `live:${callID}`,
        occurredAt: startedIso,
        model: config.liveModel,
        attribution: { ...attribution, service: "live_voice" },
        status: finalized ? "completed" : "unconfirmed",
        finalized,
        seconds: seconds(),
      }),
    );
  }

  function hangup() {
    if (!callID) return;
    execution.waitUntil(
      fetch(`${config.baseURL}/realtime/calls/${callID}/hangup`, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.key}` },
      }).catch(() => undefined),
    );
  }

  function finish() {
    if (finished) return;
    finished = closing = true;
    clearTimeout(startTimer);
    clearTimeout(interviewTimer);
    clearTimeout(closeTimer);
    setupAbort.abort();
    persist(true);
    hangup();
    emit({ type: "session.closed", usage: { seconds: seconds() } });
    try { control?.close(1000, "Call ended"); } catch { /* already closed */ }
    try { browser.close(1000, "Call ended"); } catch { /* already closed */ }
  }

  function stop() {
    if (closing) return;
    closing = true;
    // Short grace period lets the final transcript events arrive before the call is torn down.
    closeTimer = setTimeout(finish, 800);
  }

  function greet() {
    if (greeted || !browserReady || !control || control.readyState !== 1 || closing) return;
    greeted = true;
    control.send(
      JSON.stringify({
        type: "response.create",
        response: {
          instructions: `${opening}\nStart now: greet the candidate briefly and ask the first question, then listen.`,
        },
      }),
    );
    emit({ type: "app.greeting.accepted" });
  }

  function receiveControl(data: unknown) {
    try {
      const text = typeof data === "string" ? data : new TextDecoder().decode(data as ArrayBuffer);
      const event: OpenAIEvent = JSON.parse(text);
      const at = elapsed();
      if (event.type === "response.output_audio_transcript.delta" && event.delta) {
        emit({ type: "session.output_transcript.delta", delta: event.delta, start_ms: at, end_ms: at });
      } else if (event.type === "conversation.item.input_audio_transcription.completed" && event.transcript?.trim()) {
        emit({ type: "session.input_transcript.delta", delta: `${event.transcript.trim()} `, start_ms: at, end_ms: at });
      } else if (event.type === "error") {
        const message = event.error?.message ?? "OpenAI voice error";
        // Cancelling a response that has already finished is harmless; keep the call alive.
        if (event.error?.code !== "response_cancel_not_active") emit({ type: "app.warning", error: { message } });
      } else if (event.type === "session.created" || event.type === "session.updated") {
        greet();
      }
    } catch {
      /* ignore malformed provider events */
    }
  }

  async function startSession(sdp: string, token: unknown, interviewID: unknown) {
    if (closing || browser.readyState !== 1) return;
    clearTimeout(startTimer);
    const session = await authorizeInterviewSession(token, interviewID);
    attribution = { product: "interview", userId: session.userId, transactionId: session.interviewId, service: "live_voice" };
    opening = session.opening ?? "";
    interviewTimer = setTimeout(() => {
      emit({ type: "app.interview.limit", reason: "duration", message: "Thank you for attending your interview." });
      emit({ type: "gateway.session.closing", reason: "interview_duration_limit" });
      execution.waitUntil((async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("interviews").update({ limit_closed_reason: "duration" }).eq("id", session.interviewId).eq("status", "in_progress");
      })());
      stop();
    }, Math.max(0, session.deadline - Date.now()));

    const form = new FormData();
    form.set("sdp", sdp);
    form.set(
      "session",
      JSON.stringify({
        type: "realtime",
        model: config.liveModel,
        instructions: session.instructions,
        audio: {
          input: {
            transcription: { model: config.transcribeModel, language: "en" },
            noise_reduction: { type: "near_field" },
            turn_detection: { type: "semantic_vad", eagerness: "low" },
          },
          output: { voice: "marin" },
        },
      }),
    );
    const response = await fetch(`${config.baseURL}/realtime/calls`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.key}` },
      body: form,
      signal: setupAbort.signal,
    });
    if (!response.ok) throw await openAIError(response);
    const answer = await response.text();
    callID = response.headers.get("location")?.split("/").filter(Boolean).pop();
    if (!callID || !answer.trim()) throw new Error("OpenAI did not return a voice session");
    if (closing || browser.readyState !== 1) return hangup();
    startedAt = Date.now();
    startedIso = new Date().toISOString();
    persist(false);
    emit({ type: "gateway.session.created", session: { id: callID }, transport: { type: "webrtc", sdp: answer } });

    const socket = await connect(
      `${config.baseURL}/realtime?call_id=${encodeURIComponent(callID)}`,
      { Authorization: `Bearer ${config.key}` },
      setupAbort.signal,
    );
    if (closing) {
      try { socket.close(); } catch { /* ignore */ }
      return;
    }
    control = socket;
    control.onMessage(receiveControl);
    control.onClose(() => { if (!finished) finish(); });
    control.onError(() => {
      emit({ type: "app.error", error: { message: "Voice control connection failed" } });
      stop();
    });
    greet();
  }

  browser.onMessage((data) => {
    try {
      if (typeof data !== "string" || data.length > 64 * 1024) throw new Error("Invalid client message");
      const event = JSON.parse(data);
      if (event.type === "session.close") return stop();
      if (closing) return;
      if (event.type === "gateway.heartbeat") return emit({ type: "gateway.heartbeat.ack" });
      if (event.type === "app.ready") {
        browserReady = true;
        greet();
        return;
      }
      if (event.type === "app.start" && !starting && typeof event.sdp === "string" && event.sdp.trim()) {
        starting = true;
        execution.waitUntil(
          startSession(event.sdp, event.token, event.interview_id).catch((error) => {
            if (!closing) emit({ type: "app.error", error: { message: error instanceof Error ? error.message : "Voice startup failed" } });
            stop();
          }),
        );
        return;
      }
      throw new Error("Unsupported client event");
    } catch {
      emit({ type: "app.error", error: { message: "Voice connection could not be started or continued" } });
      stop();
    }
  });
  browser.onClose(stop);
  browser.onError(stop);
}
