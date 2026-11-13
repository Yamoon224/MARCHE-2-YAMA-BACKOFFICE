import { currentStaff, endStaffSession, startStaffSession } from "@/lib/server/session";

export const POST = (request: Request) => startStaffSession(request);
export const GET = () => currentStaff();
export const DELETE = () => endStaffSession();
