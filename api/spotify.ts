import { API_URL } from "./config";

export async function getSpotifyAuthUrl(): Promise<{ url: string }> {
  const res = await fetch(`${API_URL}/spotify/auth-url`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  return res.json(); // returns { url: "https://accounts.spotify.com/..." }
}

export async function connectSpotify(): Promise<void> {
  const { url } = await getSpotifyAuthUrl();
  window.location.href = url; // sends user to Spotify login
}
