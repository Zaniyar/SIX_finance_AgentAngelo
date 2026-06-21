import { Request, Response, NextFunction } from "express";

const rmActivity = new Map<string, number>();

export function rmActivityMiddleware(req: Request, _res: Response, next: NextFunction) {
  // Track any API activity as RM presence (rm1 = default RM for this demo)
  rmActivity.set("rm1", Date.now());
  next();
}

export function getRmLastSeen(rmId = "rm1"): number | null {
  return rmActivity.get(rmId) ?? null;
}
