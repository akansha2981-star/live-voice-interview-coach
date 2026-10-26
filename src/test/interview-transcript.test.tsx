import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { InterviewTranscript } from "@/components/interview-transcript";
import type { TranscriptTurn } from "@/lib/interview-metrics";

afterEach(cleanup);
it("follows only the transcript container and pauses while reviewing history", () => {
  const turns: TranscriptTurn[] = [{ role: "assistant", text: "Why MBA?", start_ms: 0, end_ms: 1000 }];
  const { rerender } = render(<InterviewTranscript turns={turns} live />);
  const container = screen.getByRole("region", { name: "Transcript messages" });
  Object.defineProperty(container, "scrollHeight", { configurable: true, value: 1000 });
  Object.defineProperty(container, "clientHeight", { configurable: true, value: 200 });
  rerender(<InterviewTranscript turns={[...turns, { role: "user", text: "Leadership", start_ms: 1000, end_ms: 2000 }]} live />);
  expect(container.scrollTop).toBe(1000);
  container.scrollTop = 100;
  fireEvent.scroll(container);
  rerender(<InterviewTranscript turns={[...turns, { role: "user", text: "More details", start_ms: 1000, end_ms: 3000 }]} live />);
  expect(container.scrollTop).toBe(100);
  fireEvent.click(screen.getByRole("button", { name: "Jump to latest" }));
  expect(container.scrollTop).toBe(1000);
});