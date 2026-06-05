import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import api from '../api/client';

interface Employee {
  id: number; employee_number: string; first_name: string; last_name: string;
  email: string; department_id: number; employment_type: string;
  basic_salary: number; status: string;
}

export default function HRScreen() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [tab, setTab] = useState<'employees' | 'leaves'>('employees');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const [eRes, lRes] = await Promise.all([
        api.get('/hr/employees', { params: { limit: 100 } }),
        api.get('/hr/leaves', { params: { limit: 50 } }),
      ]);
      setEmployees(eRes.data.items || []);
      setLeaves(lRes.data.items || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = employees.filter(e =>
    !search ||
    `${e.first_name} ${e.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_number?.toLowerCase().includes(search.toLowerCase())
  );

  const LEAVE_STATUS_COLORS: Record<string, string> = {
    pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444',
  };

  const renderEmployee = ({ item }: { item: Employee }) => (
    <View style={styles.card}>
      <View style={styles.avatarRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.first_name?.[0]}{item.last_name?.[0]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.empName}>{item.first_name} {item.last_name}</Text>
            <View style={[styles.badge, { backgroundColor: item.status === 'active' ? '#dcfce7' : '#fee2e2' }]}>
              <Text style={[styles.badgeText, { color: item.status === 'active' ? '#16a34a' : '#dc2626' }]}>
                {item.status}
              </Text>
            </View>
          </View>
          <Text style={styles.empNum}>{item.employee_number}</Text>
          <Text style={styles.empEmail} numberOfLines={1}>{item.email}</Text>
        </View>
      </View>
      <View style={styles.salaryRow}>
        <Text style={styles.salaryLabel}>Basic Salary</Text>
        <Text style={styles.salary}>₹{(item.basic_salary || 0).toLocaleString('en-IN')}</Text>
      </View>
    </View>
  );

  const renderLeave = ({ item }: { item: any }) => (
    <View style={styles.leaveCard}>
      <View style={styles.leaveHeader}>
        <Text style={styles.leaveType}>{item.leave_type?.toUpperCase()}</Text>
        <View style={[styles.badge, { backgroundColor: (LEAVE_STATUS_COLORS[item.status] || '#94a3b8') + '20' }]}>
          <Text style={[styles.badgeText, { color: LEAVE_STATUS_COLORS[item.status] || '#94a3b8' }]}>
            {item.status}
          </Text>
        </View>
      </View>
      <Text style={styles.leaveDates}>
        {item.from_date} → {item.to_date} ({item.days} day{item.days !== 1 ? 's' : ''})
      </Text>
      {item.reason && <Text style={styles.leaveReason} numberOfLines={1}>{item.reason}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{employees.length}</Text>
          <Text style={styles.statLabel}>Employees</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{employees.filter(e => e.status === 'active').length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{leaves.filter(l => l.status === 'pending').length}</Text>
          <Text style={styles.statLabel}>Leave Pending</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['employees', 'leaves'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'employees' ? `Employees (${employees.length})` : `Leaves (${leaves.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'employees' && (
        <TextInput
          style={styles.search}
          placeholder="Search employees..."
          value={search}
          onChangeText={setSearch}
        />
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#6366f1" size="large" />
      ) : tab === 'employees' ? (
        <FlatList
          data={filtered}
          renderItem={renderEmployee}
          keyExtractor={i => String(i.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListEmptyComponent={<Text style={styles.empty}>No employees found</Text>}
        />
      ) : (
        <FlatList
          data={leaves}
          renderItem={renderLeave}
          keyExtractor={i => String(i.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}
          ListEmptyComponent={<Text style={styles.empty}>No leave requests</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  stats: { flexDirection: 'row', backgroundColor: '#ec4899', paddingVertical: 14 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#6366f1' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  tabTextActive: { color: '#6366f1' },
  search: {
    margin: 12, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 10, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 14,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 12, marginBottom: 10,
    padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  avatarRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  empName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  badge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  empNum: { fontSize: 12, color: '#94a3b8', fontFamily: 'monospace', marginTop: 2 },
  empEmail: { fontSize: 12, color: '#64748b', marginTop: 1 },
  salaryRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  salaryLabel: { fontSize: 13, color: '#64748b' },
  salary: { fontSize: 15, fontWeight: '800', color: '#6366f1' },
  leaveCard: {
    backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 12, marginBottom: 8,
    padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  leaveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  leaveType: { fontSize: 13, fontWeight: '800', color: '#1e293b' },
  leaveDates: { fontSize: 13, color: '#475569', marginBottom: 4 },
  leaveReason: { fontSize: 12, color: '#94a3b8' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60, fontSize: 15 },
});
