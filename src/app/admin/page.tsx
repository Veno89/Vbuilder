'use client';

import { useEffect, useState } from 'react';

type AdminOverview = {
  totalUsers: number;
  totalOrganizations: number;
  totalSubscriptions: number;
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      try {
        const response = await fetch('/api/admin/overview', {
          method: 'GET',
          credentials: 'include'
        });
        const payload = (await response.json()) as AdminOverview | { error?: string };

        if (!response.ok) {
          throw new Error(
            typeof payload === 'object' && payload && 'error' in payload && payload.error
              ? payload.error
              : 'Failed to load admin overview.'
          );
        }

        if (!cancelled) {
          setData(payload as AdminOverview);
          setError(null);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error ? requestError.message : 'Failed to load admin overview.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOverview();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main>
      <h1>Admin Dashboard</h1>
      <p>Platform-level overview for authorized admins.</p>
      {loading && <p>Loading overview…</p>}
      {error && <p role="alert">{error}</p>}
      {data && (
        <ul>
          <li>Total users: {data.totalUsers}</li>
          <li>Total organizations: {data.totalOrganizations}</li>
          <li>Total subscriptions: {data.totalSubscriptions}</li>
        </ul>
      )}
    </main>
  );
}
