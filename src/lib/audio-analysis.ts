import type { AudioSample } from "./performance";

/** Analyses the existing microphone stream; no recording or duplicate media request. */
export function observeMicrophone(stream: MediaStream, onSample: (sample: AudioSample) => void, isMuted: () => boolean) {
  const context = new AudioContext();
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  const data = new Float32Array(analyser.fftSize);
  void context.resume().catch(() => {});
  const timer = setInterval(() => {
    if (context.state !== "running") return;
    analyser.getFloatTimeDomainData(data);
    let sum = 0, peak = 0;
    for (const value of data) { sum += value * value; peak = Math.max(peak, Math.abs(value)); }
    onSample({ t: performance.now(), rms: Math.sqrt(sum / data.length), peak, muted: isMuted() });
  }, 200);
  return () => { clearInterval(timer); source.disconnect(); analyser.disconnect(); void context.close().catch(() => {}); };
}