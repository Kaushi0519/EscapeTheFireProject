/**
 * Developer Notes:
 * - This admin screen lists students from the server.
 * - It allows deleting student records after a confirmation step.
 * - It requires admin auth and a valid API base URL.
 * - Keep this page aligned with the backend students delete endpoint.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet, Alert, Modal } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { getStudentsServer, deleteStudentServer, setApiBaseUrl, getApiBaseUrl } from '../services/api';
import { useNavigation } from '@react-navigation/native';

export default function DeleteStudentAccount() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [lastMessage, setLastMessage] = useState('');
  const [confirmTarget, setConfirmTarget] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    if (!getApiBaseUrl()) setApiBaseUrl('http://localhost:5000');
    if (authLoading) return;
    try {
      if (isAdmin && isAdmin()) load(); else setLastMessage('You must be signed in as an admin to view this page');
    } catch (e) { load(); }
  }, [authLoading]);

  async function load() {
    setLoading(true); setLastMessage('');
    try {
      const data = await getStudentsServer(getApiBaseUrl());
      setStudents(data || []);
    } catch (e) {
      console.error('Load students failed', e);
      const msg = e && e.message ? e.message : 'Load students failed';
      Alert.alert('Error', msg);
      setLastMessage(msg === 'no_token' ? 'Not authenticated — please sign in as admin' : `Load error: ${msg}`);
    } finally { setLoading(false); }
  }

  function handleDelete(id, name) {
    setConfirmTarget({ id, name });
  }

  async function deleteConfirmed(id, name) {
    if (confirmTarget && confirmTarget.id === id) setConfirmTarget(null);
    setDeletingId(id);
    try {
      await deleteStudentServer(id, getApiBaseUrl());
      // remove from UI after server confirms
      setStudents(prev => prev.filter(s => s.id !== id));
      const successMsg = `${name} has been deleted`;
      setLastMessage(successMsg);
      Alert.alert('Deleted', successMsg);
      // refresh to ensure authoritative state
      try { await load(); } catch (e) { /* ignore refresh errors */ }
    } catch (e) {
      console.error('Delete failed', e);
      const msg = e && e.message ? e.message : 'Delete failed';
      setLastMessage(`Delete error: ${msg}`);
      Alert.alert('Error', msg);
    } finally { setDeletingId(null); }
  }

  function handleCancel() {
    (navigation as any).navigate('DashboardAdmin');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Delete Student IDs</Text>
      <Text style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>API: {getApiBaseUrl()}</Text>
      <Button title="Refresh" onPress={load} disabled={loading} />
      <FlatList data={students} keyExtractor={i => i.id} renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.email}>{item.firstName} {item.lastName}</Text>
            <Text style={styles.meta}>{item.id}</Text>
          </View>
          <Button title="Delete" color="#d00" onPress={() => handleDelete(item.id, `${item.firstName} ${item.lastName}`)} disabled={deletingId === item.id} />
        </View>
      )} />
      <Button title="Cancel" onPress={handleCancel} />
      {lastMessage ? <Text style={{ marginTop: 12 }}>{lastMessage}</Text> : null}

      <Modal visible={!!confirmTarget} transparent animationType="fade" onRequestClose={() => setConfirmTarget(null)}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ width: 320, backgroundColor: '#fff', padding: 16, borderRadius: 8 }}>
            <Text style={{ fontSize: 16, marginBottom: 12 }}>Confirm delete</Text>
            <Text style={{ marginBottom: 16 }}>Delete student {confirmTarget ? confirmTarget.name : ''}?</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Button title="Cancel" onPress={() => setConfirmTarget(null)} />
              <View style={{ width: 8 }} />
              <Button title="Delete" color="#d00" onPress={() => confirmTarget && deleteConfirmed(confirmTarget.id, confirmTarget.name)} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, marginBottom: 12, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#eee' },
  email: { fontSize: 16 },
  meta: { fontSize: 12, color: '#666' }
});
