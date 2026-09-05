"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { MsButton } from "@/components/ui/ms/MsButton";
import { MsPill } from "@/components/ui/ms/MsPill";
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
import { cn } from "@/lib/utils";

const MOODS = [
  { emoji: "😊", name: "Happy" },
  { emoji: "🧠", name: "Focused" },
  { emoji: "😌", name: "Calm" },
  { emoji: "😔", name: "Low" },
  { emoji: "😰", name: "Anxious" },
  { emoji: "😤", name: "Stressed" },
  { emoji: "🤩", name: "Excited" },
  { emoji: "😴", name: "Tired" },
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
      <DialogContent className="max-h-[90vh] overflow-y-auto border-ms-line bg-ms-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-ms-ink">How are you feeling?</DialogTitle>
          <DialogDescription className="text-ms-ink2">
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
                  "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs transition-all",
                  isSelected
                    ? "border-ms-navy bg-ms-soft shadow-[0_0_0_3px_rgba(30,58,95,0.08)]"
                    : "border-ms-line bg-ms-card hover:border-ms-line-strong hover:bg-ms-tint",
                )}
              >
                <span className="text-xl leading-none">{m.emoji}</span>
                <span
                  className={cn(
                    "text-[11px] font-semibold",
                    isSelected ? "text-ms-navy" : "text-ms-ink2",
                  )}
                >
                  {m.name}
                </span>
              </button>
            );
          })}
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((name) => (
              <MsPill key={name} tone="brand">
                {name}
              </MsPill>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="note" className="text-ms-ink2">
            Note (optional)
          </Label>
          <Textarea
            id="note"
            placeholder="What shaped your mood today?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="border-ms-line bg-ms-tint focus:border-ms-mid focus:bg-ms-card"
          />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-ms-line bg-ms-tint px-3.5 py-3">
          <div>
            <p className="text-sm font-semibold text-ms-ink">Share with friends</p>
            <p className="text-xs text-ms-ink3">Visible to mutual friends only</p>
          </div>
          <Switch checked={share} onCheckedChange={setShare} />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-ms-ink3">This week</p>
          <MsPill tone="neutral">{count}/7 days</MsPill>
        </div>
        <div className="flex gap-1.5">
          {DAYS.map((d, i) => (
            <div
              key={`${d}-${i}`}
              className={cn(
                "flex h-8 flex-1 items-center justify-center rounded-lg text-xs font-bold",
                checkins[i]
                  ? "bg-ms-navy text-white"
                  : "border border-dashed border-ms-line-strong text-ms-ink3",
              )}
            >
              {d}
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <MsButton variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </MsButton>
          <MsButton onClick={handleSave} disabled={selected.length === 0 || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save check-in"
            )}
          </MsButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
