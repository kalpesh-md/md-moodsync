import type { NextRequest } from "next/server";
import app from "@/lib/express-app";
import { forwardToExpress } from "@/lib/express-adapter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  return forwardToExpress(app, req);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
export const HEAD = handle;
