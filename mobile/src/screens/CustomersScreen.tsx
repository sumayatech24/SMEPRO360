import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Modal, Alert, ScrollView,
} from 'react-native';
import api from '../api/client';

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  gstin?: string;
  customer_type?: string;
  created_at: string;
}

const CustomerCard = ({ customer, onPress }: { customer: Customer; onPress: () => void }) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={styles.cardHeader}>
      <View style={[styles.avatar, { backgroundColor: '#8b5cf6' }]}>
        <Text style={styles.avatarText}>{customer.name?.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{customer.name}</Text>
        <Text style={styles.cardEmail}>{customer.email || customer.phone || 'No contact'}</Text>
      </View>
      {customer.city && <Text style={styles.cityBadge}>{customer.city}</Text>}
    </View>
    {customer.gstin && <Text style={styles.gstin}>GSTIN: {customer.gstin}</Text>}
  </TouchableOpacity>
);

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '', gstin: '' });

  const fetch = async () => {
    try {
      const res = await api.get('/crm/customers', { params: { limit: 100, search } });
      setCustomers(Array.isArray(res.data) ? res.data : (res.data.items || []));
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetch(); }, [search]);

  const handleCreate = async () => {
    if (!form.name) { Alert.alert('Error', 'Customer name is required'); return; }
    try {
      await api.post('/crm/customers', form);
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', city: '', gstin: '' });
      fetch();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to create customer');
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#8b5cf6" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TextInput style={styles.searchInput} placeholder="🔍  Search customers..." value={search} onChangeText={setSearch} placeholderTextColor="#94a3b8" />
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#8b5cf6' }]} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={customers}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <CustomerCard customer={item} onPress={() => {}} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor="#8b5cf6" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🤝</Text>
            <Text style={styles.emptyText}>No customers yet</Text>
          </View>
        }
        contentContainerStyle={{ padding: 16, gap: 10 }}
      />

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Customer</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            {[
              { field: 'name', label: 'Customer Name *', placeholder: 'ABC Enterprises' },
              { field: 'email', label: 'Email', placeholder: 'contact@abc.com' },
              { field: 'phone', label: 'Phone', placeholder: '+91 99999 99999' },
              { field: 'city', label: 'City', placeholder: 'Mumbai' },
              { field: 'gstin', label: 'GSTIN', placeholder: '27AABCU9603R1ZX' },
            ].map(({ field, label, placeholder }) => (
              <View key={field} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder={placeholder}
                  value={(form as any)[field]}
                  onChangeText={(v) => setForm((f) => ({ ...f, [field]: v }))}
                  keyboardType={field === 'email' ? 'email-address' : field === 'phone' ? 'phone-pad' : 'default'}
                  autoCapitalize={field === 'email' || field === 'gstin' ? 'none' : 'words'}
                />
              </View>
            ))}
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#8b5cf6' }]} onPress={handleCreate}>
              <Text style={styles.submitBtnText}>Create Customer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  searchInput: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1e293b' },
  addBtn: { borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  cardEmail: { fontSize: 12, color: '#64748b', marginTop: 1 },
  cityBadge: { fontSize: 11, color: '#8b5cf6', backgroundColor: '#8b5cf620', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, fontWeight: '600' },
  gstin: { fontSize: 11, color: '#94a3b8', marginLeft: 52, marginTop: 6, fontFamily: 'monospace' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#64748b', marginTop: 12 },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  modalClose: { fontSize: 18, color: '#64748b', padding: 4 },
  modalBody: { flex: 1, padding: 20 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 15, color: '#1e293b', backgroundColor: '#f8fafc' },
  modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#64748b', fontWeight: '600' },
  submitBtn: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700' },
});
