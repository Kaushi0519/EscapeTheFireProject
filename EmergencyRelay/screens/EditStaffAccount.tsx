import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet, Alert, Modal, TextInput, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { getUsersServer, updateUserServer, resetUserPasswordServer, deleteUserServer, getApiBaseUrl } from '../services/api';
import { useNavigation } from '@react-navigation/native';

export default function EditStaffAccount() {
    const { user, loading: authLoading, isAdmin } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [lastMessage, setLastMessage] = useState('');
    const navigation = useNavigation();

    // Edit modal state
    const [editTarget, setEditTarget] = useState<any>(null);
    const [editEmail, setEditEmail] = useState('');
    const [editImageUri, setEditImageUri] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Password reset modal state
    const [resetTarget, setResetTarget] = useState<any>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetting, setResetting] = useState(false);

    // Delete confirmation state
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (authLoading) return;
        try {
            if (isAdmin && isAdmin()) {
                load();
            } else {
                setLastMessage('You must be signed in as an admin to view this page');
            }
        } catch (e) {
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
            setLastMessage(`Load error: ${msg}`);
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    }

    function openEditModal(item: any) {
        setEditTarget(item);
        setEditEmail(item.email || '');
        setEditImageUri(item.imageUrl || null);
    }

    async function pickImage() {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6, allowsEditing: true });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                setEditImageUri(result.assets[0].uri);
            }
        } catch (e) {
            console.error('image pick failed', e);
            Alert.alert('Error', 'Image picker failed');
        }
    }

    async function handleSaveEdit() {
        if (!editTarget) return;
        if (!editEmail.trim()) {
            Alert.alert('Error', 'Email is required');
            return;
        }
        setSaving(true);
        try {
            await updateUserServer(editTarget.id, {
                email: editEmail.trim(),
                imageUrl: editImageUri || undefined,
            }, getApiBaseUrl());
            setLastMessage('Account updated successfully');
            setEditTarget(null);
            Alert.alert('Success', 'Account updated');
            load();
        } catch (e) {
            console.error('Update failed', e);
            const msg = e && e.message ? e.message : 'Update failed';
            Alert.alert('Error', msg);
        } finally {
            setSaving(false);
        }
    }

    function openResetPasswordModal(item: any) {
        setResetTarget(item);
        setNewPassword('');
        setConfirmPassword('');
    }

    async function handleResetPassword() {
        if (!resetTarget) return;
        if (!newPassword || newPassword.length < 4) {
            Alert.alert('Error', 'Password must be at least 4 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }
        setResetting(true);
        try {
            await resetUserPasswordServer(resetTarget.id, newPassword, getApiBaseUrl());
            setLastMessage('Password reset successfully');
            setResetTarget(null);
            Alert.alert('Success', 'Password has been reset');
        } catch (e) {
            console.error('Reset failed', e);
            const msg = e && e.message ? e.message : 'Reset failed';
            Alert.alert('Error', msg);
        } finally {
            setResetting(false);
        }
    }

    function handleDeleteUser(item: any) {
        if (item.id === user?.id) {
            Alert.alert('Error', 'You cannot delete your own account while signed in');
            return;
        }
        // Check if this is the last admin account
        if (Array.isArray(item.roles) && item.roles.includes('admin')) {
            const adminCount = users.filter((u: any) => Array.isArray(u.roles) && u.roles.includes('admin')).length;
            if (adminCount <= 1) {
                Alert.alert('Error', 'Cannot delete the last admin account. Create another admin account first.');
                return;
            }
        }
        setDeleteTarget(item);
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await deleteUserServer(deleteTarget.id, getApiBaseUrl());
            setLastMessage(`${deleteTarget.email} has been deleted`);
            if (Platform.OS === 'web') {
                window.alert(`${deleteTarget.email} has been deleted`);
            } else {
                Alert.alert('Deleted', `${deleteTarget.email} has been deleted`);
            }
            setDeleteTarget(null);
            load();
        } catch (e) {
            console.error('Delete failed', e);
            const msg = e && e.message ? e.message : 'Delete failed';
            Alert.alert('Error', msg);
        } finally {
            setDeleting(false);
        }
    }

    function handleCancel() {
        (navigation as any).navigate('DashboardAdmin');
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Manage Staff Accounts</Text>
            <Text style={styles.caption}>Edit, reset password, or delete staff accounts</Text>

            {lastMessage ? <Text style={styles.message}>{lastMessage}</Text> : null}

            {loading ? (
                <ActivityIndicator size="large" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={[...users].sort((a, b) => (a.email || '').localeCompare(b.email || ''))}
                    keyExtractor={item => item.id}
                    style={{ flex: 1, width: '100%' }}
                    ListEmptyComponent={<Text style={styles.emptyText}>No users found</Text>}
                    renderItem={({ item }) => (
                        <View style={styles.userRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.userEmail}>{item.email}</Text>
                                <Text style={styles.userRoles}>{(item.roles || []).join(', ')}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <Button title="Edit" onPress={() => openEditModal(item)} />
                                <Button title="Reset" onPress={() => openResetPasswordModal(item)} />
                                <Button title="Delete" color="#d00" onPress={() => handleDeleteUser(item)} />
                            </View>
                        </View>
                    )}
                />
            )}

            <View style={{ marginTop: 16 }}>
                <Button title="Refresh" onPress={load} />
                <View style={{ height: 8 }} />
                <Button title="Back" onPress={handleCancel} />
            </View>

            {/* Edit Modal */}
            <Modal visible={!!editTarget} animationType="slide" onRequestClose={() => setEditTarget(null)}>
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Edit Account</Text>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        value={editEmail}
                        onChangeText={setEditEmail}
                        placeholder="Email"
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                    <View style={{ height: 16 }} />
                    <Button title={editImageUri ? 'Change Photo' : 'Add Photo'} onPress={pickImage} />
                    {editImageUri ? <Text style={{ marginTop: 8 }}>Photo selected</Text> : null}
                    <View style={{ height: 24 }} />
                    {saving ? <ActivityIndicator /> : (
                        <>
                            <Button title="Save Changes" onPress={handleSaveEdit} />
                            <View style={{ height: 8 }} />
                            <Button title="Cancel" onPress={() => setEditTarget(null)} />
                        </>
                    )}
                </View>
            </Modal>

            {/* Password Reset Modal */}
            <Modal visible={!!resetTarget} animationType="slide" onRequestClose={() => setResetTarget(null)}>
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Reset Password</Text>
                    <Text style={styles.caption}>Resetting password for: {resetTarget?.email}</Text>
                    <View style={{ height: 16 }} />
                    <Text style={styles.label}>New Password</Text>
                    <TextInput
                        style={styles.input}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="New Password"
                        secureTextEntry
                    />
                    <Text style={styles.label}>Confirm Password</Text>
                    <TextInput
                        style={styles.input}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Confirm Password"
                        secureTextEntry
                    />
                    <View style={{ height: 24 }} />
                    {resetting ? <ActivityIndicator /> : (
                        <>
                            <Button title="Reset Password" onPress={handleResetPassword} />
                            <View style={{ height: 8 }} />
                            <Button title="Cancel" onPress={() => setResetTarget(null)} />
                        </>
                    )}
                </View>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    <View style={{ width: 320, backgroundColor: '#fff', padding: 16, borderRadius: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>Confirm Delete</Text>
                        <Text style={{ marginBottom: 16 }}>Are you sure you want to delete {deleteTarget?.email}?</Text>
                        {deleting ? <ActivityIndicator /> : (
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                                <Button title="Cancel" onPress={() => setDeleteTarget(null)} />
                                <View style={{ width: 8 }} />
                                <Button title="Delete" color="#d00" onPress={confirmDelete} />
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    caption: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 16,
    },
    message: {
        padding: 8,
        backgroundColor: '#e8f5e9',
        borderRadius: 4,
        marginBottom: 12,
        textAlign: 'center',
    },
    emptyText: {
        textAlign: 'center',
        color: '#666',
        marginTop: 20,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
    userEmail: {
        fontSize: 16,
        fontWeight: '500',
    },
    userRoles: {
        fontSize: 12,
        color: '#666',
    },
    modalContainer: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
        marginTop: 12,
    },
    input: {
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        paddingHorizontal: 8,
    },
});
