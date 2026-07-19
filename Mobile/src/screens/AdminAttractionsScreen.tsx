import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal, TextInput, ScrollView } from 'react-native';
import { attractionsAPI } from '../api/client';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

export default function AdminAttractionsScreen() {
  const [attractions, setAttractions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '', location: '', category: '', region: '' });

  const load = () => attractionsAPI.getAll().then(res => setAttractions(res.data.results || res.data)).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openEdit = (att?: any) => {
    if (att) { setEditing(att); setForm({ name: att.name, description: att.description || '', location: att.location, category: att.category || '', region: att.region || '' }); }
    else { setEditing(null); setForm({ name: '', description: '', location: '', category: '', region: '' }); }
    setModal(true);
  };

  const save = async () => {
    try {
      if (editing) { await attractionsAPI.update(editing.id, form); } else { await attractionsAPI.create(form); }
      setModal(false); load();
    } catch { Alert.alert('Error', 'Failed to save'); }
  };

  const del = (id: number) => {
    Alert.alert('Delete', 'Sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { attractionsAPI.delete(id).then(load); } },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.aqua} /></View>;

  return (
    <View style={styles.container}>
      <View style={globalStyles.pageHeader}>
        <Text style={globalStyles.pageTitle}>Attractions</Text>
        <TouchableOpacity style={[globalStyles.btnPrimary, { marginTop: 12 }]} onPress={() => openEdit()}><Text style={globalStyles.btnPrimaryText}>+ Add</Text></TouchableOpacity>
      </View>
      <FlatList data={attractions} keyExtractor={(item: any) => String(item.id)} contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={{ fontWeight: '600' }}>{item.name}</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>{item.location}</Text>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => openEdit(item)}><Text style={{ color: colors.aqua, fontWeight: '600' }}>Edit</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => del(item.id)}><Text style={{ color: colors.dangerText, fontWeight: '600' }}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        )} />
      <Modal visible={modal} transparent animationType="slide">
        <ScrollView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: '#fff', margin: 16, borderRadius: 24, padding: 24, marginTop: 60 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 16 }}>{editing ? 'Edit' : 'Add'} Attraction</Text>
            <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Name</Text><TextInput style={globalStyles.input} value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} /></View>
            <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Description</Text><TextInput style={globalStyles.input} value={form.description} onChangeText={(t) => setForm({ ...form, description: t })} multiline /></View>
            <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Location</Text><TextInput style={globalStyles.input} value={form.location} onChangeText={(t) => setForm({ ...form, location: t })} /></View>
            <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Region</Text><TextInput style={globalStyles.input} value={form.region} onChangeText={(t) => setForm({ ...form, region: t })} /></View>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 18, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  actions: { flexDirection: 'row', gap: 16, marginTop: 10 },
});
