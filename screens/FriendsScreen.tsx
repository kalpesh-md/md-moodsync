"use client";

import { useState, useEffect } from "react";
import { getPrivacy, updatePrivacy } from "@/lib/api/privacy";
import type { PrivacySettings } from "@/lib/api/privacy";
import FriendMoodChart from "@/components/FriendMoodChart";
import {
  getFriends,
  getFriendRequests,
  getPendingRequests,
  acceptFriendRequest,
  sendFriendRequest,
  ignoreFriendRequest,
  searchUsers,
  getFriendMoodTrend,
} from "@/lib/api/friends";
import type { FriendUser, MoodTrendPoint } from "@/lib/api/friends";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Users } from "lucide-react";

type PrivacyKey = keyof PrivacySettings;

interface PrivacyOption {
  key: PrivacyKey;
  label: string;
  default: boolean;
}

const PRIVACY: PrivacyOption[] = [
  { key: "mood", label: "Share current mood", default: true },
  { key: "trends", label: "Share mood trends", default: true },
  { key: "ocean", label: "Share MBTI / OCEAN", default: false },
  { key: "music", label: "Share music activity", default: true },
  { key: "fitness", label: "Share fitness data", default: false },
];

interface FriendDisplay {
  id: string | number;
  name: string;
  initials: string;
  color: string;
  match: number;
  mood: string;
  moodColor: string;
  mutual: boolean;
}

interface RequestDisplay {
  id: string | number;
  name: string;
  initials: string;
  color: string;
  mutuals: number;
}

function Avatar({
  initials,
  color,
  size = "md",
}: {
  initials: string;
  color: string;
  size?: "md" | "lg";
}) {
  return (
    <div
      className={
        size === "lg"
          ? "flex h-20 w-20 items-center justify-center rounded-full text-xl font-semibold text-white"
          : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
      }
      style={{ background: color }}
    >
      {initials}
    </div>
  );
}

