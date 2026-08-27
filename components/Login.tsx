"use client";

import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMoodScaleUrl } from "@/lib/useMoodScaleUrl";

interface LoginProps {
  onLogin?: () => void;
}

/** MoodSync is entered via MoodScale SSO — no local password login. */
export default function Login(_props: LoginProps) {
  const moodscaleUrl = useMoodScaleUrl();

  return (
    <div className="ms-canvas relative flex min-h-dvh items-center justify-center p-4">
      <Card className="relative z-10 w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <Image
            src="/images/moodscale_logo1.png"
            alt="MoodScale"
            width={160}
            height={40}
            className="mx-auto h-9 w-auto"
            priority
          />
          <CardTitle className="text-2xl font-bold tracking-tight text-navy dark:text-slate-100">
            MoodSync
          </CardTitle>
          <CardDescription>
            Sign in through MoodScale to continue. Your account syncs
            automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-8">
          <Button asChild>
            <a href={`${moodscaleUrl}/api/moodsync/launch`}>
              Continue with MoodScale
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
