import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, ScrollView,
} from 'react-native';
import api from '../api/client';

interface Expense {
  id: number; expense_number: string; expense_date: string;
  category: string; description: string; amount: number; status: string;
}

interface Account {
  id: number; account_code: string; account_name: string;
  account_type: string; current_balance: number;
}

const EXPENSE_STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444', paid: '#3b82f6',
};

export default function FinanceScreen() {
  const [tab, setTab] = useState<'expenses' | 'accounts' | 'pl'>('expenses');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pl, setPL] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [eRes, aRes, plRes] = await Promise.all([
        api.get('/finance/expenses', { params: { limit: 50 } }),
        api.get('/finance/accounts'),
        api.get('/finance/reports/pl'),
      ]);
      setExpenses(eRes.data.items || []);
      setAccounts(aRes.data || []);
      setPL(plRes.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const pendingCount = expenses.filter(e => e.status === 'pending').length;

  const renderExpense = ({ item }: { item: Expense }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View>
          <Text style={styles.expenseNum}>{item.expense_number}</Text>
          <Text style={styles.category}>{item.category}</Text>
          <Text style={styles.description} numberOfLines={1}>{item.description || '-'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.amount}>₹{(item.amount || 0).toLocaleString('en-IN')}</Text>
          <View style={[styles.badge, { backgroundColor: (EXPENSE_STATUS_COLORS[item.status] || '#94a3b8') + '20' }]}>
            <Text style={[styles.badgeText, { color: EXPENSE_STATUS_COLORS[item.status] || '#94a3b8' }]}>
              {item.status}
            </Text>
          </View>
          <Text style={styles.dateText}>
            {item.expense_date ? new Date(item.expense_date).toLocaleDateString('en-IN') : '-'}
          </Text>
        </View>
      </View>
    </View>
  );

  const ACCOUNT_TYPE_COLORS: Record<string, string> = {
    asset: '#3b82f6', liability: '#ef4444', equity: '#8b5cf6',
    revenue: '#10b981', expense: '#f59e0b',
  };

  const renderAccount = ({ item }: { item: Account }) => (
    <View style={styles.accountCard}>
      <View style={[styles.accDot, { backgroundColor: ACCOUNT_TYPE_COLORS[item.account_type] || '#94a3b8' }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.accCode}>{item.account_code}</Text>
        <Text style={styles.accName}>{item.account_name}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.accBalance, { color: (item.current_balance || 0) >= 0 ? '#10b981' : '#ef4444' }]}>
          ₹{(item.current_balance || 0).toLocaleString('en-IN')}
        </Text>
        <Text style={[styles.accType, { color: ACCOUNT_TYPE_COLORS[item.account_type] }]}>
          {item.account_type}
        </Text>
      </View>
    </View>
  );

  const PLView = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.plCard}>
        <Text style={styles.plTitle}>Profit & Loss Summary</Text>
        <View style={styles.plRow}>
          <Text style={styles.plLabel}>Total Revenue</Text>
          <Text style={styles.plRevenue}>₹{((pl?.revenue || 0)).toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.plRow}>
          <Text style={styles.plLabel}>Total Expenses</Text>
          <Text style={styles.plExpense}>₹{((pl?.expense || 0)).toLocaleString('en-IN')}</Text>
        </View>
        <View style={[styles.plRow, styles.plNetRow]}>
          <Text style={styles.plNetLabel}>Net Profit</Text>
          <Text style={[styles.plNet, { color: (pl?.net_profit || 0) >= 0 ? '#10b981' : '#ef4444' }]}>
            ₹{((pl?.net_profit || 0)).toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      <View style={styles.plCard}>
        <Text style={styles.plTitle}>Accounts by Type</Text>
        {['asset','liability','equity','revenue','expense'].map(type => {
          const typeAccounts = accounts.filter(a => a.account_type === type);
          const total = typeAccounts.reduce((s, a) => s + (a.current_balance || 0), 0);
          return (
            <View key={type} style={styles.plRow}>
              <Text style={[styles.plLabel, { color: ACCOUNT_TYPE_COLORS[type], textTransform: 'capitalize' }]}>{type} ({typeAccounts.length})</Text>
              <Text style={[styles.plRevenue, { color: ACCOUNT_TYPE_COLORS[type] }]}>₹{total.toLocaleString('en-IN')}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );

  const ACCOUNT_TYPE_COLORS: Record<string, string> = {
    asset: '#3b82f6', liability: '#ef4444', equity: '#8b5cf6',
    revenue: '#10b981', expense: '#f59e0b',
  };

  return (
    <View style={styles.container}>
      {/* Summary Header */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>₹{(totalExpenses / 1000).toFixed(0)}K</Text>
          <Text style={styles.summaryLabel}>Total Expenses</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{pendingCount}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: (pl?.net_profit || 0) >= 0 ? '#86efac' : '#fca5a5' }]}>
            ₹{((pl?.net_profit || 0) / 1000).toFixed(0)}K
          </Text>
          <Text style={styles.summaryLabel}>Net Profit</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['expenses', 'accounts', 'pl'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'expenses' ? 'Expenses' : t === 'accounts' ? 'Accounts' : 'P&L'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#6366f1" size="large" />
      ) : tab === 'expenses' ? (
        <FlatList
          data={expenses}
          renderItem={renderExpense}
          keyExtractor={i => String(i.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 32 }}
          ListEmptyComponent={<Text style={styles.empty}>No expenses yet</Text>}
        />
      ) : tab === 'accounts' ? (
        <FlatList
          data={accounts}
          renderItem={renderAccount}
          keyExtractor={i => String(i.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 32 }}
          ListEmptyComponent={<Text style={styles.empty}>No accounts yet</Text>}
        />
      ) : (
        <PLView />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  summary: { flexDirection: 'row', backgroundColor: '#10b981', paddingVertical: 16 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#6366f1' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  tabTextActive: { color: '#6366f1' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 12, marginVertical: 5,
    padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  expenseNum: { fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' },
  category: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginTop: 2 },
  description: { fontSize: 12, color: '#64748b', marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
  badge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginBottom: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  dateText: { fontSize: 11, color: '#94a3b8' },
  accountCard: {
    backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 12, marginVertical: 4, padding: 14, borderRadius: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  accDot: { width: 10, height: 10, borderRadius: 5 },
  accCode: { fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' },
  accName: { fontSize: 13, fontWeight: '600', color: '#1e293b', marginTop: 1 },
  accBalance: { fontSize: 14, fontWeight: '800' },
  accType: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize', marginTop: 2 },
  plCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  plTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 14 },
  plRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  plLabel: { fontSize: 14, color: '#64748b' },
  plRevenue: { fontSize: 14, fontWeight: '700', color: '#10b981' },
  plExpense: { fontSize: 14, fontWeight: '700', color: '#ef4444' },
  plNetRow: { borderBottomWidth: 0, paddingTop: 12 },
  plNetLabel: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  plNet: { fontSize: 18, fontWeight: '800' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60, fontSize: 15 },
});
