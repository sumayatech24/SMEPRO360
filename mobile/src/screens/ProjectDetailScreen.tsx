import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import api from '../api/client';

interface Overview { project: any; phases: any[]; summary: any; overall_progress: number; recent_activity: any[]; }

const STATUS_COLORS: Record<string,string> = { not_started:'#94a3b8', in_progress:'#3b82f6', completed:'#10b981', on_hold:'#f59e0b', cancelled:'#ef4444', planning:'#8b5cf6' };

export default function ProjectDetailScreen({ route, navigation }: any) {
  const { projectId, projectName } = route.params;
  const [tab, setTab] = useState<'overview'|'plan'|'milestones'|'risks'>('overview');
  const [overview, setOverview] = useState<Overview|null>(null);
  const [wbs, setWbs] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const r = await api.get(`/projects-v2/${projectId}/overview`);
      setOverview(r.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  const loadTab = async () => {
    try {
      if (tab === 'plan') {
        const r = await api.get(`/projects-v2/${projectId}/wbs`);
        setWbs(r.data.items || []);
      } else if (tab === 'milestones') {
        const r = await api.get(`/projects-v2/${projectId}/milestones`);
        setMilestones(r.data || []);
      } else if (tab === 'risks') {
        const r = await api.get(`/projects-v2/${projectId}/risks`);
        setRisks(r.data || []);
      }
    } catch {}
  };

  useEffect(() => { navigation.setOptions({ title: projectName || 'Project' }); load(); }, []);
  useEffect(() => { loadTab(); }, [tab]);

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';

  if (loading) return (
    <View style={styles.center}><ActivityIndicator color="#6366f1" size="large" /></View>
  );
  if (!overview) return (
    <View style={styles.center}><Text style={styles.emptyText}>Project not found</Text></View>
  );

  const { project: proj, phases, summary } = overview;

  return (
    <View style={styles.container}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.projNumber}>{proj.project_number}</Text>
            <Text style={styles.projName}>{proj.name}</Text>
            <View style={styles.tagRow}>
              <View style={[styles.statusTag, { backgroundColor: (STATUS_COLORS[proj.status] || '#94a3b8') + '20' }]}>
                <Text style={[styles.statusTagText, { color: STATUS_COLORS[proj.status] || '#94a3b8' }]}>{proj.status?.replace('_', ' ')}</Text>
              </View>
              <Text style={styles.typeText}>{proj.project_type?.replace('_', ' ')}</Text>
            </View>
          </View>
          <View style={styles.progressCircle}>
            <Text style={styles.progressPct}>{overview.overall_progress}%</Text>
            <Text style={styles.progressLabel}>Done</Text>
          </View>
        </View>

        {/* Phase bar */}
        <View style={styles.phaseBarRow}>
          {phases.map(ph => (
            <View key={ph.id} style={[styles.phaseBarItem, { backgroundColor: ph.color || '#6366f1' }]}>
              <View style={[styles.phaseBarFill, { width: `${ph.progress_percent || 0}%` as any, backgroundColor: ph.color + 'cc' }]} />
            </View>
          ))}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Tasks', value: `${summary.completed_tasks}/${summary.total_tasks}` },
            { label: 'Milestones', value: `${summary.milestones_achieved}/${summary.milestones_total}` },
            { label: 'Risks', value: summary.open_risks, color: summary.open_risks > 0 ? '#ef4444' : '#10b981' },
            { label: 'Issues', value: summary.open_issues, color: summary.open_issues > 0 ? '#f59e0b' : '#10b981' },
          ].map(s => (
            <View key={s.label} style={styles.statItem}>
              <Text style={[styles.statValue, s.color ? { color: s.color } : {}]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['overview', 'plan', 'milestones', 'risks'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'overview' ? '📊' : t === 'plan' ? '📋' : t === 'milestones' ? '🏁' : '⚠️'}
              {' '}{t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); loadTab(); }} />}>
        {/* OVERVIEW */}
        {tab === 'overview' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Project Phases</Text>
            {phases.map(ph => (
              <View key={ph.id} style={styles.phaseCard}>
                <View style={styles.phaseHeader}>
                  <View style={[styles.phaseDot, { backgroundColor: ph.color }]} />
                  <Text style={styles.phaseName}>{ph.phase_name}</Text>
                  <Text style={[styles.phaseStatus, { color: STATUS_COLORS[ph.status] || '#94a3b8' }]}>{ph.status?.replace('_', ' ')}</Text>
                </View>
                <View style={styles.phaseProgressTrack}>
                  <View style={[styles.phaseProgressFill, { width: `${ph.progress_percent || 0}%` as any, backgroundColor: ph.color }]} />
                </View>
                <View style={styles.phaseDates}>
                  <Text style={styles.phaseDateText}>{fmtDate(ph.planned_start)} → {fmtDate(ph.planned_end)}</Text>
                  <Text style={styles.phasePct}>{ph.progress_percent || 0}%</Text>
                </View>
              </View>
            ))}

            {overview.recent_activity.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Recent Activity</Text>
                {overview.recent_activity.map((a: any) => (
                  <View key={a.id} style={styles.activityItem}>
                    <Text style={styles.activityIcon}>{a.activity_type === 'comment' ? '💬' : '📌'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityText}>{a.description || a.title}</Text>
                      <Text style={styles.activityDate}>{a.created_at ? new Date(a.created_at).toLocaleDateString('en-IN') : ''}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* PROJECT PLAN — WBS */}
        {tab === 'plan' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>{wbs.length} Work Items</Text>
            {wbs.map((item, idx) => (
              <View key={item.id} style={[styles.wbsRow, item.is_critical && { borderLeftColor: '#ef4444', borderLeftWidth: 3 }]}>
                <View style={styles.wbsLeft}>
                  <Text style={styles.wbsCode}>{item.wbs_code}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.wbsName, item.task_type === 'summary' && { fontWeight: '700' }]}>{item.task_name}</Text>
                    <View style={styles.wbsMeta}>
                      <Text style={styles.wbsMetaText}>{fmtDate(item.planned_start)} → {fmtDate(item.planned_end)}</Text>
                      {item.duration_days > 0 && <Text style={styles.wbsMetaText}>{item.duration_days}d</Text>}
                    </View>
                  </View>
                </View>
                <View style={styles.wbsRight}>
                  <View style={styles.progressMini}>
                    <View style={[styles.progressMiniFill, {
                      width: `${item.percent_complete || 0}%` as any,
                      backgroundColor: item.percent_complete === 100 ? '#10b981' : '#3b82f6'
                    }]} />
                  </View>
                  <Text style={styles.pctText}>{item.percent_complete || 0}%</Text>
                  <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] || '#94a3b8' }]} />
                </View>
              </View>
            ))}
            {wbs.length === 0 && <Text style={styles.emptyText}>No tasks in project plan</Text>}
          </View>
        )}

        {/* MILESTONES */}
        {tab === 'milestones' && (
          <View style={styles.tabContent}>
            {milestones.map(ms => (
              <View key={ms.id} style={[styles.msCard, ms.status === 'missed' && { borderColor: '#ef4444', borderWidth: 1 }, ms.status === 'at_risk' && { borderColor: '#f59e0b', borderWidth: 1 }]}>
                <View style={styles.msHeader}>
                  <Text style={styles.msIcon}>{ms.status === 'achieved' ? '✅' : ms.status === 'missed' ? '❌' : ms.status === 'at_risk' ? '⚠️' : '🏁'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.msName}>{ms.milestone_name}</Text>
                    <Text style={styles.msType}>{ms.milestone_type?.replace('_', ' ')} · {fmtDate(ms.planned_date)}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: ms.status === 'achieved' ? '#dcfce7' : ms.status === 'missed' ? '#fee2e2' : ms.status === 'at_risk' ? '#fef9c3' : '#f1f5f9' }]}>
                    <Text style={[styles.badgeText, { color: ms.status === 'achieved' ? '#16a34a' : ms.status === 'missed' ? '#dc2626' : ms.status === 'at_risk' ? '#ca8a04' : '#64748b' }]}>{ms.status}</Text>
                  </View>
                </View>
                {ms.days_variance !== 0 && ms.status !== 'achieved' && (
                  <Text style={[styles.varianceText, { color: ms.days_variance > 0 ? '#ef4444' : '#10b981' }]}>
                    {ms.days_variance > 0 ? `${ms.days_variance}d overdue` : `${Math.abs(ms.days_variance)}d ahead`}
                  </Text>
                )}
                {ms.deliverable && <Text style={styles.deliverableText}>📦 {ms.deliverable}</Text>}
              </View>
            ))}
            {milestones.length === 0 && <Text style={styles.emptyText}>No milestones defined</Text>}
          </View>
        )}

        {/* RISKS */}
        {tab === 'risks' && (
          <View style={styles.tabContent}>
            {risks.map(risk => (
              <View key={risk.id} style={[styles.riskCard, { borderLeftColor: risk.risk_level === 'critical' ? '#ef4444' : risk.risk_level === 'high' ? '#f97316' : risk.risk_level === 'medium' ? '#f59e0b' : '#10b981', borderLeftWidth: 4 }]}>
                <View style={styles.riskHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.riskCode}>{risk.risk_id_code}</Text>
                    <Text style={styles.riskTitle}>{risk.title}</Text>
                    <View style={styles.riskMeta}>
                      <Text style={styles.riskMetaText}>P:{risk.probability} × I:{risk.impact}</Text>
                      <Text style={styles.riskMetaText}>{risk.category}</Text>
                    </View>
                  </View>
                  <View style={styles.riskScore}>
                    <Text style={[styles.riskScoreNum, { color: risk.risk_level === 'critical' || risk.risk_level === 'high' ? '#ef4444' : '#f59e0b' }]}>{risk.risk_score}</Text>
                    <Text style={styles.riskLevel}>{risk.risk_level}</Text>
                  </View>
                </View>
                {risk.mitigation_plan && (
                  <View style={styles.mitigationBox}>
                    <Text style={styles.mitigationText}>🛡️ {risk.mitigation_plan}</Text>
                  </View>
                )}
              </View>
            ))}
            {risks.length === 0 && <Text style={styles.emptyText}>No risks identified</Text>}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerCard: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  projNumber: { fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', marginBottom: 2 },
  projName: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  statusTagText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  typeText: { fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' },
  progressCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#f0f4ff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#6366f1' },
  progressPct: { fontSize: 16, fontWeight: '800', color: '#6366f1' },
  progressLabel: { fontSize: 9, color: '#94a3b8' },
  phaseBarRow: { flexDirection: 'row', gap: 3, marginBottom: 12, height: 6 },
  phaseBarItem: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: '#e2e8f0' },
  phaseBarFill: { height: 6, borderRadius: 3 },
  statsRow: { flexDirection: 'row' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  statValue: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  statLabel: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingHorizontal: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#6366f1' },
  tabText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  tabTextActive: { color: '#6366f1' },
  tabContent: { padding: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 10 },
  phaseCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  phaseHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  phaseDot: { width: 10, height: 10, borderRadius: 5 },
  phaseName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1e293b' },
  phaseStatus: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  phaseProgressTrack: { height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, marginBottom: 6, overflow: 'hidden' },
  phaseProgressFill: { height: 4, borderRadius: 2 },
  phaseDates: { flexDirection: 'row', justifyContent: 'space-between' },
  phaseDateText: { fontSize: 11, color: '#94a3b8' },
  phasePct: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  activityItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  activityIcon: { fontSize: 18 },
  activityText: { fontSize: 13, color: '#475569' },
  activityDate: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  wbsRow: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 6, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
  wbsLeft: { flex: 1, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  wbsCode: { fontSize: 11, fontFamily: 'monospace', color: '#6366f1', width: 28, paddingTop: 1 },
  wbsName: { fontSize: 13, color: '#1e293b', flex: 1, marginBottom: 3 },
  wbsMeta: { flexDirection: 'row', gap: 8 },
  wbsMetaText: { fontSize: 10, color: '#94a3b8' },
  wbsRight: { alignItems: 'flex-end', gap: 4, width: 60 },
  progressMini: { width: 40, height: 3, backgroundColor: '#e2e8f0', borderRadius: 2, overflow: 'hidden' },
  progressMiniFill: { height: 3, borderRadius: 2 },
  pctText: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  msCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  msHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  msIcon: { fontSize: 22 },
  msName: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 2 },
  msType: { fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  varianceText: { fontSize: 11, fontWeight: '600', marginTop: 8 },
  deliverableText: { fontSize: 12, color: '#64748b', marginTop: 6 },
  riskCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  riskHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  riskCode: { fontSize: 10, fontFamily: 'monospace', color: '#94a3b8' },
  riskTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginTop: 2, marginBottom: 4 },
  riskMeta: { flexDirection: 'row', gap: 10 },
  riskMetaText: { fontSize: 11, color: '#94a3b8' },
  riskScore: { alignItems: 'center' },
  riskScoreNum: { fontSize: 24, fontWeight: '900' },
  riskLevel: { fontSize: 9, color: '#94a3b8', textTransform: 'capitalize' },
  mitigationBox: { backgroundColor: '#f0fdf4', borderRadius: 8, padding: 8, marginTop: 8 },
  mitigationText: { fontSize: 11, color: '#16a34a' },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
});
