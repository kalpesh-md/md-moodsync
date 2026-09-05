"use client";

import { MsCard } from "@/components/ui/ms/MsCard";
import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-ms-soft", className)}
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
      <Bone className="h-9 w-20 rounded-full" />
    </div>
  );
}

export function TodayPageSkeleton() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <MsCard>
          <div className="space-y-3 border-b border-ms-line p-5">
            <Bone className="h-4 w-24" />
            <Bone className="h-3 w-40" />
          </div>
          <div className="flex items-center gap-4 p-5">
            <Bone className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-2">
              <Bone className="h-5 w-32" />
              <Bone className="h-3 w-20" />
              <Bone className="h-6 w-16 rounded-full" />
            </div>
          </div>
        </MsCard>
        <MsCard className="p-5">
          <Bone className="h-4 w-28" />
          <Bone className="mt-3 h-3 w-36" />
          <div className="mb-3 mt-4 flex gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <Bone key={i} className="h-7 w-7 rounded-lg" />
            ))}
          </div>
        </MsCard>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <MsCard key={i}>
            <div className="space-y-2 p-4">
              <Bone className="h-8 w-8 rounded-xl" />
              <Bone className="h-5 w-3/4" />
              <Bone className="h-3 w-1/2" />
            </div>
          </MsCard>
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
          <MsCard key={i}>
            <div className="space-y-3 p-5">
              <Bone className="h-6 w-28 rounded-full" />
              <Bone className="h-5 w-3/4" />
              <Bone className="h-2 w-full rounded-full" />
              <Bone className="h-3 w-full" />
              <Bone className="h-3 w-5/6" />
            </div>
          </MsCard>
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
          <MsCard key={i}>
            <div className="flex items-center gap-3 p-4">
              <Bone className="h-14 w-14 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Bone className="h-4 w-2/3" />
                <Bone className="h-3 w-1/2" />
              </div>
            </div>
          </MsCard>
        ))}
      </div>
    </div>
  );
}

export function FriendsPageSkeleton() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <MsCard>
        <div className="p-4">
          <Bone className="h-10 w-full rounded-xl" />
        </div>
      </MsCard>
      {Array.from({ length: 3 }).map((_, i) => (
        <MsCard key={i}>
          <div className="flex items-center gap-3 p-4">
            <Bone className="h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Bone className="h-4 w-1/3" />
              <Bone className="h-3 w-1/4" />
            </div>
            <Bone className="h-8 w-16 rounded-full" />
          </div>
        </MsCard>
      ))}
    </div>
  );
}

export function InsightsPageSkeleton() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <MsCard>
        <div className="space-y-3 p-5">
          <Bone className="h-8 w-24" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Bone key={i} className="h-2 w-full rounded-full" />
          ))}
        </div>
      </MsCard>
      <MsCard>
        <div className="space-y-5 p-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Bone className="h-4 w-40" />
              <Bone className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </MsCard>
    </div>
  );
}
