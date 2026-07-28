import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useDashboard } from '../hooks/useDashboard';
import { KpiCard } from '../components/KpiCard';
import { RevenueChart } from '../components/RevenueChart';
import { AgentStatusCard } from '../components/AgentStatusCard';
import type { BarData } from '../components/RevenueChart';

const screenWidth = Dimensions.get('window').width;

function generateDummyChartData(): BarData[] {
  const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const now = new Date();
  const data: BarData[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    data.push({
      label: `${d.getDate()}.${d.getMonth() + 1}`,
      value: Math.round(Math.random() * 200 + 20),
    });
  }
  return data;
}

export function DashboardScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const {
    kpis,
    revenue,
    agents,
    system,
    isLoading,
    error,
    lastUpdated,
    refresh,
  } = useDashboard();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const chartData = useMemo(() => generateDummyChartData(), []);

  const isHealthy = system?.systemGesund ?? true;
  const warnungen = system?.warnungen ?? [];

  const formatTimestamp = (date: Date | null): string => {
    if (!date) return '–';
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Fixed Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, { color: colors.text }]}>Übersicht</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              CyberSarah Revenue OS
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.statusDot, { backgroundColor: isHealthy ? '#22c55e' : '#ef4444' }]}>
              <View style={[styles.statusPulse, { backgroundColor: isHealthy ? '#22c55e' : '#ef4444' }]} />
            </View>
            <Text style={[styles.statusText, { color: colors.textMuted }]}>
              {formatTimestamp(lastUpdated)}
            </Text>
          </View>
        </View>

        {/* Warnungen */}
        {warnungen.length > 0 && !isLoading && (
          <TouchableOpacity style={styles.warningBanner} activeOpacity={0.8}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText} numberOfLines={1}>
              {warnungen[0]}
            </Text>
          </TouchableOpacity>
        )}

        {/* Error */}
        {error && !isLoading && (
          <TouchableOpacity
            style={[styles.errorBanner, { backgroundColor: 'rgba(239,68,68,0.1)' }]}
            onPress={onRefresh}
            activeOpacity={0.8}
          >
            <Text style={styles.errorIcon}>❌</Text>
            <Text style={styles.errorText} numberOfLines={1}>{error}</Text>
            <Text style={styles.retryText}>Erneut laden</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Scrollable Content ── */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ── KPI Grid ── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Kennzahlen
        </Text>
        <View style={styles.kpiGrid}>
          <View style={styles.kpiRow}>
            <View style={styles.kpiHalf}>
              <KpiCard
                title="Umsatz heute"
                value={kpis?.umsatzHeute ?? 0}
                subtitle="24h"
                icon="💰"
                isCurrency
                isLoading={isLoading}
                color="#7c3aed"
                trend={kpis?.umsatzHeute ? (kpis.umsatzHeute > 0 ? 'up' : 'down') : undefined}
                trendValue={kpis?.umsatzHeute ? 'Heute' : undefined}
              />
            </View>
            <View style={styles.kpiHalf}>
              <KpiCard
                title="Umsatz Woche"
                value={kpis?.umsatzWoche ?? 0}
                subtitle="7 Tage"
                icon="📈"
                isCurrency
                isLoading={isLoading}
                color="#3b82f6"
              />
            </View>
          </View>
          <View style={styles.kpiRow}>
            <View style={styles.kpiThird}>
              <KpiCard
                title="Monat"
                value={kpis?.umsatzMonat ?? 0}
                icon="📊"
                isCurrency
                isLoading={isLoading}
                color="#06b6d4"
              />
            </View>
            <View style={styles.kpiThird}>
              <KpiCard
                title="ROI"
                value={kpis?.roi != null ? `${kpis.roi}%` : '–'}
                icon="🎯"
                isLoading={isLoading}
                color="#f59e0b"
              />
            </View>
            <View style={styles.kpiThird}>
              <KpiCard
                title="Conversion"
                value={kpis?.conversionRate != null ? `${kpis.conversionRate}%` : '–'}
                icon="🔄"
                isLoading={isLoading}
                color="#22c55e"
              />
            </View>
          </View>
          <View style={styles.kpiRow}>
            <View style={styles.kpiQuarter}>
              <KpiCard
                title="Chancen"
                value={revenue?.aktiveChancen ?? 0}
                subtitle={revenue ? `+${revenue.offeneChancen} offen` : undefined}
                icon="💎"
                isLoading={isLoading}
                color="#a78bfa"
              />
            </View>
            <View style={styles.kpiQuarter}>
              <KpiCard
                title="Campaigns"
                value={kpis?.aktiveCampaigns ?? 0}
                icon="📢"
                isLoading={isLoading}
                color="#ec4899"
              />
            </View>
            <View style={styles.kpiQuarter}>
              <KpiCard
                title="Content"
                value={kpis?.contentPieces ?? 0}
                icon="📝"
                isLoading={isLoading}
                color="#14b8a6"
              />
            </View>
            <View style={styles.kpiQuarter}>
              <KpiCard
                title="Agenten"
                value={kpis?.aktiviertAgenten ?? agents.length}
                icon="🤖"
                isLoading={isLoading}
                color="#8b5cf6"
              />
            </View>
          </View>
        </View>

        {/* ── Revenue Overview ── */}
        {revenue && (
          <View style={[styles.revenueSummary, { backgroundColor: 'rgba(124,58,237,0.06)', borderColor: 'rgba(124,58,237,0.12)' }]}>
            <View style={styles.revRow}>
              <Text style={[styles.revLabel, { color: colors.textMuted }]}>Geschätzter Monatsumsatz</Text>
              <Text style={[styles.revValue, { color: colors.text }]}>
                {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
                  revenue.geschaetzterMonatsumsatz
                )}
              </Text>
            </View>
            <View style={styles.revDivider} />
            <View style={styles.revRow}>
              <Text style={[styles.revLabel, { color: colors.textMuted }]}>Tatsächlicher Umsatz</Text>
              <Text style={[styles.revValue, { color: '#22c55e' }]}>
                {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
                  revenue.tatsaechlicherUmsatz
                )}
              </Text>
            </View>
            <View style={styles.revDivider} />
            <View style={styles.revRow}>
              <Text style={[styles.revLabel, { color: colors.textMuted }]}>Stripe-Links</Text>
              <Text style={[styles.revValueSmall, { color: colors.text }]}>{revenue.mitStripeLink} aktiv</Text>
              <Text style={[styles.revValueSmall, { color: colors.textMuted }]}>| {revenue.gesamtChancen} gesamt</Text>
            </View>
          </View>
        )}

        {/* ── Revenue Chart ── */}
        <RevenueChart
          data={chartData}
          title="Umsatzentwicklung (14 Tage)"
          isLoading={isLoading}
        />

        {/* ── Agent Status ── */}
        <AgentStatusCard
          agents={agents}
          system={system}
          isLoading={isLoading}
        />

        {/* ── Quick Actions ── */}
        <View style={styles.quickActions}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: 'rgba(124,58,237,0.1)', borderColor: 'rgba(124,58,237,0.2)' }]}
              onPress={() => navigation.navigate('Revenue' as never)}
              activeOpacity={0.7}
            >
              <Text style={styles.actionIcon}>⚡</Text>
              <Text style={[styles.actionLabel, { color: colors.text }]}>Revenue</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.2)' }]}
              onPress={() => navigation.navigate('Hara' as never)}
              activeOpacity={0.7}
            >
              <Text style={styles.actionIcon}>🤖</Text>
              <Text style={[styles.actionLabel, { color: colors.text }]}>HARA</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.2)' }]}
              onPress={() => navigation.navigate('Content' as never)}
              activeOpacity={0.7}
            >
              <Text style={styles.actionIcon}>📱</Text>
              <Text style={[styles.actionLabel, { color: colors.text }]}>Content</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)' }]}
              activeOpacity={0.7}
            >
              <Text style={styles.actionIcon}>⚙️</Text>
              <Text style={[styles.actionLabel, { color: colors.text }]}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusPulse: {
    width: 16,
    height: 16,
    borderRadius: 8,
    opacity: 0.2,
    position: 'absolute',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.1)',
    marginTop: 8,
    gap: 6,
  },
  warningIcon: {
    fontSize: 12,
  },
  warningText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 8,
    gap: 6,
  },
  errorIcon: {
    fontSize: 12,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  retryText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: -4,
  },
  kpiGrid: {
    gap: 8,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiHalf: {
    flex: 1,
    minWidth: 0,
  },
  kpiThird: {
    flex: 1,
    minWidth: 0,
  },
  kpiQuarter: {
    flex: 1,
    minWidth: 0,
  },
  revenueSummary: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
  },
  revRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  revLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  revValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  revValueSmall: {
    fontSize: 13,
    fontWeight: '600',
  },
  revDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 10,
  },
  quickActions: {
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 64,
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default DashboardScreen;
