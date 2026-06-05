import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Modal, Alert, ScrollView,
} from 'react-native';
import api from '../api/client';

const PRIORITY_COLORS: Record<string, string> = {
  low: '#10b981', medium: '#f59e0b', high: '#ef4444', critical: '#dc2626',
};
const STATUS_COLORS: Record<string, string> = {
  open: '#6366f1', in_progress: '#f59e0b', resolved: '#10b981', closed: '#94a3b8',
};

interface Ticket {
  id: number;
  ticket_number: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
}

export default function TicketsScreen() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium' });

  const fetch = async () => {
    try {
      const res = await api.get('/helpdesk/tickets', { params: { limit: 100, search } });
      setTickets(Array.isArray(res.data) ? res.data : (res.data.items || []));
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetch(); }, [search]);

  const handleCreate = async () => {
    if (!form.title) { Alert.alert('Error', 'Title is required'); return; }
    try {
      await api.post('/helpdesk/tickets', form);
      setShowModal(false);
      setForm({ title: '', description: '', priority: 'medium' });
      fetch();
      Alert.alert('✅ Ticket Created', 'Your support ticket has been submitted.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to create ticket');
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#f59e0b" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TextInput style={styles.searchInput} placeholder="🔍  Search tickets..." value={search} onChangeText={setSearch} placeholderTextColor="#94a3b8" />
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tickets}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.ticketNum}>{item.ticket_number}</Text>
              <View style={styles.badges}>
                <View style={[styles.badge, { backgroundColor: (PRIORITY_COLORS[item.priority] || '#94a3b8') + '20' }]}>
                  <Text style={[styles.badgeText, { color: PRIORITY_COLORS[item.priority] || '#94a3b8' }]}>{item.priority}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: (STATUS_COLORS[item.status] || '#94a3b8') + '20' }]}>
                  <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] || '#94a3b8' }]}>{item.status.replace('_', ' ')}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.ticketTitle}>{item.title}</Text>
            <Text style={styles.ticketDate}>{new Date(item.created_at).toLocaleDateString('en-IN')}</Text>
          </TouchableOpacity>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor="#f59e0b" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎫</Text>
            <Text style={styles.emptyText}>No tickets found</Text>
          </View>
        }
        contentContainerStyle={{ padding: 16, gap: 10 }}
      />

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Support Ticket</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.fieldLabel}>Title *</Text>
            <TextInput style={styles.fieldInput} placeholder="Describe your issue briefly" value={form.title} onChangeText={(v) => setForm(f => ({ ...f, title: v }))} />
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Description</Text>
            <TextInput
              style={[styles.fieldInput, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Provide more details about the issue..."
              multiline
              value={form.description}
              onChangeText={(v) => setForm(f => ({ ...f, description: v }))}
            />
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Priority</Text>
            <View style={styles.priorityRow}>
              {['low', 'medium', 'high', 'critical'].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityBtn, form.priority === p && { backgroundColor: PRIORITY_COLORS[p], borderColor: PRIORITY_COLORS[p] }]}
                  onPress={() => setForm(f => ({ ...f, priority: p }))}
                >
                  <Text style={[styles.priorityBtnText, form.priority === p && { color: '#fff' }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#f59e0b' }]} onPress={handleCreate}>
              <Text style={styles.submitBtnText}>Submit Ticket</Text>
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
  addBtn: { backgroundColor: '#f59e0b', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ticketNum: { fontSize: 11, fontFamily: 'monospace', color: '#6366f1', fontWeight: '700' },
  badges: { flexDirection: 'row', gap: 6 },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  ticketTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  ticketDate: { fontSize: 11, color: '#94a3b8', marginTop: 6 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#64748b', marginTop: 12 },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  modalClose: { fontSize: 18, color: '#64748b', padding: 4 },
  modalBody: { flex: 1, padding: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 15, color: '#1e293b', backgroundColor: '#f8fafc' },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityBtn: { flex: 1, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  priorityBtnText: { fontSize: 12, fontWeight: '600', color: '#64748b', textTransform: 'capitalize' },
  modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#64748b', fontWeight: '600' },
  submitBtn: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700' },
});
