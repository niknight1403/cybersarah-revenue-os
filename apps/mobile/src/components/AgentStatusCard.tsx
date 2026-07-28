import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { Agent, SystemStatus } from '../hooks/useDashboard';

interface AgentStatusCardProps {
  agents: Agent[];
  system: SystemStatus | null;
  isLoading: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  aktiv: { label: 'Aktiv', color: '#22c55e', icon: '●' },
  gestoppt: { label: 'Gestoppt', color: '#ef4444', icon: '●' },
  fehler: { label: 'Fehler', color: '#ef4444', icon: '✕' },
  pausiert: { label: 'Pausiert', color: '#f59e0b', icon: '⏸' },
  wartend: { label: 'Wartend', color: '#3b82f6', icon: '○' },
};

export function AgentStatusCard({
  agents,
  system,
  isLoading,
}: AgentStatusCardProps): React.JSX.Element {
  const { colors } = useTheme();
  const [showAll, setShowAll] = useState(false);

  const displayAgents = showAll ? agents : agents.slice(0, 6);

  const agentCountByStatus = system?.agentenNachStatus ?? {};
  const gesundheit = system?.systemGesundheit ?? 0;
  const erfolgsrate = system?.erfolgsrate24h ?? 0;

  const getStatusColor = (status: string): string => {
    return STATUS_CONFIG[status]?.color ?? '#88889a';
  };

  const getStatusIcon = (status: string): string => {
    return STATUS_CONFIG[status]?.icon ?? '○';
  };

  return (
    <View style={[styles.container, { backgroundColor: 'rgba(255,255,255,0.035)', borderColor: 'rgba(255,255,255,0.08)' }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Agenten-Status</Text>
        <View style={[styles.healthBadge, { backgroundColor: gesundheit >= 60 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }]}>
          <Text style={[styles.healthText, { color: gesundheit >= 60 ? '#22c55e' : '#ef4444' }]}>
            {gesundheit}%
          </Text>
        </View>
      </View>

      {/* Zusammenfassung */}
      <View style={styles.summaryRow}>
        {Object.entries(agentCountByStatus).map(([status, count]) => {
          const cfg = STATUS_CONFIG[status];
          if (!cfg || count === 0) return null;
          return (
            <View key={status} style={[styles.summaryItem, { backgroundColor: cfg.color + '10' }]}>
              <Text style={[styles.summaryIcon, { color: cfg.color }]}>{cfg.icon}</Text>
              <Text style={[styles.summaryCount, { color: colors.text }]}>{count}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{cfg.label}</Text>
            </View>
          );
        })}
        <View style={[styles.summaryItem, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
          <Text style={[styles.summaryIcon, { color: '#3b82f6' }]}>✓</Text>
          <Text style={[styles.summaryCount, { color: colors.text }]}>{erfolgsrate}%</Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Erfolg</Text>
        </View>
      </View>

      {/* Agenten-Liste */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={[styles.skeleton, { backgroundColor: 'rgba(255,255,255,0.04)' }]} />
          ))}
        </View>
      ) : displayAgents.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Keine Agenten gefunden</Text>
      ) : (
        <>
          {displayAgents.map((agent) => (
            <View key={agent.id} style={styles.agentRow}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(agent.status) }]}>
                <Text style={[styles.statusDotInner, { color: '#ffffff' }]}>
                  {getStatusIcon(agent.status)}
                </Text>
              </View>
              <View style={styles.agentInfo}>
                <Text style={[styles.agentName, { color: colors.text }]} numberOfLines={1}>
                  {agent.name}
                </Text>
                <Text style={[styles.agentDesc, { color: colors.textMuted }]} numberOfLines={1}>
                  {agent.beschreibung}
                </Text>
              </View>
              <Text style={[styles.agentTasks, { color: colors.textMuted }]}>
                {agent.ausgefuehrtAufgaben}
              </Text>
            </View>
          ))}

          {agents.length > 6 && (
            <TouchableOpacity
              style={[styles.showMoreButton, { borderColor: 'rgba(255,255,255,0.06)' }]}
              onPress={() => setShowAll((p) => !p)}
              activeOpacity={0.7}
            >
              <Text style={[styles.showMoreText, { color: colors.secondary }]}>
                {showAll ? 'Weniger anzeigen' : `${agents.length - 6} weitere Agenten...`}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  healthBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  healthText: {
    fontSize: 12,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  summaryIcon: {
    fontSize: 10,
  },
  summaryCount: {
    fontSize: 14,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  loadingContainer: {
    gap: 8,
  },
  skeleton: {
    height: 44,
    borderRadius: 12,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    paddingVertical: 20,
  },
  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  statusDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDotInner: {
    fontSize: 12,
    fontWeight: '700',
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 1,
  },
  agentDesc: {
    fontSize: 11,
  },
  agentTasks: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'right',
  },
  showMoreButton: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
    alignItems: 'center',
  },
  showMoreText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default AgentStatusCard;
