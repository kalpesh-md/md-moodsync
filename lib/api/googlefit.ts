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

export async function disconnectGoogleFit(): Promise<void> {
  const res = await fetch(`${API_URL}/fit/disconnect`, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  if (!res.ok) throw new Error("Failed to disconnect Google Fit");
}

export async function switchGoogleFitAccount(): Promise<void> {
  try {
    await disconnectGoogleFit();
  } catch {
    // Still open Google login even if token clear failed.
  }
  await connectGoogleFit();
}
