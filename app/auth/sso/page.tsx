"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { exchangeSsoToken } from "@/lib/api/auth";

export default function SsoPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setError("Missing SSO token. Open MoodSync from MoodScale.");
      return;
    }

    exchangeSsoToken(token)
      .then((res) => {
        if (!res.token) {
          setError(res.error || "SSO failed");
          return;
        }
        localStorage.setItem("token", res.token);
        router.replace("/");
      })
      .catch(() => setError("SSO request failed. Try again from MoodScale."));
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      {error ? (
        <>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <a href="/" className="text-sm text-primary underline">
            Back to MoodSync
          </a>
        </>
      ) : (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Signing you in from MoodScale…
          </p>
        </>
      )}
    </div>
  );
}
