"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, CircleAlert, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Tone = "success" | "error" | "info";

type Notice = {
  tone: Tone;
  title: string;
  message?: string;
};

type NoticeApi = {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
};

const NoticeContext = createContext<NoticeApi | null>(null);

export function useNotice() {
  const ctx = useContext(NoticeContext);
  if (!ctx) {
    throw new Error("useNotice must be used within NoticeProvider");
  }
  return ctx;
}

const toneUi: Record<
  Tone,
  { icon: typeof Info; chip: string; iconClass: string }
> = {
  success: {
    icon: CheckCircle2,
    chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  error: {
    icon: CircleAlert,
    chip: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    iconClass: "text-red-600 dark:text-red-400",
  },
  info: {
    icon: Info,
    chip: "bg-[#E9EEF5] text-navy dark:bg-slate-800 dark:text-slate-200",
    iconClass: "text-navy dark:text-slate-200",
  },
};

export function NoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);

  const show = useCallback((tone: Tone, title: string, message?: string) => {
    setNotice({ tone, title, message });
  }, []);

  const api = useMemo<NoticeApi>(
    () => ({
      success: (title, message) => show("success", title, message),
      error: (title, message) => show("error", title, message),
      info: (title, message) => show("info", title, message),
    }),
    [show],
  );

  const ui = notice ? toneUi[notice.tone] : toneUi.info;
  const Icon = ui.icon;

  return (
    <NoticeContext.Provider value={api}>
      {children}
      <Dialog open={!!notice} onOpenChange={(open) => !open && setNotice(null)}>
        <DialogContent className="sm:max-w-md">
          {notice && (
            <>
              <DialogHeader>
                <div
                  className={`mb-2 flex h-11 w-11 items-center justify-center rounded-xl ${ui.chip}`}
                >
                  <Icon className={`h-5 w-5 ${ui.iconClass}`} />
                </div>
                <DialogTitle>{notice.title}</DialogTitle>
                {notice.message ? (
                  <DialogDescription>{notice.message}</DialogDescription>
                ) : null}
              </DialogHeader>
              <DialogFooter>
                <Button onClick={() => setNotice(null)}>Continue</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </NoticeContext.Provider>
  );
}
