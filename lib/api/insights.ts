import { API_URL } from "./config";

export async function getPersonality(): Promise<unknown> {
  const res = await fetch(`${API_URL}/insights/personality`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  return res.json();
}
