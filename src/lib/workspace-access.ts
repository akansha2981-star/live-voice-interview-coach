/**
 * The student dashboard is open to every signed-in student, including before launch
 * (owner decision, 13 Nov 2026). Flip to false to bring back the course-purchase lock.
 */
export const WORKSPACE_OPEN_BEFORE_LAUNCH = true;

/** Prelaunch access never implies staff permissions or changes interview credits. */
export function canEnterWorkspace(live: boolean, staff: boolean, purchased: boolean, exception: boolean, openBeforeLaunch = WORKSPACE_OPEN_BEFORE_LAUNCH) {
  return live || openBeforeLaunch || staff || purchased || exception;
}
