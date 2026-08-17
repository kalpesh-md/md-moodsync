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
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <Card className="relative z-10 w-full max-w-md overflow-hidden shadow-xl">
        <div className="h-1.5 bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500" />
        <CardHeader className="space-y-3 text-center">
          <Image
            src="/images/moodscale_logo1.png"
            alt="MoodScale"
            width={160}
            height={40}
            className="mx-auto h-9 w-auto"
            priority
          />
          <CardTitle className="bg-gradient-to-r from-navy via-blue-600 to-violet-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent dark:from-blue-300 dark:via-violet-300 dark:to-fuchsia-300">
            MoodSync
          </CardTitle>
          <CardDescription>
            Sign in through MoodScale to continue. Your account syncs
            automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
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
