import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { adminAPI } from '../api/client';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

export default function AdminCustomersScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getAllUsers().then(res => setUsers(res.data.results || res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const deleteUser = (id: number) => {
    Alert.alert('Delete User', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { adminAPI.deleteUser(id).then(() => setUsers(users.filter(u => u.id !== id))); } },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.aqua} /></View>;

  return (
    <View style={styles.container}>
      <View style={globalStyles.pageHeader}><Text style={globalStyles.pageTitle}>Customers</Text></View>
      <FlatList data={users} keyExtractor={(item: any) => String(item.id)} contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.avatar}><Text style={{ color: '#fff', fontWeight: '700' }}>{item.username[0].toUpperCase()}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600' }}>{item.username}</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>{item.email}</Text>
                <Text style={{ fontSize: 11, color: colors.textLight }}>Joined {new Date(item.date_joined).toLocaleDateString()}</Text>
              </View>
              {item.is_staff ? <View style={styles.adminBadge}><Text style={{ color: '#7C3AED', fontSize: 10, fontWeight: '700' }}>ADMIN</Text></View> : null}
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteUser(item.id)}><Text style={{ color: colors.dangerText, fontSize: 12 }}>Delete</Text></TouchableOpacity>
          </View>
        )} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSolid },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 18, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.aqua, justifyContent: 'center', alignItems: 'center' },
  adminBadge: { paddingVertical: 2, paddingHorizontal: 8, backgroundColor: 'rgba(139,92,246,0.12)', borderRadius: 8 },
  deleteBtn: { marginTop: 8, alignItems: 'flex-end', padding: 4 },
});
