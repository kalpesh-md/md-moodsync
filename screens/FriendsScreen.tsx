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
import { Search, UserPlus, Users, Loader2, Check, X } from "lucide-react";
import { InlineLoader } from "@/components/Loaders";
import { useNotice } from "@/components/notice-provider";
import { formatMoodLabel, formatUsername, moodMatchPercent } from "@/lib/utils";

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

const MOOD_COLORS: Record<string, string> = {
  happy: "#4ECDC4",
  focused: "#7F77DD",
  calm: "#45B7D1",
  excited: "#FF6B6B",
  tired: "#F7B731",
  anxious: "#C084FC",
  stressed: "#FF8C42",
  low: "#A8A8A8",
};

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
          ? "flex h-20 w-20 items-center justify-center rounded-full text-xl font-semibold text-white shadow-md ring-4 ring-white dark:ring-slate-800"
          : "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm"
      }
      style={{ background: `linear-gradient(135deg, ${color} 0%, #1E3A5F 100%)` }}
    >
      {initials}
    </div>
  );
}

export default function FriendsScreen() {
  const notice = useNotice();
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendUser[]>([]);
  const [trendData, setTrendData] = useState<MoodTrendPoint[]>([]);
  const [showTrend, setShowTrend] = useState(false);
  const [requests, setRequests] = useState<RequestDisplay[]>([]);
  const [friends, setFriends] = useState<FriendDisplay[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<FriendDisplay | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [friendFilter, setFriendFilter] = useState("");
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
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
        friendsData.map((user) => {
          const moodKey = (user.last_mood || "focused").toLowerCase().split(",")[0].trim();
          return {
            id: user.id,
            name: formatUsername(user.username),
            initials: user.username.slice(0, 2).toUpperCase(),
            color: "#378ADD",
            match: moodMatchPercent(user.id),
            mood: formatMoodLabel(user.last_mood) || "No check-in",
            moodColor: MOOD_COLORS[moodKey] || "#378ADD",
            mutual: true,
          };
        }),
      );
      setRequests(
        requestsData.map((user) => ({
          id: user.id,
          name: formatUsername(user.username),
          initials: user.username.slice(0, 2).toUpperCase(),
          color: "#7F77DD",
        })),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function openMoodTrend(friend: FriendDisplay) {
    try {
      const data = await getFriendMoodTrend(friend.id);
      setTrendData(data);
      setShowTrend(true);
    } catch (err) {
      console.error(err);
      notice.error("Unable to load mood trend", "Please try again in a moment.");
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
    setActionLoading(`accept-${req.id}`);
    try {
      await acceptFriendRequest(req.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      await loadFriends();
      notice.success("Friend added", `You and ${req.name} are now connected.`);
    } catch (err) {
      console.error(err);
      notice.error("Couldn't accept request", "Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSearch = async (value: string) => {
    setSearchQuery(value);
    if (value.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const users = await searchUsers(value);
      setSearchResults(users);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const filtered = friends.filter((f) =>
    f.name.toLowerCase().includes(friendFilter.toLowerCase()),
  );

  if (loading) {
    return <InlineLoader message="Loading your friends…" />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#7F77DD] to-navy text-white shadow-sm">
          <Users className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-navy dark:text-slate-100">
            Friends
          </h2>
          <p className="text-sm text-muted-foreground">
            Find people, manage requests, and share mood safely
          </p>
        </div>
      </div>

      <Card className="ms-card-accent border-0 bg-gradient-to-br from-white to-[#f0f9ff] dark:from-slate-800 dark:to-slate-900">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4 text-[#378ADD]" />
            Find friends
          </CardTitle>
          <CardDescription>Search by username to send a request</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="border-line/80 bg-white/80 pl-9 dark:bg-slate-900/60"
              placeholder="Search username…"
              value={searchQuery}
              onChange={(e) => void handleSearch(e.target.value)}
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="mt-3 space-y-2">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 rounded-xl border border-[#378ADD]/20 bg-white/80 p-3 shadow-sm dark:border-slate-600 dark:bg-slate-900/60"
                >
                  <Avatar
                    initials={user.username.slice(0, 2).toUpperCase()}
                    color="#378ADD"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-navy dark:text-slate-100">
                      {formatUsername(user.username)}
                    </p>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                  </div>
                  <Button
                    size="sm"
                    disabled={actionLoading === `add-${user.id}`}
                    className="bg-gradient-to-r from-[#378ADD] to-navy shadow-sm"
                    onClick={async () => {
                      setActionLoading(`add-${user.id}`);
                      try {
                        await sendFriendRequest(user.username);
                        notice.success(
                          "Friend request sent",
                          `We notified ${formatUsername(user.username)}.`,
                        );
                        setSearchQuery("");
                        setSearchResults([]);
                        await loadFriends();
                      } catch {
                        notice.error(
                          "Unable to send request",
                          "Check the username and try again.",
                        );
                      } finally {
                        setActionLoading(null);
                      }
                    }}
                  >
                    {actionLoading === `add-${user.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {pendingRequests.length > 0 && (
        <Card className="ms-card-accent border-0 bg-gradient-to-br from-white to-[#fef9c3] dark:from-slate-800 dark:to-slate-900">
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
                className="flex items-center gap-3 rounded-xl border border-amber-200/60 bg-white/70 p-3 dark:border-slate-600 dark:bg-slate-900/50"
              >
                <Avatar
                  initials={user.username.slice(0, 2).toUpperCase()}
                  color="#F7B731"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{formatUsername(user.username)}</p>
                  <p className="text-xs text-muted-foreground">Waiting for response</p>
                </div>
                <Badge variant="outline" className="border-amber-300 text-amber-700">
                  Pending
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {requests.length > 0 && (
        <Card className="ms-card-accent overflow-hidden border-0 bg-gradient-to-br from-[#7F77DD]/10 via-white to-[#378ADD]/10 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              Friend requests
              <Badge className="bg-[#7F77DD] text-white">{requests.length}</Badge>
            </CardTitle>
            <CardDescription>People who want to connect with you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-[#7F77DD]/25 bg-white/90 p-4 shadow-sm dark:border-slate-600 dark:bg-slate-900/70"
              >
                <Avatar initials={req.initials} color={req.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-navy dark:text-slate-100">
                    {req.name}
                  </p>
                  <p className="text-xs text-muted-foreground">Wants to be your friend</p>
                </div>
                <div className="flex w-full gap-2 sm:w-auto">
                  <Button
                    size="sm"
                    disabled={actionLoading === `accept-${req.id}`}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 shadow-sm sm:flex-none"
                    onClick={() => accept(req)}
                  >
                    {actionLoading === `accept-${req.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Accept
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading === `ignore-${req.id}`}
                    className="flex-1 sm:flex-none"
                    onClick={async () => {
                      setActionLoading(`ignore-${req.id}`);
                      try {
                        await ignoreFriendRequest(req.id);
                        setRequests((r) => r.filter((x) => x.id !== req.id));
                      } catch (err) {
                        console.error(err);
                        notice.error("Couldn't ignore request", "Please try again.");
                      } finally {
                        setActionLoading(null);
                      }
                    }}
                  >
                    {actionLoading === `ignore-${req.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <X className="h-3.5 w-3.5" />
                        Ignore
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="ms-card-accent border-0 bg-white dark:bg-slate-800/80">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-navy" />
            Your friends
            <Badge variant="secondary">{friends.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {friends.length > 3 && (
            <Input
              placeholder="Filter your friends…"
              value={friendFilter}
              onChange={(e) => setFriendFilter(e.target.value)}
              className="h-9"
            />
          )}
          {filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {friends.length === 0
                ? "No friends yet — search above to add someone."
                : "No friends match your filter."}
            </p>
          )}
          {filtered.map((f) => (
            <button
              key={f.id}
              type="button"
              className="flex w-full items-center gap-3 rounded-xl border border-line/70 bg-gradient-to-r from-white to-[#f8fafc] p-3 text-left transition hover:border-[#378ADD]/30 hover:shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-800"
              onClick={() => setSelectedFriend(f)}
            >
              <Avatar initials={f.initials} color={f.color} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-navy dark:text-slate-100">
                  {f.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {f.match}% mood match
                </p>
              </div>
              <Badge
                variant="outline"
                style={{
                  borderColor: `${f.moodColor}55`,
                  color: f.moodColor,
                  backgroundColor: `${f.moodColor}12`,
                }}
              >
                {f.mood}
              </Badge>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="ms-card-accent border-0 bg-gradient-to-br from-white to-[#eef2ff] dark:from-slate-800 dark:to-slate-900">
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
              className="flex items-center justify-between gap-3 rounded-lg border border-line/60 bg-white/60 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40"
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
                    notice.error("Couldn't save settings", "Your privacy toggles were not updated.");
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
        <DialogContent className="border-0 bg-gradient-to-br from-white to-[#f0f9ff] sm:max-w-md dark:from-slate-900 dark:to-slate-800">
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
                <div className="flex justify-between rounded-lg bg-white/70 px-3 py-2 dark:bg-slate-900/50">
                  <span className="text-muted-foreground">Current mood</span>
                  <strong style={{ color: selectedFriend.moodColor }}>
                    {selectedFriend.mood}
                  </strong>
                </div>
                <div className="flex justify-between rounded-lg bg-white/70 px-3 py-2 dark:bg-slate-900/50">
                  <span className="text-muted-foreground">Mood match</span>
                  <strong className="text-[#378ADD]">{selectedFriend.match}%</strong>
                </div>
                <div className="flex justify-between rounded-lg bg-white/70 px-3 py-2 dark:bg-slate-900/50">
                  <span className="text-muted-foreground">Status</span>
                  <strong className="text-emerald-600">Mutual friend</strong>
                </div>
              </div>
              <Button
                onClick={() => openMoodTrend(selectedFriend)}
                className="bg-gradient-to-r from-navy to-[#378ADD]"
              >
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
