import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal, TextInput, ScrollView } from 'react-native';
import { tripsAPI } from '../api/client';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

export default function AdminTipsScreen() {
  const [tips, setTips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: '', content: '', category: '' });

  const load = () => tripsAPI.getAll().then(res => setTips(res.data.results || res.data)).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openEdit = (tip?: any) => {
    if (tip) { setEditing(tip); setForm({ title: tip.title, content: tip.content, category: tip.category || '' }); }
    else { setEditing(null); setForm({ title: '', content: '', category: '' }); }
    setModal(true);
  };

  const save = async () => {
    try {
      if (editing) { await tripsAPI.update(editing.id, form); } else { await tripsAPI.create(form); }
      setModal(false); load();
    } catch { Alert.alert('Error', 'Failed to save'); }
  };

  const del = (id: number) => {
    Alert.alert('Delete', 'Sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { tripsAPI.delete(id).then(load); } },
    ]);
  };

  return (
    <View style={styles.container}>{/* same as AdminTripsScreen */}
      <View style={globalStyles.pageHeader}>
        <Text style={globalStyles.pageTitle}>Tips</Text>
        <TouchableOpacity style={[globalStyles.btnPrimary, { marginTop: 12 }]} onPress={() => openEdit()}><Text style={globalStyles.btnPrimaryText}>+ Add Tip</Text></TouchableOpacity>
      </View>
      <FlatList data={tips} keyExtractor={(item: any) => String(item.id)} contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={{ fontWeight: '600' }}>{item.title}</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }} numberOfLines={2}>{item.content}</Text>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => openEdit(item)}><Text style={{ color: colors.aqua }}>Edit</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => del(item.id)}><Text style={{ color: colors.dangerText }}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        )} />
      <Modal visible={modal} transparent animationType="slide">
        <ScrollView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: '#fff', margin: 16, borderRadius: 24, padding: 24, marginTop: 60 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 16 }}>{editing ? 'Edit' : 'Add'} Tip</Text>
            <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Title</Text><TextInput style={globalStyles.input} value={form.title} onChangeText={(t) => setForm({ ...form, title: t })} /></View>
            <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Content</Text><TextInput style={globalStyles.input} value={form.content} onChangeText={(t) => setForm({ ...form, content: t })} multiline /></View>
            <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Category</Text><TextInput style={globalStyles.input} value={form.category} onChangeText={(t) => setForm({ ...form, category: t })} /></View>
            <TouchableOpacity style={[globalStyles.btnPrimary, globalStyles.btnBlock]} onPress={save}><Text style={globalStyles.btnPrimaryText}>Save</Text></TouchableOpacity>
            <TouchableOpacity style={[globalStyles.btnSecondary, globalStyles.btnBlock, { marginTop: 8 }]} onPress={() => setModal(false)}><Text style={globalStyles.btnSecondaryText}>Cancel</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSolid },
  card: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 18, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  actions: { flexDirection: 'row', gap: 16, marginTop: 10 },
});
