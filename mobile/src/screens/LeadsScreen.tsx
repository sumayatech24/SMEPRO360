import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Modal, Alert, ScrollView,
} from 'react-native';
import api from '../api/client';

const STATUS_COLORS: Record<string, string> = {
  new: '#6366f1', contacted: '#8b5cf6', qualified: '#06b6d4',
  proposal: '#f59e0b', negotiation: '#3b82f6', won: '#10b981',
  lost: '#ef4444', unqualified: '#94a3b8',
};

interface Lead {
  id: number;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status: string;
  source?: string;
  created_at: string;
}

const LeadCard = ({ lead, onPress }: { lead: Lead; onPress: () => void }) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={styles.cardHeader}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{lead.name?.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{lead.name}</Text>
        <Text style={styles.cardCompany}>{lead.company || lead.email}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: (STATUS_COLORS[lead.status] || '#94a3b8') + '20' }]}>
        <Text style={[styles.badgeText, { color: STATUS_COLORS[lead.status] || '#94a3b8' }]}>
          {lead.status}
        </Text>
      </View>
    </View>
    {lead.phone && <Text style={styles.cardPhone}>📞 {lead.phone}</Text>}
    <Text style={styles.cardDate}>{new Date(lead.created_at).toLocaleDateString('en-IN')}</Text>
  </TouchableOpacity>
);

export default function LeadsScreen() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', source: 'mobile_app' });

  const fetchLeads = async () => {
    try {
      const res = await api.get('/leads/', { params: { limit: 100, search } });
      setLeads(Array.isArray(res.data) ? res.data : (res.data.items || []));
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchLeads(); }, [search]);

  const handleCreate = async () => {
    if (!form.name || !form.email) { Alert.alert('Error', 'Name and email are required'); return; }
    try {
      await api.post('/leads/', form);
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', company: '', source: 'mobile_app' });
      fetchLeads();
      Alert.alert('Success', 'Lead created successfully!');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to create lead');
    }
  };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#6366f1" /></View>
  );

  return (
    <View style={styles.container}>
      {/* Search + Add */}
      <View style={styles.topBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍  Search leads..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#94a3b8"
        />
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={leads}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <LeadCard lead={item} onPress={() => {}} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLeads(); }} tintColor="#6366f1" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyText}>No leads found</Text>
            <Text style={styles.emptySubtext}>Tap + Add to create your first lead</Text>
          </View>
        }
        contentContainerStyle={{ padding: 16, gap: 10 }}
      />

      {/* Create Lead Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Lead</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            {[
              { field: 'name', label: 'Full Name *', placeholder: 'John Doe' },
              { field: 'email', label: 'Email *', placeholder: 'john@example.com' },
              { field: 'phone', label: 'Phone', placeholder: '+91 99999 99999' },
              { field: 'company', label: 'Company', placeholder: 'Acme Corp' },
            ].map(({ field, label, placeholder }) => (
              <View key={field} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder={placeholder}
                  value={(form as any)[field]}
                  onChangeText={(v) => setForm((f) => ({ ...f, [field]: v }))}
                  keyboardType={field === 'email' ? 'email-address' : field === 'phone' ? 'phone-pad' : 'default'}
                  autoCapitalize={field === 'email' ? 'none' : 'words'}
                />
              </View>
            ))}
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
              <Text style={styles.submitBtnText}>Create Lead</Text>
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
  addBtn: { backgroundColor: '#6366f1', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  cardCompany: { fontSize: 12, color: '#64748b', marginTop: 1 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  cardPhone: { fontSize: 12, color: '#64748b', marginLeft: 52 },
  cardDate: { fontSize: 11, color: '#94a3b8', marginLeft: 52, marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#64748b', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
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
  submitBtn: { flex: 1, backgroundColor: '#6366f1', borderRadius: 12, padding: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700' },
});
