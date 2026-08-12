import { API_URL } from "./config";

interface AuthResponse {
  token?: string;
  user?: {
    id: string;
    email?: string | null;
    username?: string | null;
  };
  error?: string;
  [key: string]: unknown;
}

/** Exchange MoodScale SSO token for a MoodSync session token. */
export async function exchangeSsoToken(token: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/sso`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return res.json();
}

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}
