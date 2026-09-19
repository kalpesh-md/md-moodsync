import { API_URL } from "./config";
import { fetchWithAuth } from "./http";

export interface IntegrationStatus {
  spotify: { connected: boolean };
  googleFit: { connected: boolean };
}

export async function getIntegrationStatus(): Promise<IntegrationStatus> {
  const res = await fetchWithAuth(`${API_URL}/integrations/status`);
  if (!res.ok) throw new Error("Failed to load integration status");
  return res.json();
}
