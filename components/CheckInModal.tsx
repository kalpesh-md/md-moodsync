"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MoodOption {
  emoji: string;
  name: string;
  color: string;
}

const MOODS: MoodOption[] = [
  { emoji: "😊", name: "Happy", color: "#4ECDC4" },
  { emoji: "🧠", name: "Focused", color: "#7F77DD" },
  { emoji: "😌", name: "Calm", color: "#45B7D1" },
  { emoji: "😔", name: "Low", color: "#A8A8A8" },
  { emoji: "😰", name: "Anxious", color: "#C084FC" },
  { emoji: "😤", name: "Stressed", color: "#FF8C42" },
  { emoji: "🤩", name: "Excited", color: "#FF6B6B" },
  { emoji: "😴", name: "Tired", color: "#F7B731" },
];

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

interface CheckInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    moods: string[],
    note: string,
    shareWithFriends: boolean,
  ) => Promise<void>;
  checkins: boolean[];
}

export default function CheckInModal({
  open,
  onOpenChange,
  onSave,
  checkins,
}: CheckInModalProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [share, setShare] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelected([]);
      setNote("");
      setShare(false);
      setSaving(false);
    }
  }, [open]);

  const toggleMood = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name],
    );
  };

  const handleSave = async () => {
    if (selected.length === 0 || saving) return;
    setSaving(true);
    try {
      await onSave(selected, note, share);
    } catch (err) {
      console.error("Check-in save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const count = checkins.filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-0 bg-gradient-to-br from-white via-[#f0f9ff] to-[#e9eef5] sm:max-w-md dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <DialogHeader>
          <DialogTitle className="text-navy dark:text-slate-100">
            How are you feeling?
          </DialogTitle>
          <DialogDescription>
            Select one or more moods — this trains your personal mood model.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-2">
          {MOODS.map((m) => {
            const isSelected = selected.includes(m.name);
            return (
              <button
                key={m.name}
                type="button"
                onClick={() => toggleMood(m.name)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border p-3 text-xs transition-all",
                  isSelected
                    ? "border-transparent shadow-md ring-2 ring-offset-1"
                    : "border-line hover:bg-white/80 dark:border-slate-700 dark:hover:bg-slate-800",
                )}
                style={
                  isSelected
                    ? {
                        backgroundColor: `${m.color}22`,
                        borderColor: m.color,
                        boxShadow: `0 0 0 2px ${m.color}44`,
                      }
                    : undefined
                }
              >
                <span className="text-xl">{m.emoji}</span>
                <span className="font-medium">{m.name}</span>
              </button>
            );
          })}
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((name) => (
              <Badge key={name} variant="secondary" className="bg-navy/10 text-navy">
                {name}
              </Badge>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="note">Note (optional)</Label>
          <Textarea
            id="note"
            placeholder="What shaped your mood today?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-line/80 bg-white/60 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
          <div>
            <p className="text-sm font-medium">Share with friends</p>
            <p className="text-xs text-muted-foreground">
              Visible to mutual friends only
            </p>
          </div>
          <Switch checked={share} onCheckedChange={setShare} />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">This week</p>
          <Badge variant="secondary">{count}/7 days</Badge>
        </div>
        <div className="flex gap-1.5">
          {DAYS.map((d, i) => (
            <div
              key={`${d}-${i}`}
              className={cn(
                "flex h-8 flex-1 items-center justify-center rounded-md text-xs font-medium",
                checkins[i]
                  ? "bg-gradient-to-br from-navy to-navy-mid text-white shadow-sm"
                  : "bg-white/70 text-slate-400 dark:bg-slate-700 dark:text-slate-400",
              )}
            >
              {d}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={selected.length === 0 || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save check-in"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
