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
      <Card className="relative z-10 w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-navy to-blue-600 text-white shadow-lg">
            <Headphones className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl tracking-tight">MoodSync</CardTitle>
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
