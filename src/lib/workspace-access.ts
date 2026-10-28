/** Prelaunch access never implies staff permissions or changes interview credits. */
export function canEnterWorkspace(live: boolean, staff: boolean, purchased: boolean, exception: boolean) {
  return live || staff || purchased || exception;
}