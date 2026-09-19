import type { RouteHandler } from "@/lib/server/http";

export const getHealth: RouteHandler = async () => {
  return Response.json({
    status: "ok",
    message: "Backend is running!",
    timestamp: new Date().toISOString(),
  });
};
