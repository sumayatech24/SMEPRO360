import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Modal, Alert, ScrollView,
} from 'react-native';
import api from '../api/client';

interface Order {
  id: number; order_number: string; customer_id: number;
  status: string; total_amount: number; order_date: string; payment_status: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#94a3b8', confirmed: '#3b82f6', delivered: '#10b981',
  cancelled: '#ef4444', pending: '#f59e0b',
};

export default function SalesScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ customer_id: '', notes: '' });

  const load = async () => {
    try {
      const [oRes, cRes] = await Promise.all([
        api.get('/sales/orders', { params: { limit: 50 } }),
        api.get('/crm/customers', { params: { limit: 50 } }),
      ]);
      setOrders(oRes.data.items || []);
      setCustomers(cRes.data.items || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const custName = (id: number) => customers.find(c => c.id === id)?.company_name || `CUS-${id}`;

  const filtered = orders.filter(o =>
    !search || o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    custName(o.customer_id).toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = orders.reduce((s, o) => s + (o.total_amount || 0), 0);

  const createOrder = async () => {
    if (!form.customer_id) return Alert.alert('Error', 'Select a customer');
    try {
      await api.post('/sales/orders', {
        customer_id: Number(form.customer_id),
        notes: form.notes,
        items: [{ description: 'Services', quantity: 1, unit: 'nos', unit_price: 10000, tax_percent: 18 }],
      });
      Alert.alert('Success', 'Order created!');
      setModalVisible(false);
      setForm({ customer_id: '', notes: '' });
      load();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed');
    }
  };

  const renderOrder = ({ item }: { item: Order }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderNumber}>{item.order_number}</Text>
        <View style={[styles.badge, { backgroundColor: (STATUS_COLORS[item.status] || '#94a3b8') + '20' }]}>
          <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] || '#94a3b8' }]}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.customerName}>{custName(item.customer_id)}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.amount}>₹{(item.total_amount || 0).toLocaleString('en-IN')}</Text>
        <Text style={styles.date}>{item.order_date ? new Date(item.order_date).toLocaleDateString('en-IN') : '-'}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{orders.length}</Text>
          <Text style={styles.summaryLabel}>Total Orders</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            ₹{(totalRevenue / 100000).toFixed(1)}L
          </Text>
          <Text style={styles.summaryLabel}>Revenue</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{orders.filter(o => o.status === 'confirmed').length}</Text>
          <Text style={styles.summaryLabel}>Confirmed</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search orders..."
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#6366f1" size="large" />
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderOrder}
          keyExtractor={i => String(i.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#6366f1" />}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListEmptyComponent={<Text style={styles.empty}>No orders found</Text>}
        />
      )}

      {/* Create Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Sales Order</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Customer *</Text>
            {customers.map(c => (
              <TouchableOpacity key={c.id}
                style={[styles.customerOption, form.customer_id === String(c.id) && styles.customerSelected]}
                onPress={() => setForm(f => ({ ...f, customer_id: String(c.id) }))}>
                <Text style={[styles.customerOptionText, form.customer_id === String(c.id) && { color: '#6366f1', fontWeight: '700' }]}>
                  {c.company_name}
                </Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput style={[styles.input, { height: 80 }]} multiline placeholder="Order notes..."
              value={form.notes} onChangeText={t => setForm(f => ({ ...f, notes: t }))} />
            <TouchableOpacity style={styles.submitBtn} onPress={createOrder}>
              <Text style={styles.submitBtnText}>Create Order</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  summary: { flexDirection: 'row', backgroundColor: '#6366f1', paddingVertical: 16, paddingHorizontal: 12 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  searchRow: { flexDirection: 'row', padding: 12, gap: 8 },
  searchInput: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 10, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 14,
  },
  addBtn: { backgroundColor: '#6366f1', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 12, marginBottom: 10,
    padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderNumber: { fontSize: 14, fontWeight: '700', color: '#6366f1', fontFamily: 'monospace' },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  customerName: { fontSize: 15, fontWeight: '600', color: '#1e293b', marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: 16, fontWeight: '800', color: '#10b981' },
  date: { fontSize: 12, color: '#94a3b8' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60, fontSize: 15 },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  closeBtn: { fontSize: 20, color: '#94a3b8', padding: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginHorizontal: 16, marginTop: 16, marginBottom: 6 },
  input: {
    marginHorizontal: 16, borderWidth: 1.5, borderColor: '#e2e8f0',
    borderRadius: 12, padding: 14, fontSize: 15, color: '#1e293b', backgroundColor: '#f8fafc',
  },
  customerOption: {
    marginHorizontal: 16, marginBottom: 4, padding: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc',
  },
  customerSelected: { borderColor: '#6366f1', backgroundColor: '#f0f0ff' },
  customerOptionText: { fontSize: 14, color: '#475569' },
  submitBtn: {
    margin: 16, backgroundColor: '#6366f1', borderRadius: 14,
    padding: 16, alignItems: 'center', marginTop: 24,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
