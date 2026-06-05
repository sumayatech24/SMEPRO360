import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput,
  RefreshControl, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import api from '../api/client';

interface Product {
  id: number; sku: string; name: string; category_id: number;
  cost_price: number; selling_price: number; tax_percent: number;
  reorder_level: number; unit: string; is_active: boolean;
}

export default function InventoryScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const r = await api.get('/inventory/products', { params: { limit: 100 } });
      setProducts(r.data.items || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const margin = (p: Product) => p.selling_price > 0
    ? Math.round(((p.selling_price - p.cost_price) / p.selling_price) * 100) : 0;

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.sku}>{item.sku}</Text>
          <Text style={styles.name}>{item.name}</Text>
        </View>
        <View style={styles.gstBadge}>
          <Text style={styles.gstText}>GST {item.tax_percent}%</Text>
        </View>
      </View>
      <View style={styles.priceRow}>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Cost</Text>
          <Text style={styles.costPrice}>₹{(item.cost_price || 0).toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Selling</Text>
          <Text style={styles.sellPrice}>₹{(item.selling_price || 0).toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Margin</Text>
          <Text style={[styles.margin, { color: margin(item) > 20 ? '#10b981' : '#f59e0b' }]}>
            {margin(item)}%
          </Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Unit</Text>
          <Text style={styles.unit}>{item.unit}</Text>
        </View>
      </View>
      {(item.reorder_level || 0) > 0 && (
        <View style={styles.reorderRow}>
          <Text style={styles.reorderText}>⚠️ Reorder at: {item.reorder_level} {item.unit}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerStat}>
          <Text style={styles.headerStatValue}>{products.length}</Text>
          <Text style={styles.headerStatLabel}>Products</Text>
        </View>
        <View style={styles.headerStat}>
          <Text style={styles.headerStatValue}>
            ₹{(products.reduce((s, p) => s + (p.selling_price || 0), 0) / 1000).toFixed(0)}K
          </Text>
          <Text style={styles.headerStatLabel}>Catalog Value</Text>
        </View>
        <View style={styles.headerStat}>
          <Text style={styles.headerStatValue}>
            {Math.round(products.reduce((s, p) => s + margin(p), 0) / (products.length || 1))}%
          </Text>
          <Text style={styles.headerStatLabel}>Avg Margin</Text>
        </View>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search products by name or SKU..."
        value={search}
        onChangeText={setSearch}
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#6366f1" size="large" />
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderProduct}
          keyExtractor={i => String(i.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListEmptyComponent={<Text style={styles.empty}>No products found</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', backgroundColor: '#0ea5e9', paddingVertical: 16 },
  headerStat: { flex: 1, alignItems: 'center' },
  headerStatValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  search: {
    margin: 12, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 10, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 14,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 12, marginBottom: 10,
    padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  sku: { fontSize: 12, color: '#94a3b8', fontFamily: 'monospace', marginBottom: 2 },
  name: { fontSize: 15, fontWeight: '700', color: '#1e293b', maxWidth: 220 },
  gstBadge: { backgroundColor: '#f0f4ff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  gstText: { fontSize: 11, fontWeight: '700', color: '#6366f1' },
  priceRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  priceItem: { flex: 1, alignItems: 'center' },
  priceLabel: { fontSize: 10, color: '#94a3b8', marginBottom: 2 },
  costPrice: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  sellPrice: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  margin: { fontSize: 13, fontWeight: '800' },
  unit: { fontSize: 13, color: '#64748b' },
  reorderRow: { marginTop: 8, backgroundColor: '#fffbeb', borderRadius: 8, padding: 6 },
  reorderText: { fontSize: 11, color: '#d97706' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60, fontSize: 15 },
});
