"use client";

import { useState, useEffect, useRef } from "react";
import React from "react";
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

type PrivacyKey = keyof PrivacySettings;

interface PrivacyOption {
  key: PrivacyKey;
  label: string;
  default: boolean;
  icon: string;
}

const PRIVACY: PrivacyOption[] = [
  { key: "mood", label: "Share current mood", default: true, icon: "😊" },
  { key: "trends", label: "Share mood trends", default: true, icon: "📊" },
  { key: "ocean", label: "Share MBTI / OCEAN", default: false, icon: "🧠" },
  { key: "music", label: "Share music activity", default: true, icon: "🎵" },
  { key: "fitness", label: "Share fitness data", default: false, icon: "🏃" },
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

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <label className="toggle-wrap-modern">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="toggle-track-modern" />
      <div className="toggle-thumb-modern" />
    </label>
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
          color: "#378ADD",
          match: Math.floor(Math.random() * 25) + 75,
          mood: user.last_mood || "😊 Focused",
          moodColor: "#085041",
          mutual: true,
        })),
      );
      setRequests(
        requestsData.map((user) => ({
          id: user.id,
          name: user.username,
          initials: user.username.slice(0, 2).toUpperCase(),
          color: "#7F77DD",
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
    <div className="friends-modern">
      {/* Search Bar */}
      <div className="search-container">
        <span className="search-icon">🔍</span>
        <input
          className="search-input-modern"
          type="text"
          placeholder="Enter username..."
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
        {searchResults.length > 0 && (
          <div className="friends-list">
            {searchResults.map((user) => (
              <div className="friend-card" key={user.id}>
                <div
                  className="friend-avatar"
                  style={{ background: "#378ADD" }}
                >
                  {user.username.slice(0, 2).toUpperCase()}
                </div>

                <div className="friend-info">
                  <div className="friend-name">{user.username}</div>
                </div>

                <button
                  className="accept-btn-modern"
                  onClick={async () => {
                    try {
                      await sendFriendRequest(user.username);

                      alert("Friend request sent!");

                      setSearch("");
                      setSearchResults([]);
                    } catch (err) {
                      alert("Unable to send request.");
                    }
                  }}
                >
                  Add Friend
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Pending Requests Sent */}
      {pendingRequests.length > 0 && (
        <div className="section-modern">
          <div className="section-header">
            <span>⏳</span>
            <h3>Pending Requests</h3>
            <span className="badge">{pendingRequests.length}</span>
          </div>

          <div className="friends-list">
            {pendingRequests.map((user) => (
              <div className="friend-card" key={user.id}>
                <div
                  className="friend-avatar"
                  style={{ background: "#378ADD" }}
                >
                  {user.username.slice(0, 2).toUpperCase()}
                </div>

                <div className="friend-info">
                  <div className="friend-name">{user.username}</div>

                  <div className="friend-match">Request Pending</div>
                </div>

                <button className="follow-status pending">Pending</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friend Requests */}
      {requests.length > 0 && (
        <div className="section-modern">
          <div className="section-header">
            <span>🤝</span>
            <h3>Friend Requests</h3>
            <span className="badge">{requests.length}</span>
          </div>
          <div className="friends-list">
            {requests.map((req) => (
              <div className="friend-card" key={req.id}>
                <div
                  className="friend-avatar"
                  style={{ background: req.color }}
                >
                  {req.initials}
                </div>
                <div className="friend-info">
                  <div className="friend-name">{req.name}</div>
                  <div className="friend-mutuals">
                    {req.mutuals} mutual friend{req.mutuals !== 1 ? "s" : ""}
                  </div>
                </div>
                <div className="friend-actions">
                  <button
                    className="accept-btn-modern"
                    onClick={() => accept(req)}
                  >
                    Accept
                  </button>
                  <button
                    className="decline-btn-modern"
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
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div className="section-modern">
        <div className="section-header">
          <span>👥</span>
          <h3>Your Friends</h3>
          <span className="badge">{friends.length}</span>
        </div>
        <div className="friends-list">
          {filtered.length === 0 && (
            <div className="empty-state">No friends found</div>
          )}
          {filtered.map((f) => (
            <div
              className="friend-card"
              key={f.id}
              onClick={() => setSelectedFriend(f)}
              style={{ cursor: "pointer" }}
            >
              <div className="friend-avatar" style={{ background: f.color }}>
                {f.initials}
              </div>
              <div className="friend-info">
                <div className="friend-name">{f.name}</div>
                <div className="friend-match">
                  {f.match
                    ? `🎯 ${f.match}% mood match`
                    : "⏳ Awaiting follow-back"}
                </div>
              </div>
              <div className="friend-mood">
                <span className="mood-badge" style={{ color: f.moodColor }}>
                  {f.mood}
                </span>
              </div>
              <button
                className={`follow-status ${f.mutual ? "mutual" : "pending"}`}
              >
                {f.mutual ? "✓ Mutual" : "⏳ Pending"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy Controls */}
      <div className="section-modern">
        <div className="section-header">
          <span>🔒</span>
          <h3>Privacy Controls</h3>
        </div>
        <div className="privacy-list">
          {PRIVACY.map((p) => (
            <div className="privacy-item" key={p.key}>
              <div className="privacy-info">
                <span className="privacy-icon">{p.icon}</span>
                <span className="privacy-label">{p.label}</span>
              </div>
              <Toggle
                checked={privacy[p.key]}
                onChange={async (v) => {
                  const updated = {
                    ...privacy,
                    [p.key]: v,
                  };

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
        </div>
      </div>
      {selectedFriend && (
        <div
          className="modal-overlay"
          onClick={() => {
            setSelectedFriend(null);
            setTrendData([]);
            setShowTrend(false);
          }}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div
              className="friend-avatar"
              style={{
                background: selectedFriend.color,
                width: 90,
                height: 90,
                margin: "0 auto",
                fontSize: 30,
              }}
            >
              {selectedFriend.initials}
            </div>

            <h2 style={{ marginTop: 20 }}>{selectedFriend.name}</h2>

            <div className="profile-info">
              <div className="profile-row">
                <span>😊 Current Mood</span>
                <strong>{selectedFriend.mood}</strong>
              </div>

              <div className="profile-row">
                <span>🎯 Mood Match</span>
                <strong>{selectedFriend.match}%</strong>
              </div>

              <div className="profile-row">
                <span>🤝 Status</span>
                <strong>Mutual Friend</strong>
              </div>

              <div className="profile-row">
                <span>🎵 Spotify</span>
                <strong>Not Connected</strong>
              </div>

              <div className="profile-row">
                <span>🏃 Steps</span>
                <strong>Coming Soon</strong>
              </div>
            </div>

            <button
              className="accept-btn-modern"
              style={{ width: "100%", marginTop: 20 }}
              onClick={() => openMoodTrend(selectedFriend)}
            >
              📈 View Mood Trends
            </button>

            {showTrend && trendData.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <FriendMoodChart data={trendData} />
              </div>
            )}

            <button
              className="decline-btn-modern"
              style={{
                width: "100%",
                marginTop: 10,
              }}
              onClick={() => {
                setSelectedFriend(null);
                setTrendData([]);
                setShowTrend(false);
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
