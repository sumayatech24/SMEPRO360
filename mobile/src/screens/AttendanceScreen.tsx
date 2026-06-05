import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, ScrollView, FlatList, RefreshControl,
} from 'react-native';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';

interface AttendanceRecord {
  id: number;
  date: string;
  check_in?: string;
  check_out?: string;
  status: string;
  work_hours?: number;
}

export default function AttendanceScreen() {
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();

  const today = new Date().toISOString().split('T')[0];

  const fetch = async () => {
    try {
      const res = await api.get('/hr/attendance', { params: { limit: 20 } });
      const records: AttendanceRecord[] = Array.isArray(res.data) ? res.data : (res.data.items || []);
      const todayRec = records.find(r => r.date === today);
      setTodayRecord(todayRec || null);
      setHistory(records.slice(0, 10));
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleCheckIn = async () => {
    setChecking(true);
    try {
      const now = new Date().toTimeString().slice(0, 5);
      await api.post('/hr/attendance', { date: today, check_in: now, status: 'present' });
      fetch();
      Alert.alert('✅ Checked In!', `Welcome! Check-in recorded at ${now}`);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Check-in failed');
    }
    setChecking(false);
  };

  const handleCheckOut = async () => {
    if (!todayRecord) return;
    setChecking(true);
    try {
      const now = new Date().toTimeString().slice(0, 5);
      await api.put(`/hr/attendance/${todayRecord.id}`, { check_out: now });
      fetch();
      Alert.alert('👋 Checked Out!', `Have a great day! Check-out recorded at ${now}`);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Check-out failed');
    }
    setChecking(false);
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const isCheckedIn = !!todayRecord?.check_in && !todayRecord?.check_out;
  const isCheckedOut = !!todayRecord?.check_out;

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#10b981" /></View>;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor="#10b981" />}
    >
      {/* Time Widget */}
      <View style={styles.timeWidget}>
        <Text style={styles.timeText}>{timeStr}</Text>
        <Text style={styles.dateText}>{dateStr}</Text>
        <Text style={styles.userText}>👤 {user?.full_name}</Text>
      </View>

      {/* Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Check In</Text>
            <Text style={styles.statusValue}>{todayRecord?.check_in || '--:--'}</Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Check Out</Text>
            <Text style={styles.statusValue}>{todayRecord?.check_out || '--:--'}</Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Hours</Text>
            <Text style={styles.statusValue}>{todayRecord?.work_hours ? `${todayRecord.work_hours}h` : '0h'}</Text>
          </View>
        </View>

        {/* Action Button */}
        {!todayRecord && (
          <TouchableOpacity style={[styles.checkBtn, { backgroundColor: '#10b981' }]} onPress={handleCheckIn} disabled={checking}>
            {checking ? <ActivityIndicator color="#fff" /> : (
              <><Text style={styles.checkBtnIcon}>🟢</Text><Text style={styles.checkBtnText}>Check In</Text></>
            )}
          </TouchableOpacity>
        )}
        {isCheckedIn && (
          <TouchableOpacity style={[styles.checkBtn, { backgroundColor: '#ef4444' }]} onPress={handleCheckOut} disabled={checking}>
            {checking ? <ActivityIndicator color="#fff" /> : (
              <><Text style={styles.checkBtnIcon}>🔴</Text><Text style={styles.checkBtnText}>Check Out</Text></>
            )}
          </TouchableOpacity>
        )}
        {isCheckedOut && (
          <View style={[styles.checkBtn, { backgroundColor: '#f1f5f9' }]}>
            <Text style={styles.checkBtnIcon}>✅</Text>
            <Text style={[styles.checkBtnText, { color: '#64748b' }]}>Attendance Complete</Text>
          </View>
        )}
      </View>

      {/* History */}
      <Text style={styles.sectionTitle}>Recent Attendance</Text>
      {history.map((record) => (
        <View key={record.id} style={styles.historyCard}>
          <View style={styles.historyLeft}>
            <Text style={styles.historyDate}>{new Date(record.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
            <View style={[styles.historyStatus, { backgroundColor: record.status === 'present' ? '#10b98115' : '#ef444415' }]}>
              <Text style={[styles.historyStatusText, { color: record.status === 'present' ? '#10b981' : '#ef4444' }]}>
                {record.status}
              </Text>
            </View>
          </View>
          <View style={styles.historyRight}>
            <Text style={styles.historyTime}>In: {record.check_in || '-'}</Text>
            <Text style={styles.historyTime}>Out: {record.check_out || '-'}</Text>
            {record.work_hours && <Text style={styles.historyHours}>{record.work_hours}h</Text>}
          </View>
        </View>
      ))}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  timeWidget: { backgroundColor: '#10b981', padding: 32, alignItems: 'center' },
  timeText: { fontSize: 52, fontWeight: '800', color: '#fff', letterSpacing: 2 },
  dateText: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  userText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 8 },
  statusCard: { backgroundColor: '#fff', margin: 16, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  statusRow: { flexDirection: 'row', marginBottom: 20 },
  statusItem: { flex: 1, alignItems: 'center' },
  statusDivider: { width: 1, backgroundColor: '#e2e8f0' },
  statusLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  statusValue: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  checkBtn: { flexDirection: 'row', borderRadius: 14, padding: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  checkBtnIcon: { fontSize: 20 },
  checkBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginLeft: 16, marginBottom: 12 },
  historyCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyLeft: { gap: 6 },
  historyDate: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  historyStatus: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  historyStatusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  historyRight: { alignItems: 'flex-end', gap: 2 },
  historyTime: { fontSize: 13, color: '#64748b' },
  historyHours: { fontSize: 13, fontWeight: '700', color: '#10b981', marginTop: 4 },
});
