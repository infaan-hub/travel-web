import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Alert, ActivityIndicator, Modal, TextInput, ScrollView } from 'react-native';
import { toursAPI } from '../api/client';
import { getImageUrl } from '../utils/imageUrl';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

export default function AdminToursScreen() {
  const [tours, setTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: '', description: '', price: '', duration: '', destination: '', category: 'international', available: true, featured: false });

  const load = () => toursAPI.getAll().then(res => setTours(res.data.results || res.data)).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openEdit = (tour?: any) => {
    if (tour) { setEditing(tour); setForm({ title: tour.title, description: tour.description, price: String(tour.price), duration: tour.duration, destination: tour.destination, category: tour.category, available: tour.available, featured: tour.featured }); }
    else { setEditing(null); setForm({ title: '', description: '', price: '', duration: '', destination: '', category: 'international', available: true, featured: false }); }
    setModal(true);
  };

  const save = async () => {
    try {
      if (editing) { await toursAPI.update(editing.id, form); } else { await toursAPI.create(form); }
      setModal(false); load();
    } catch { Alert.alert('Error', 'Failed to save tour'); }
  };

  const del = (id: number) => {
    Alert.alert('Delete Tour', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { toursAPI.delete(id).then(load); } },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.aqua} /></View>;

  return (
    <View style={styles.container}>
      <View style={globalStyles.pageHeader}>
        <Text style={globalStyles.pageTitle}>Manage Tours</Text>
        <TouchableOpacity style={[globalStyles.btnPrimary, { marginTop: 12 }]} onPress={() => openEdit()}><Text style={globalStyles.btnPrimaryText}>+ Add Tour</Text></TouchableOpacity>
      </View>
      <FlatList data={tours} keyExtractor={(item: any) => String(item.id)} contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.detail}>${item.price} • {item.duration} • {item.destination}</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}><Text style={{ color: colors.aqua, fontWeight: '600' }}>Edit</Text></TouchableOpacity>
              <TouchableOpacity style={styles.editBtn} onPress={() => del(item.id)}><Text style={{ color: colors.dangerText, fontWeight: '600' }}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        )} />
      <Modal visible={modal} transparent animationType="slide">
        <ScrollView style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 16 }}>{editing ? 'Edit Tour' : 'Add Tour'}</Text>
            <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Title</Text><TextInput style={globalStyles.input} value={form.title} onChangeText={(t) => setForm({ ...form, title: t })} /></View>
            <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Description</Text><TextInput style={globalStyles.input} value={form.description} onChangeText={(t) => setForm({ ...form, description: t })} multiline /></View>
            <View style={styles.row}><View style={[globalStyles.formGroup, { flex: 1, marginRight: 8 }]}><Text style={globalStyles.inputLabel}>Price</Text><TextInput style={globalStyles.input} value={form.price} onChangeText={(t) => setForm({ ...form, price: t })} keyboardType="numeric" /></View></View>
            <View style={styles.row}><View style={[globalStyles.formGroup, { flex: 1, marginRight: 8 }]}><Text style={globalStyles.inputLabel}>Duration</Text><TextInput style={globalStyles.input} value={form.duration} onChangeText={(t) => setForm({ ...form, duration: t })} /></View></View>
            <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Destination</Text><TextInput style={globalStyles.input} value={form.destination} onChangeText={(t) => setForm({ ...form, destination: t })} /></View>
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
  title: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  detail: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 12 },
  editBtn: { padding: 8 },
  row: { flexDirection: 'row' },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', margin: 16, borderRadius: 24, padding: 24, marginTop: 60 },
});
