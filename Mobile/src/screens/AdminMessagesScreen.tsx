import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { contactAPI } from '../api/client';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

export default function AdminMessagesScreen() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  const load = () => contactAPI.getAll().then(res => setMessages(res.data.results || res.data)).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const toggleRead = async (msg: any) => {
    try { await contactAPI.update(msg.id, { is_read: !msg.is_read }); load(); } catch {}
  };

  const del = (id: number) => {
    Alert.alert('Delete', 'Sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { contactAPI.delete(id).then(() => { if (selected?.id === id) setSelected(null); load(); }); } },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.aqua} /></View>;

  return (
    <View style={styles.container}>
      <View style={globalStyles.pageHeader}>
        <Text style={globalStyles.pageTitle}>Messages</Text>
        <Text style={{ color: colors.textSecondary }}>{messages.filter(m => !m.is_read).length} unread</Text>
      </View>
      <FlatList data={messages} keyExtractor={(item: any) => String(item.id)} contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, !item.is_read && styles.unread]} onPress={() => setSelected(selected?.id === item.id ? null : item)}>
            <View style={styles.header}>
              <Text style={{ fontWeight: '600', flex: 1 }}>{item.name}</Text>
              <Text style={{ fontSize: 11, color: colors.textLight }}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>{item.subject}</Text>
            {!item.is_read && <View style={styles.newBadge}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>NEW</Text></View>}
            {selected?.id === item.id && (
              <View style={styles.detail}>
                <Text style={{ marginBottom: 4 }}>From: {item.name} • {item.email}</Text>
                {item.phone ? <Text style={{ marginBottom: 4 }}>Phone: {item.phone}</Text> : null}
                <Text style={{ marginBottom: 8, lineHeight: 20 }}>{item.message}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => toggleRead(item)}><Text style={{ color: colors.aqua, fontWeight: '600' }}>{item.is_read ? 'Mark Unread' : 'Mark Read'}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => del(item.id)}><Text style={{ color: colors.dangerText, fontWeight: '600' }}>Delete</Text></TouchableOpacity>
                </View>
              </View>
            )}
          </TouchableOpacity>
        )} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSolid },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 18, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  unread: { backgroundColor: 'rgba(0,102,204,0.05)', borderColor: 'rgba(0,102,204,0.2)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  newBadge: { alignSelf: 'flex-start', marginTop: 4, backgroundColor: '#0066cc', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6 },
  detail: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  actions: { flexDirection: 'row', gap: 16, marginTop: 8 },
});