export default function FriendsScreen() {
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendUser[]>([]);
  const [trendData, setTrendData] = useState<MoodTrendPoint[]>([]);
  const [showTrend, setShowTrend] = useState(false);
  const [requests, setRequests] = useState<RequestDisplay[]>([]);
  const [friends, setFriends] = useState<FriendDisplay[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<FriendDisplay | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    mood: true,
    trends: true,
    ocean: false,
    music: true,
    fitness: false,
  });

  useEffect(() => {
    loadFriends();
    loadPrivacy();
  }, []);

  async function loadFriends() {
    try {
      const [friendsData, requestsData, pendingData] = await Promise.all([
        getFriends(),
        getFriendRequests(),
        getPendingRequests(),
      ]);

      setPendingRequests(pendingData);

      setFriends(
        friendsData.map((user) => ({
          id: user.id,
          name: user.username,
          initials: user.username.slice(0, 2).toUpperCase(),
          color: "#1E3A5F",
          match: Math.floor(Math.random() * 25) + 75,
          mood: user.last_mood || "Focused",
          moodColor: "#085041",
          mutual: true,
        })),
      );
      setRequests(
        requestsData.map((user) => ({
          id: user.id,
          name: user.username,
          initials: user.username.slice(0, 2).toUpperCase(),
          color: "#378ADD",
          mutuals: 0,
        })),
      );
    } catch (err) {
      console.error(err);
    }
  }

  async function openMoodTrend(friend: FriendDisplay) {
    try {
      const data = await getFriendMoodTrend(friend.id);
      setTrendData(data);
      setShowTrend(true);
    } catch (err) {
      console.error(err);
      alert("Unable to load mood trend.");
    }
  }

  async function loadPrivacy() {
    try {
      const settings = await getPrivacy();
      setPrivacy(settings);
    } catch (err) {
      console.error(err);
    }
  }

  const accept = async (req: RequestDisplay) => {
    try {
      await acceptFriendRequest(req.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      loadFriends();
    } catch (err) {
      console.error(err);
      alert("Failed to accept friend request");
    }
  };

  const filtered = friends.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-navy dark:text-slate-100">
          Friends
        </h2>
        <p className="text-sm text-muted-foreground">
          Find people, manage requests, and share mood safely
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search username…"
          value={search}
          onChange={async (e) => {
            const value = e.target.value;
            setSearch(value);
            if (value.length < 2) {
              setSearchResults([]);
              return;
            }
            try {
              const users = await searchUsers(value);
              setSearchResults(users);
            } catch (err) {
              console.error(err);
            }
          }}
        />
      </div>

      {searchResults.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Search results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {searchResults.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 rounded-lg border border-border/70 p-3"
              >
                <Avatar
                  initials={user.username.slice(0, 2).toUpperCase()}
                  color="#378ADD"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{user.username}</p>
                </div>
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      await sendFriendRequest(user.username);
                      alert("Friend request sent!");
                      setSearch("");
                      setSearchResults([]);
                    } catch {
                      alert("Unable to send request.");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              Pending sent
              <Badge variant="secondary">{pendingRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingRequests.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 rounded-lg border border-border/70 p-3"
              >
                <Avatar
                  initials={user.username.slice(0, 2).toUpperCase()}
                  color="#378ADD"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{user.username}</p>
                  <p className="text-xs text-muted-foreground">Request pending</p>
                </div>
                <Badge variant="outline">Pending</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {requests.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              Friend requests
              <Badge variant="secondary">{requests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {requests.map((req) => (
              <div
                key={req.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border/70 p-3"
              >
                <Avatar initials={req.initials} color={req.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{req.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {req.mutuals} mutual friend{req.mutuals !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => accept(req)}>
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await ignoreFriendRequest(req.id);
                        setRequests((r) => r.filter((x) => x.id !== req.id));
                      } catch (err) {
                        console.error(err);
                        alert("Failed to ignore request");
                      }
                    }}
                  >
                    Ignore
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-navy" />
            Your friends
            <Badge variant="secondary">{friends.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No friends found
            </p>
          )}
          {filtered.map((f) => (
            <button
              key={f.id}
              type="button"
              className="flex w-full items-center gap-3 rounded-lg border border-border/70 p-3 text-left transition hover:bg-muted/50"
              onClick={() => setSelectedFriend(f)}
            >
              <Avatar initials={f.initials} color={f.color} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{f.name}</p>
                <p className="text-xs text-muted-foreground">
                  {f.match
                    ? `${f.match}% mood match`
                    : "Awaiting follow-back"}
                </p>
              </div>
              <Badge variant="outline">{f.mood}</Badge>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Privacy controls</CardTitle>
          <CardDescription>
            Choose what friends can see about you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {PRIVACY.map((p) => (
            <div
              key={p.key}
              className="flex items-center justify-between gap-3"
            >
              <Label htmlFor={`privacy-${p.key}`} className="font-normal">
                {p.label}
              </Label>
              <Switch
                id={`privacy-${p.key}`}
                checked={privacy[p.key]}
                onCheckedChange={async (v) => {
                  const updated = { ...privacy, [p.key]: v };
                  setPrivacy(updated);
                  try {
                    await updatePrivacy({
                      share_mood: updated.mood,
                      share_trends: updated.trends,
                      share_ocean: updated.ocean,
                      share_music: updated.music,
                      share_fitness: updated.fitness,
                    });
                  } catch (err) {
                    console.error(err);
                    alert("Failed to save settings");
                  }
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedFriend}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedFriend(null);
            setTrendData([]);
            setShowTrend(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          {selectedFriend && (
            <>
              <DialogHeader className="items-center text-center">
                <Avatar
                  initials={selectedFriend.initials}
                  color={selectedFriend.color}
                  size="lg"
                />
                <DialogTitle className="pt-2">{selectedFriend.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-border/70 py-2">
                  <span className="text-muted-foreground">Current mood</span>
                  <strong>{selectedFriend.mood}</strong>
                </div>
                <div className="flex justify-between border-b border-border/70 py-2">
                  <span className="text-muted-foreground">Mood match</span>
                  <strong>{selectedFriend.match}%</strong>
                </div>
                <div className="flex justify-between border-b border-border/70 py-2">
                  <span className="text-muted-foreground">Status</span>
                  <strong>Mutual friend</strong>
                </div>
              </div>
              <Button onClick={() => openMoodTrend(selectedFriend)}>
                View mood trends
              </Button>
              {showTrend && trendData.length > 0 && (
                <div className="pt-2">
                  <FriendMoodChart data={trendData} />
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
