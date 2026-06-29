"use client";

import { useState, useEffect, useCallback } from "react";

interface DashboardData {
  stats: {
    securityScore: number;
    totalIamUsers: number;
    mfaDisabledUsers: number;
    auroraDatabases: number;
    publicDatabases: number;
    failedLoginsLast24h: number;
    criticalAlerts: number;
    openRecommendations: number;
    rootAccountUsage: boolean;
    accessKeysUnrotated: number;
  };
  charts: {
    loginTrend: Array<{ date: string; value: number }>;
    failedLoginTrend: Array<{ date: string; value: number }>;
    topSourceIps: Array<{ ip: string; count: number }>;
    queryTypeDistribution: Array<{ type: string; count: number; percentage: number }>;
  };
}

// How often the dashboard silently re-fetches in the background (ms).
const REFRESH_INTERVAL = 20_000;

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // `silent` lets background polling/focus refetches run without flashing the
  // loading skeletons — only the first load (and manual retry) shows them.
  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await window.fetch("/api/dashboard");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Unknown error");
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();

    // Poll in the background so counts stay fresh after an AWS sync.
    const interval = setInterval(() => fetch(true), REFRESH_INTERVAL);

    // Refetch immediately when the user returns to the tab.
    const onFocus = () => fetch(true);
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetch]);

  return { data, loading, error, refresh: () => fetch(false) };
}
