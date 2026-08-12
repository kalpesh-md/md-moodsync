"use client";

import { useState } from "react";
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
  onSave: (mood: string, note: string, shareWithFriends: boolean) => void;
  checkins: boolean[];
}

export default function CheckInModal({
  open,
  onOpenChange,
  onSave,
  checkins,
}: CheckInModalProps) {
  const [selected, setSelected] = useState<MoodOption | null>(null);
  const [note, setNote] = useState("");
  const [share, setShare] = useState(false);

  const handleSave = () => {
    if (!selected) return;
    onSave(selected.name, note, share);
    setSelected(null);
    setNote("");
    setShare(false);
  };

  const count = checkins.filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How are you feeling?</DialogTitle>
          <DialogDescription>
            This check-in trains your personal mood model.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-2">
          {MOODS.map((m) => (
            <button
              key={m.name}
              type="button"
              onClick={() => setSelected(m)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border p-3 text-xs transition-all",
                selected?.name === m.name
                  ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/30"
                  : "border-border hover:bg-muted/60",
              )}
            >
              <span className="text-xl">{m.emoji}</span>
              <span className="font-medium">{m.name}</span>
            </button>
          ))}
        </div>

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

        <div className="flex items-center justify-between rounded-lg border px-3 py-2">
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
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {d}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!selected}>
            Save check-in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
