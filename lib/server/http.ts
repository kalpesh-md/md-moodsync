import { getAuthUser, unauthorizedResponse, type AuthUser } from "@/lib/server/auth";

export type RouteContext = { params: Record<string, string> };
export type RouteHandler = (
  request: Request,
  ctx: RouteContext,
) => Promise<Response>;

export async function requireAuth(
  request: Request,
): Promise<{ user: AuthUser; response?: never } | { user?: never; response: Response }> {
  const user = await getAuthUser(request);
  if (!user) return { response: unauthorizedResponse() };
  return { user };
}

export async function readJsonBody<T = Record<string, unknown>>(
  request: Request,
): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

export function getQueryParam(request: Request, key: string): string | null {
  return new URL(request.url).searchParams.get(key);
}
