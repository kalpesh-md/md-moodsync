"use client";

import { Headphones } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LoginProps {
  onLogin?: () => void;
}

/** MoodSync is entered via MoodScale SSO — no local password login. */
export default function Login(_props: LoginProps) {
  const moodscaleUrl =
    process.env.NEXT_PUBLIC_MOODSCALE_URL || "http://localhost:8000";

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <Card className="relative z-10 w-full max-w-md overflow-hidden shadow-xl">
        <div className="h-1.5 bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500" />
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg">
            <Headphones className="h-7 w-7" />
          </div>
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            MoodScale
          </p>
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
