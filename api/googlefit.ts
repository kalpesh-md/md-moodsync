import { API_URL } from "./config";

export async function getGoogleFitAuthUrl(): Promise<{ url: string }> {
  const res = await fetch(`${API_URL}/fit/auth-url`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  return res.json();
}

export async function connectGoogleFit(): Promise<void> {
  const { url } = await getGoogleFitAuthUrl();
  window.location.href = url;
}
