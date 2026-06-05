import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import api from '../api/client';

const STATUS_COLORS: Record<string,string> = { planning:'#8b5cf6', in_progress:'#3b82f6', completed:'#10b981', on_hold:'#f59e0b', cancelled:'#ef4444' };

export default function ProjectsScreen({ navigation }: any) {
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [tab, setTab] = useState<'projects'|'tasks'>('projects');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const [pRes, tRes] = await Promise.all([
        api.get('/projects/', { params: { limit: 50 } }),
        api.get('/projects/tasks/all', { params: { limit: 100 } }),
      ]);
      setProjects(pRes.data.items || []);
      setTasks(tRes.data.items || []);
    } catch {}
    setLoading(false); setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const filteredProjects = projects.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));
  const filteredTasks = tasks.filter(t => !search || t.title?.toLowerCase().includes(search.toLowerCase()));

  const TASK_STATUS_COLORS: Record<string,string> = { todo:'#94a3b8', in_progress:'#3b82f6', review:'#f59e0b', done:'#10b981' };

  const renderProject = ({ item }: any) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ProjectDetail', { projectId: item.id, projectName: item.name })}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.projNum}>{item.project_number}</Text>
          <Text style={styles.projName}>{item.name}</Text>
          <Text style={styles.projType} numberOfLines={1}>{item.project_type?.replace('_', ' ')}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: (STATUS_COLORS[item.status] || '#94a3b8') + '20' }]}>
          <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] || '#94a3b8' }]}>{item.status?.replace('_', ' ')}</Text>
        </View>
      </View>
      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${item.progress_percent || 0}%` as any }]} />
        </View>
        <Text style={styles.pctText}>{item.progress_percent || 0}%</Text>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.footerText}>💰 ₹{((item.budget || 0) / 100000).toFixed(1)}L</Text>
        {item.start_date && <Text style={styles.footerText}>📅 {new Date(item.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>}
        <Text style={[styles.openLink, { color: '#6366f1' }]}>Open →</Text>
      </View>
    </TouchableOpacity>
  );

  const renderTask = ({ item }: any) => (
    <View style={styles.taskCard}>
      <View style={[styles.taskDot, { backgroundColor: TASK_STATUS_COLORS[item.status] || '#94a3b8' }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.taskTitle}>{item.title}</Text>
        <Text style={styles.taskMeta}>{item.priority} priority • {item.estimated_hours || 0}h est.</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: (TASK_STATUS_COLORS[item.status] || '#94a3b8') + '20' }]}>
        <Text style={[styles.badgeText, { color: TASK_STATUS_COLORS[item.status] || '#94a3b8' }]}>{item.status?.replace('_', ' ')}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.stats}>
        {[
          { label: 'Total', value: projects.length, color: '#6366f1' },
          { label: 'Active', value: projects.filter(p => p.status === 'in_progress').length, color: '#3b82f6' },
          { label: 'Done', value: projects.filter(p => p.status === 'completed').length, color: '#10b981' },
          { label: 'Tasks', value: tasks.length, color: '#f59e0b' },
        ].map(s => (
          <View key={s.label} style={styles.statItem}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.tabs}>
        {(['projects', 'tasks'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'projects' ? `🚀 Projects (${projects.length})` : `✔️ Tasks (${tasks.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput style={styles.search} placeholder={`Search ${tab}...`} value={search} onChangeText={setSearch} />

      {loading ? <ActivityIndicator style={{ marginTop: 40 }} color="#6366f1" size="large" /> : (
        tab === 'projects' ? (
          <FlatList data={filteredProjects} renderItem={renderProject} keyExtractor={i => String(i.id)}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
            contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
            ListEmptyComponent={<Text style={styles.empty}>No projects found</Text>} />
        ) : (
          <FlatList data={filteredTasks} renderItem={renderTask} keyExtractor={i => String(i.id)}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
            contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
            ListEmptyComponent={<Text style={styles.empty}>No tasks found</Text>} />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  stats: { flexDirection: 'row', backgroundColor: '#6366f1', paddingVertical: 14 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tab: { flex: 1, paddingVertical: 11, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#6366f1' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  tabTextActive: { color: '#6366f1' },
  search: { margin: 12, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  projNum: { fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' },
  projName: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginTop: 1 },
  projType: { fontSize: 11, color: '#94a3b8', textTransform: 'capitalize', marginTop: 1 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  progressTrack: { flex: 1, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: '#6366f1', borderRadius: 2 },
  pctText: { fontSize: 11, fontWeight: '700', color: '#64748b', width: 32, textAlign: 'right' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { fontSize: 11, color: '#94a3b8' },
  openLink: { fontSize: 12, fontWeight: '700' },
  taskCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  taskDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  taskTitle: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  taskMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60, fontSize: 14 },
});
