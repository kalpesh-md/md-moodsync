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
import { MsButton } from "@/components/ui/ms/MsButton";
import { MsCard, MsCardHeader } from "@/components/ui/ms/MsCard";
import { MsListRow } from "@/components/ui/ms/MsListRow";
import { MsPill } from "@/components/ui/ms/MsPill";
import { PageHeader } from "@/components/ui/ms/PageHeader";
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
import { FriendsPageSkeleton } from "@/components/Skeletons";
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

interface FriendDisplay {
  id: string | number;
  name: string;
  initials: string;
  match: number;
  mood: string;
  mutual: boolean;
}

interface RequestDisplay {
  id: string | number;
  name: string;
  initials: string;
}

function Avatar({
  initials,
  size = "md",
}: {
  initials: string;
  size?: "md" | "lg";
}) {
  return (
    <div
      className={
        size === "lg"
          ? "flex h-20 w-20 items-center justify-center rounded-full bg-ms-navy text-xl font-semibold text-white shadow-[0_4px_16px_rgba(30,58,95,0.25)] ring-4 ring-ms-card"
          : "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ms-navy text-sm font-semibold text-white shadow-[0_2px_8px_rgba(30,58,95,0.2)]"
      }
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
  const [selectedFriend, setSelectedFriend] = useState<FriendDisplay | null>(null);
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
        friendsData.map((user) => ({
          id: user.id,
          name: formatUsername(user.username),
          initials: user.username.slice(0, 2).toUpperCase(),
          match: moodMatchPercent(user.id),
          mood: formatMoodLabel(user.last_mood) || "No check-in",
          mutual: true,
        })),
      );
      setRequests(
        requestsData.map((user) => ({
          id: user.id,
          name: formatUsername(user.username),
          initials: user.username.slice(0, 2).toUpperCase(),
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
    return <FriendsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Friends"
        title="Your circle"
        subtitle="Find people, manage requests, and share mood safely"
        icon={<Users className="h-5 w-5" />}
      />

      <MsCard elevated>
        <MsCardHeader
          title="Find friends"
          meta="Search by username to send a request"
          icon={<UserPlus size={16} />}
        />
        <div className="p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ms-ink3" />
            <Input
              className="border-ms-line bg-ms-tint pl-9 focus:border-ms-mid focus:bg-ms-card"
              placeholder="Search username…"
              value={searchQuery}
              onChange={(e) => void handleSearch(e.target.value)}
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ms-ink3" />
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="mt-3 space-y-2">
              {searchResults.map((user) => (
                <MsListRow key={user.id}>
                  <Avatar initials={user.username.slice(0, 2).toUpperCase()} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ms-ink">
                      {formatUsername(user.username)}
                    </p>
                    <p className="text-xs text-ms-ink3">@{user.username}</p>
                  </div>
                  <MsButton
                    size="sm"
                    disabled={actionLoading === `add-${user.id}`}
                    icon={
                      actionLoading === `add-${user.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-3.5 w-3.5" />
                      )
                    }
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
                    Add
                  </MsButton>
                </MsListRow>
              ))}
            </div>
          )}
        </div>
      </MsCard>

      {pendingRequests.length > 0 && (
        <MsCard>
          <MsCardHeader
            title="Pending sent"
            meta={`${pendingRequests.length} waiting for response`}
            action={<MsPill tone="warning">{pendingRequests.length}</MsPill>}
          />
          <div className="space-y-2 p-5 pt-0">
            {pendingRequests.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 rounded-xl border border-ms-line bg-ms-tint p-3"
              >
                <Avatar initials={user.username.slice(0, 2).toUpperCase()} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ms-ink">
                    {formatUsername(user.username)}
                  </p>
                  <p className="text-xs text-ms-ink3">Waiting for response</p>
                </div>
                <MsPill tone="warning">Pending</MsPill>
              </div>
            ))}
          </div>
        </MsCard>
      )}

      {requests.length > 0 && (
        <MsCard>
          <MsCardHeader
            title="Friend requests"
            meta="People who want to connect with you"
            action={<MsPill tone="brand">{requests.length}</MsPill>}
          />
          <div className="space-y-3 p-5 pt-0">
            {requests.map((req) => (
              <div
                key={req.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-ms-line bg-ms-tint p-4"
              >
                <Avatar initials={req.initials} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-ms-ink">{req.name}</p>
                  <p className="text-xs text-ms-ink3">Wants to be your friend</p>
                </div>
                <div className="flex w-full gap-2 sm:w-auto">
                  <MsButton
                    size="sm"
                    disabled={actionLoading === `accept-${req.id}`}
                    className="flex-1 sm:flex-none"
                    icon={
                      actionLoading === `accept-${req.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )
                    }
                    onClick={() => accept(req)}
                  >
                    Accept
                  </MsButton>
                  <MsButton
                    size="sm"
                    variant="secondary"
                    disabled={actionLoading === `ignore-${req.id}`}
                    className="flex-1 sm:flex-none"
                    icon={
                      actionLoading === `ignore-${req.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )
                    }
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
                    Ignore
                  </MsButton>
                </div>
              </div>
            ))}
          </div>
        </MsCard>
      )}

      <MsCard>
        <MsCardHeader
          title="Your friends"
          meta={`${friends.length} connected`}
          icon={<Users size={16} />}
        />
        <div className="space-y-3 p-5 pt-0">
          {friends.length > 3 && (
            <Input
              placeholder="Filter your friends…"
              value={friendFilter}
              onChange={(e) => setFriendFilter(e.target.value)}
              className="h-9 border-ms-line bg-ms-tint"
            />
          )}
          {filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-ms-ink2">
              {friends.length === 0
                ? "No friends yet — search above to add someone."
                : "No friends match your filter."}
            </p>
          )}
          {filtered.map((f) => (
            <MsListRow key={f.id} as="button" onClick={() => setSelectedFriend(f)}>
              <Avatar initials={f.initials} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ms-ink">{f.name}</p>
                <p className="text-xs text-ms-ink3">{f.match}% mood match</p>
              </div>
              <MsPill tone="brand">{f.mood}</MsPill>
            </MsListRow>
          ))}
        </div>
      </MsCard>

      <MsCard>
        <MsCardHeader title="Privacy controls" meta="Choose what friends can see about you" />
        <div className="space-y-3 p-5 pt-0">
          {PRIVACY.map((p) => (
            <div
              key={p.key}
              className="flex items-center justify-between gap-3 rounded-xl border border-ms-line bg-ms-tint px-3.5 py-3"
            >
              <Label htmlFor={`privacy-${p.key}`} className="font-normal text-ms-ink">
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
        </div>
      </MsCard>

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
        <DialogContent className="border-ms-line bg-ms-card sm:max-w-md">
          {selectedFriend && (
            <>
              <DialogHeader className="items-center text-center">
                <Avatar initials={selectedFriend.initials} size="lg" />
                <DialogTitle className="pt-2 text-ms-ink">{selectedFriend.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between rounded-xl bg-ms-tint px-3 py-2">
                  <span className="text-ms-ink2">Current mood</span>
                  <strong className="text-ms-navy">{selectedFriend.mood}</strong>
                </div>
                <div className="flex justify-between rounded-xl bg-ms-tint px-3 py-2">
                  <span className="text-ms-ink2">Mood match</span>
                  <strong className="text-ms-navy">{selectedFriend.match}%</strong>
                </div>
                <div className="flex justify-between rounded-xl bg-ms-tint px-3 py-2">
                  <span className="text-ms-ink2">Status</span>
                  <strong className="text-ms-emerald">Mutual friend</strong>
                </div>
              </div>
              <MsButton block onClick={() => openMoodTrend(selectedFriend)}>
                View mood trends
              </MsButton>
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
