'use client';

import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-surface-border/40 rounded-xl ${className}`}
      aria-hidden="true"
    />
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 rounded-2xl bg-surface-card border border-surface-border p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="w-32 h-3.5" />
              <Skeleton className="w-20 h-2.5" />
            </div>
          </div>
          <Skeleton className="w-24 h-4" />
        </div>
      ))}
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="w-20 h-3" />
            <Skeleton className="w-8 h-8 rounded-xl" />
          </div>
          <Skeleton className="w-24 h-8" />
          <Skeleton className="w-16 h-2.5" />
        </div>
      ))}
    </div>
  );
}
export default Skeleton;
