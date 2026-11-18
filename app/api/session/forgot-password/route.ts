import { relayPasswordRequest } from "@/lib/server/password";

export const POST = (request: Request) => relayPasswordRequest("forgot-password", request);
