import { relayPasswordRequest } from "@/lib/server/password";

export const POST = (request: Request) => relayPasswordRequest("reset-password", request);
