import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet, Alert, Modal } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { getUsersServer, deleteUserServer, getApiBaseUrl } from '../services/api';
import { useNavigation } from '@react-navigation/native';

export default function DeleteStaffAccount() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; email: string } | null>(null);
  const [error, setError] = useState('');
  const navigation = useNavigation();

  useEffect(() => {
    // wait for auth initialization; only load users if we're signed in as admin
    if (authLoading) return;
    try {
      if (isAdmin && isAdmin()) {
        load();
      } else {
        setLastMessage('You must be signed in as an admin to view this page');
      }
    } catch (e) {
      // fallback: attempt load if isAdmin check fails
      load();
    }
  }, [authLoading]);

  async function load() {
    setLoading(true);
    setLastMessage('');
    try {
      const data = await getUsersServer(getApiBaseUrl());
      setUsers(data || []);
    } catch (e) {
      console.error('Load users failed', e);
      const msg = e && e.message ? e.message : 'Load users failed';
      if (msg === 'no_token') {
        setLastMessage('Not authenticated — please sign in as admin');
      } else {
        setLastMessage(`Load error: ${msg}`);
      }
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id, email) {
    if (id === user?.id) {
      Alert.alert('Error', 'You cannot delete your own account while signed in');
      return;
    }
    setConfirmTarget({ id, email });
  }

  async function deleteConfirmed(id, email) {
    // clear any open confirmation UI
    if (confirmTarget && confirmTarget.id === id) setConfirmTarget(null);
    // optimistic remove from UI so the user sees immediate feedback
    setUsers(prev => prev.filter(u => u.id !== id));
    setDeletingId(id);
    try {
      await deleteUserServer(id, getApiBaseUrl());
      const successMsg = `${email} has been deleted`;
      setLastMessage(successMsg);
  // delete succeeded
      // Optionally refresh to ensure authoritative state
      try {
        await load();
      } catch (e) {
        // ignore refresh errors (we already removed optimistically)
      }
      Alert.alert('Deleted', successMsg);
    } catch (e) {
      console.error('Delete failed, reloading list', e);
      const msg = e && e.message ? e.message : 'Delete failed';
      setLastMessage(`Delete error: ${msg}`);
      // reload from server to restore authoritative state
      try {
        await load();
      } catch (e2) {
        console.error('Reload after failed delete also failed', e2);
      }
      Alert.alert('Error', msg);
    } finally {
      setDeletingId(null);
    }
  }

    function handleCancel() {
      // Handle cancel logic here
      (navigation as any).navigate('DashboardAdmin');
    }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Delete Staff Accounts</Text>
      <Text style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>API: {getApiBaseUrl()}</Text>
      
      
      <Button title="Refresh" onPress={load} disabled={loading} />
      <FlatList
        data={users}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.email}>{item.email}</Text>
              <Text style={styles.meta}>{(item.roles || []).join(', ')}</Text>
            </View>
            <Button title="Delete" color="#d00" onPress={() => handleDelete(item.id, item.email)} disabled={deletingId === item.id} />
          </View>
        )}
      />
        <Button title="Cancel" onPress={handleCancel} />
        {lastMessage ? <Text style={{ marginTop: 12 }}>{lastMessage}</Text> : null}
        {/* Confirmation modal */}
        <Modal
          visible={!!confirmTarget}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setConfirmTarget(null)}
        >
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <View style={{ width: 320, backgroundColor: '#fff', padding: 16, borderRadius: 8 }}>
              <Text style={{ fontSize: 16, marginBottom: 12 }}>Confirm delete</Text>
              <Text style={{ marginBottom: 16 }}>Delete user {confirmTarget ? confirmTarget.email : ''}?</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <Button title="Cancel" onPress={() => setConfirmTarget(null)} />
                <View style={{ width: 8 }} />
                <Button title="Delete" color="#d00" onPress={() => confirmTarget && deleteConfirmed(confirmTarget.id, confirmTarget.email)} />
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
