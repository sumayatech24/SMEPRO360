import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';

interface DashboardData {
  total_leads?: number;
  total_customers?: number;
  total_orders?: number;
  total_revenue?: number;
  open_tickets?: number;
  active_projects?: number;
  total_employees?: number;
  total_products?: number;
  leads_growth?: number;
  revenue_growth?: number;
}

const KPICard = ({ icon, label, value, color, change }: any) => (
  <View style={[styles.kpiCard, { borderTopColor: color, borderTopWidth: 3 }]}>
    <Text style={styles.kpiIcon}>{icon}</Text>
    <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    <Text style={styles.kpiLabel}>{label}</Text>
    {change !== undefined && (
      <Text style={[styles.kpiChange, { color: change >= 0 ? '#10b981' : '#ef4444' }]}>
        {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
      </Text>
    )}
  </View>
);

export default function DashboardScreen() {
  const [data, setData] = useState<DashboardData>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();

  const fetchData = async () => {
    try {
      const res = await api.get('/dashboard/');
      setData(res.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchData(); }, []);

  const formatCurrency = (n: number = 0) => {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n}`;
  };

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#6366f1" />
      <Text style={styles.loadingText}>Loading dashboard...</Text>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#6366f1" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Good day, {user?.full_name?.split(' ')[0] || 'Admin'}! 👋</Text>
          <Text style={styles.headerSubtitle}>Here's your business overview</Text>
        </View>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>S</Text>
        </View>
      </View>

      {/* KPI Grid */}
      <Text style={styles.sectionTitle}>Key Metrics</Text>
      <View style={styles.kpiGrid}>
        <KPICard icon="🎯" label="Leads" value={data.total_leads || 0} color="#6366f1" change={data.leads_growth} />
        <KPICard icon="🤝" label="Customers" value={data.total_customers || 0} color="#8b5cf6" />
        <KPICard icon="🛒" label="Orders" value={data.total_orders || 0} color="#06b6d4" />
        <KPICard icon="💰" label="Revenue" value={formatCurrency(data.total_revenue)} color="#10b981" change={data.revenue_growth} />
        <KPICard icon="🎫" label="Tickets" value={data.open_tickets || 0} color="#f59e0b" />
        <KPICard icon="🚀" label="Projects" value={data.active_projects || 0} color="#3b82f6" />
        <KPICard icon="👥" label="Employees" value={data.total_employees || 0} color="#ec4899" />
        <KPICard icon="📦" label="Products" value={data.total_products || 0} color="#14b8a6" />
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {[
          { icon: '➕', label: 'New Lead', color: '#6366f1' },
          { icon: '📄', label: 'New Invoice', color: '#8b5cf6' },
          { icon: '🎫', label: 'New Ticket', color: '#f59e0b' },
          { icon: '✅', label: 'Check-In', color: '#10b981' },
        ].map((action) => (
          <TouchableOpacity key={action.label} style={[styles.actionBtn, { backgroundColor: action.color + '15', borderColor: action.color + '30' }]}>
            <Text style={styles.actionIcon}>{action.icon}</Text>
            <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  header: {
    backgroundColor: '#6366f1', padding: 24, paddingTop: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  headerIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  headerIconText: { fontSize: 22, fontWeight: '800', color: '#fff' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginLeft: 16, marginTop: 20, marginBottom: 12 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  kpiCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, width: '47%',
    marginHorizontal: '1.5%', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  kpiIcon: { fontSize: 24, marginBottom: 8 },
  kpiValue: { fontSize: 22, fontWeight: '800' },
  kpiLabel: { fontSize: 12, color: '#64748b', marginTop: 2 },
  kpiChange: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  actionBtn: {
    borderWidth: 1, borderRadius: 14, padding: 16, alignItems: 'center',
    width: '46%', marginHorizontal: '2%',
  },
  actionIcon: { fontSize: 28, marginBottom: 6 },
  actionLabel: { fontSize: 13, fontWeight: '600' },
});
