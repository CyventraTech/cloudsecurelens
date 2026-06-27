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

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.fetch("/api/dashboard");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Unknown error");
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refresh: fetch };
}
