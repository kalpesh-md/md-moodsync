import { API_URL } from "./config";

export interface IntegrationStatus {
  spotify: { connected: boolean };
  googleFit: { connected: boolean };
}

export async function getIntegrationStatus(): Promise<IntegrationStatus> {
  const res = await fetch(`${API_URL}/integrations/status`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  if (!res.ok) throw new Error("Failed to load integration status");
  return res.json();
}
