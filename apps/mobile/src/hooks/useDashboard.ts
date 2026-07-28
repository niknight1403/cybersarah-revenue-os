import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../services/api';

// ══════════════════════════════════════════════════════════════════════
// Typen
// ══════════════════════════════════════════════════════════════════════

export interface DashboardKpis {
  umsatzHeute: number;
  umsatzWoche: number;
  umsatzMonat: number;
  aktiveCampaigns: number;
  contentPieces: number;
  conversionRate: number | null;
  roi: number | null;
  systemStatus: string;
  aktiviertAgenten: number;
}

export interface RevenueStatus {
  gesamtChancen: number;
  aktiveChancen: number;
  offeneChancen: number;
  geschaetzterMonatsumsatz: number;
  tatsaechlicherUmsatz: number;
  mitStripeLink: number;
  mitAffiliateLink: number;
}

export interface Agent {
  id: number;
  name: string;
  typ: string;
  status: string;
  beschreibung: string;
  letzteAktivitaet: string | null;
  fehlerAnzahl: number;
  ausgefuehrtAufgaben: number;
}

export interface SystemStatus {
  openaiVerfuegbar: boolean;
  stripeLiveKey: boolean;
  stripeModus: string;
  agentenGesamt: number;
  agentenNachStatus: Record<string, number>;
  erfolgsrate24h: number;
  gesamtFallbacks: number;
  systemGesundheit: number;
  systemGesund: boolean;
  warnungen: string[];
}

export interface DashboardData {
  kpis: DashboardKpis | null;
  revenue: RevenueStatus | null;
  agents: Agent[];
  system: SystemStatus | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

// ══════════════════════════════════════════════════════════════════════
// Re-Export für einfachen Import in Screens
// ══════════════════════════════════════════════════════════════════════
export type { DashboardData as default };

// ══════════════════════════════════════════════════════════════════════
// Hook
// ══════════════════════════════════════════════════════════════════════
export function useDashboard(): DashboardData {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [revenue, setRevenue] = useState<RevenueStatus | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [system, setSystem] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      const results = await Promise.allSettled([
        apiClient.get<DashboardKpis>('/dashboard/kpis'),
        apiClient.get<RevenueStatus>('/revenue/status'),
        apiClient.get<Agent[]>('/agents'),
        apiClient.get<SystemStatus>('/system/status'),
      ]);

      // KPIs
      if (results[0].status === 'fulfilled') {
        setKpis(results[0].value);
      }

      // Revenue
      if (results[1].status === 'fulfilled') {
        setRevenue(results[1].value);
      }

      // Agents
      if (results[2].status === 'fulfilled') {
        setAgents(results[2].value);
      }

      // System
      if (results[3].status === 'fulfilled') {
        setSystem(results[3].value);
      }

      setLastUpdated(new Date());

      const errors = results
        .map((r, i) => (r.status === 'rejected' ? `API ${i}: ${r.reason}` : null))
        .filter(Boolean);
      if (errors.length > 0) {
        setError(errors.join('; '));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Fehler beim Laden der Dashboard-Daten';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    kpis,
    revenue,
    agents,
    system,
    isLoading,
    error,
    lastUpdated,
    refresh: fetchData,
  };
}
