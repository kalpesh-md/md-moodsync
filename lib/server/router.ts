import type { RouteHandler } from "@/lib/server/http";
import { getAuthMe, postAuthSso } from "@/lib/server/handlers/auth";
import {
  getCheckins,
  getCheckinsAnalytics,
  getCheckinsLatest,
  getCheckinsWeek,
  postCheckins,
} from "@/lib/server/handlers/checkins";
import {
  getFitAuthUrl,
  getFitCallback,
  postFitDisconnect,
} from "@/lib/server/handlers/fit";
import {
  deleteFriendsRequest,
  getFriendMoodTrend,
  getFriendsList,
  getFriendsPending,
  getFriendsRequests,
  getFriendsSummary,
  postFriendsAccept,
  postFriendsRequest,
} from "@/lib/server/handlers/friends";
import { getHealth } from "@/lib/server/handlers/health";
import { getIntegrationsStatus } from "@/lib/server/handlers/integrations";
import { getPersonalityInsights } from "@/lib/server/handlers/insights";
import { getForecast } from "@/lib/server/handlers/forecast";
import { getMoodSnapshots, postMoodSync } from "@/lib/server/handlers/mood";
import { putPrivacy } from "@/lib/server/handlers/privacy";
import { getRecs } from "@/lib/server/handlers/recs";
import {
  getSpotifyAuthUrl,
  getSpotifyCallback,
  getSpotifyStatus,
  postSpotifyDisconnect,
} from "@/lib/server/handlers/spotify";
import { getUsersSearch } from "@/lib/server/handlers/users";

interface RouteDefinition {
  method: string;
  segments: string[];
  handler: RouteHandler;
}

const routes: RouteDefinition[] = [
  { method: "GET", segments: ["health"], handler: getHealth },
  { method: "GET", segments: ["auth", "me"], handler: getAuthMe },
  { method: "POST", segments: ["auth", "sso"], handler: postAuthSso },
  { method: "GET", segments: ["spotify", "auth-url"], handler: getSpotifyAuthUrl },
  { method: "POST", segments: ["spotify", "disconnect"], handler: postSpotifyDisconnect },
  { method: "GET", segments: ["spotify", "callback"], handler: getSpotifyCallback },
  { method: "GET", segments: ["spotify", "status"], handler: getSpotifyStatus },
  { method: "GET", segments: ["integrations", "status"], handler: getIntegrationsStatus },
  { method: "GET", segments: ["fit", "auth-url"], handler: getFitAuthUrl },
  { method: "POST", segments: ["fit", "disconnect"], handler: postFitDisconnect },
  { method: "GET", segments: ["fit", "callback"], handler: getFitCallback },
  { method: "POST", segments: ["mood", "sync"], handler: postMoodSync },
  { method: "GET", segments: ["mood", "snapshots"], handler: getMoodSnapshots },
  { method: "POST", segments: ["checkins"], handler: postCheckins },
  { method: "GET", segments: ["checkins"], handler: getCheckins },
  { method: "GET", segments: ["checkins", "latest"], handler: getCheckinsLatest },
  { method: "GET", segments: ["checkins", "week"], handler: getCheckinsWeek },
  { method: "GET", segments: ["checkins", "analytics"], handler: getCheckinsAnalytics },
  { method: "GET", segments: ["forecast"], handler: getForecast },
  { method: "GET", segments: ["insights", "personality"], handler: getPersonalityInsights },
  { method: "GET", segments: ["recs"], handler: getRecs },
  { method: "GET", segments: ["friends", "summary"], handler: getFriendsSummary },
  { method: "GET", segments: ["friends", "requests"], handler: getFriendsRequests },
  { method: "GET", segments: ["friends", "pending"], handler: getFriendsPending },
  { method: "POST", segments: ["friends", "request"], handler: postFriendsRequest },
  { method: "POST", segments: ["friends", "accept", ":followerId"], handler: postFriendsAccept },
  { method: "DELETE", segments: ["friends", "request", ":followerId"], handler: deleteFriendsRequest },
  { method: "GET", segments: ["friends", ":friendId", "mood-trend"], handler: getFriendMoodTrend },
  { method: "GET", segments: ["friends"], handler: getFriendsList },
  { method: "GET", segments: ["users", "search"], handler: getUsersSearch },
  { method: "PUT", segments: ["privacy"], handler: putPrivacy },
];

function matchRoute(
  method: string,
  pathSegments: string[],
): { handler: RouteHandler; params: Record<string, string> } | null {
  for (const route of routes) {
    if (route.method !== method) continue;
    if (route.segments.length !== pathSegments.length) continue;

    const params: Record<string, string> = {};
    let matched = true;

    for (let i = 0; i < route.segments.length; i++) {
      const pattern = route.segments[i];
      const segment = pathSegments[i];
      if (pattern.startsWith(":")) {
        params[pattern.slice(1)] = segment;
      } else if (pattern !== segment) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return { handler: route.handler, params };
    }
  }

  return null;
}

export async function handleApiRequest(
  request: Request,
  pathSegments: string[],
): Promise<Response> {
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        Allow: "GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS",
      },
    });
  }

  const match = matchRoute(method, pathSegments);
  if (!match) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  try {
    return await match.handler(request, { params: match.params });
  } catch (err) {
    console.error("API handler error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
