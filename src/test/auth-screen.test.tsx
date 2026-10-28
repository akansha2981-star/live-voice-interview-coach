import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  getSession: vi.fn(),
  unsubscribe: vi.fn(),
  listener: undefined as undefined | ((event: string, session: unknown) => void),
}));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {
  getSession: mocks.getSession,
  onAuthStateChange: (listener: typeof mocks.listener) => {
    mocks.listener = listener;
    return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
  },
} } }));
vi.mock("@/integrations/lovable/index", () => ({ lovable: { auth: {} } }));
import { AuthScreen } from "@/components/auth-screen";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

it("waits for the auth callback to finish and navigates only once when session hydration overlaps sign-in", async () => {
  vi.useFakeTimers();
  const session = { user: { id: "student" } };
  mocks.getSession.mockResolvedValue({ data: { session } });
  render(<AuthScreen redirect="/dashboard" />);
  act(() => { mocks.listener?.("SIGNED_IN", session); });
  expect(mocks.navigate).not.toHaveBeenCalled();
  await act(async () => { await Promise.resolve(); });
  await act(async () => { vi.runAllTimers(); });
  expect(mocks.navigate).toHaveBeenCalledTimes(1);
  expect(mocks.navigate).toHaveBeenCalledWith({ to: "/dashboard", replace: true });
});

it("does not navigate after the sign-in screen unmounts", async () => {
  vi.useFakeTimers();
  mocks.getSession.mockResolvedValue({ data: { session: null } });
  const { unmount } = render(<AuthScreen />);
  act(() => { mocks.listener?.("SIGNED_IN", { user: { id: "student" } }); });
  unmount();
  await act(async () => { vi.runAllTimers(); });
  expect(mocks.navigate).not.toHaveBeenCalled();
  expect(mocks.unsubscribe).toHaveBeenCalled();
});