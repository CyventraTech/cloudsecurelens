"use client";

import { useEffect } from "react";

// Fires a staleness-gated sync in the background so users never have to click
// "Sync now". The server only re-syncs accounts older than their configured
// syncIntervalMin, so this poll is cheap and won't hammer the AWS APIs.
// In production, Vercel Cron (vercel.json) drives the same logic on a schedule
// even when no one has the app open; this client trigger keeps the data fresh
// while someone is actively using it.
const POLL_INTERVAL = 60_000; // 1 minute

export function AutoSync() {
  useEffect(() => {
    let cancelled = false;

    const trigger = async () => {
      try {
        await fetch("/api/accounts/sync-all", { method: "POST" });
      } catch {
        // Network blips are non-fatal — the next tick will retry.
      }
    };

    // Kick once shortly after load, then on an interval.
    const initial = setTimeout(() => {
      if (!cancelled) trigger();
    }, 3_000);
    const interval = setInterval(trigger, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, []);

  return null;
}
