"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700",
        className,
      )}
    />
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <Bone className="h-11 w-11 rounded-xl" />
        <div className="space-y-2">
          <Bone className="h-5 w-36" />
          <Bone className="h-3 w-48" />
        </div>
      </div>
      <Bone className="h-9 w-20 rounded-lg" />
    </div>
  );
}

export function TodayPageSkeleton() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-0 bg-white/80 dark:bg-slate-800/60">
          <CardHeader className="space-y-3">
            <Bone className="h-4 w-24" />
            <Bone className="h-3 w-40" />
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Bone className="h-28 w-28 rounded-full" />
            <div className="flex-1 space-y-2">
              <Bone className="h-5 w-32" />
              <Bone className="h-3 w-20" />
              <Bone className="h-6 w-16 rounded-full" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white/80 dark:bg-slate-800/60">
          <CardHeader>
            <Bone className="h-4 w-28" />
            <Bone className="h-3 w-36" />
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex gap-1.5">
              {Array.from({ length: 7 }).map((_, i) => (
                <Bone key={i} className="h-10 flex-1 rounded-lg" />
              ))}
            </div>
            <Bone className="h-2 w-full rounded-full" />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-0 bg-white/80 dark:bg-slate-800/60">
            <CardContent className="space-y-2 p-4">
              <Bone className="h-8 w-8 rounded-lg" />
              <Bone className="h-5 w-3/4" />
              <Bone className="h-3 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ForecastPageSkeleton() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-0 bg-white/80 dark:bg-slate-800/60">
            <CardHeader className="space-y-3">
              <Bone className="h-6 w-28 rounded-full" />
              <Bone className="h-5 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Bone className="h-2 w-full rounded-full" />
              <Bone className="h-3 w-full" />
              <Bone className="h-3 w-5/6" />
              <Bone className="h-3 w-4/5" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function RecsPageSkeleton() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="border-0 bg-white/80 dark:bg-slate-800/60">
            <CardContent className="flex items-center gap-3 p-4">
              <Bone className="h-4 w-4" />
              <Bone className="h-14 w-14 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Bone className="h-4 w-2/3" />
                <Bone className="h-3 w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function FriendsPageSkeleton() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <Card className="border-0 bg-white/80 dark:bg-slate-800/60">
        <CardContent className="p-4">
          <Bone className="h-10 w-full rounded-lg" />
        </CardContent>
      </Card>
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="border-0 bg-white/80 dark:bg-slate-800/60">
          <CardContent className="flex items-center gap-3 p-4">
            <Bone className="h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Bone className="h-4 w-1/3" />
              <Bone className="h-3 w-1/4" />
            </div>
            <Bone className="h-8 w-16 rounded-lg" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function InsightsPageSkeleton() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <Card className="border-0 bg-white/80 dark:bg-slate-800/60">
        <CardHeader>
          <Bone className="h-8 w-24" />
          <Bone className="h-10 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Bone key={i} className="h-2 w-full rounded-full" />
          ))}
        </CardContent>
      </Card>
      <Card className="border-0 bg-white/80 dark:bg-slate-800/60">
        <CardHeader>
          <Bone className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Bone className="h-4 w-40" />
              <Bone className="h-2 w-full rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
