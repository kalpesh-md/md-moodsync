"use client";

import Image from "next/image";
import { MsButton } from "@/components/ui/ms/MsButton";
import { MsCard } from "@/components/ui/ms/MsCard";
import { useMoodScaleUrl } from "@/lib/useMoodScaleUrl";

interface LoginProps {
  onLogin?: () => void;
}

/** MoodSync is entered via MoodScale SSO — no local password login. */
export default function Login(_props: LoginProps) {
  const moodscaleUrl = useMoodScaleUrl();

  return (
    <div className="ms-canvas relative flex min-h-dvh items-center justify-center p-4">
      <MsCard className="relative z-10 w-full max-w-md">
        <div className="space-y-3 p-6 text-center">
          <Image
            src="/images/moodscale_logo1.png"
            alt="MoodScale"
            width={160}
            height={40}
            className="mx-auto h-9 w-auto"
            priority
          />
          <h1 className="text-2xl font-bold tracking-tight text-ms-ink">MoodSync</h1>
          <p className="text-sm text-ms-ink2">
            Sign in through MoodScale to continue. Your account syncs automatically.
          </p>
        </div>
        <div className="flex justify-center px-6 pb-8">
          <MsButton onClick={() => {
            window.location.href = `${moodscaleUrl}/api/moodsync/launch`;
          }}>
            Continue with MoodScale
          </MsButton>
        </div>
      </MsCard>
    </div>
  );
}
