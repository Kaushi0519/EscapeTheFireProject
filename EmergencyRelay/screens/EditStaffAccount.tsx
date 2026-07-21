import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, Modal, ActivityIndicator, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { getUsersServer, updateUserServer, resetUserPasswordServer, deleteUserServer, getApiBaseUrl } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { COLORS, RADIUS, CARD_SHADOW } from '../constants/theme';
import PageHeader from '../components/PageHeader';
import TextField from '../components/TextField';
import AppButton from '../components/AppButton';

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
            <PageHeader eyebrow="ADMIN SETTINGS" title="Manage Staff Accounts" subtitle="Edit, reset password, or delete staff accounts" />

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
                                <AppButton title="Edit" size="small" variant="secondary" onPress={() => openEditModal(item)} />
                                <AppButton title="Reset" size="small" variant="secondary" onPress={() => openResetPasswordModal(item)} />
                                <AppButton title="Delete" size="small" variant="danger" onPress={() => handleDeleteUser(item)} />
                            </View>
                        </View>
                    )}
                />
            )}

            <View style={{ marginTop: 16, gap: 10 }}>
                <AppButton title="Refresh" variant="secondary" onPress={load} />
                <AppButton title="Back" variant="outline" onPress={handleCancel} />
            </View>

            {/* Edit Modal */}
            <Modal visible={!!editTarget} animationType="slide" onRequestClose={() => setEditTarget(null)}>
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Edit Account</Text>
                    <TextField
                        label="Email"
                        value={editEmail}
                        onChangeText={setEditEmail}
                        placeholder="Email"
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                    <AppButton title={editImageUri ? 'Change Photo' : 'Add Photo'} variant="secondary" onPress={pickImage} />
                    {editImageUri ? <Text style={styles.helperText}>Photo selected</Text> : null}
                    <View style={{ height: 16 }} />
                    {saving ? <ActivityIndicator /> : (
                        <>
                            <AppButton title="Save Changes" onPress={handleSaveEdit} />
                            <View style={{ height: 10 }} />
                            <AppButton title="Cancel" variant="outline" onPress={() => setEditTarget(null)} />
                        </>
                    )}
                </View>
            </Modal>

            {/* Password Reset Modal */}
            <Modal visible={!!resetTarget} animationType="slide" onRequestClose={() => setResetTarget(null)}>
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Reset Password</Text>
                    <Text style={styles.caption}>Resetting password for: {resetTarget?.email}</Text>
                    <View style={{ height: 8 }} />
                    <TextField
                        label="New Password"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="New Password"
                        secureTextEntry
                    />
                    <TextField
                        label="Confirm Password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Confirm Password"
                        secureTextEntry
                    />
                    <View style={{ height: 8 }} />
                    {resetting ? <ActivityIndicator /> : (
                        <>
                            <AppButton title="Reset Password" onPress={handleResetPassword} />
                            <View style={{ height: 10 }} />
                            <AppButton title="Cancel" variant="outline" onPress={() => setResetTarget(null)} />
                        </>
                    )}
                </View>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
                <View style={styles.confirmOverlay}>
                    <View style={styles.confirmBox}>
                        <Text style={styles.confirmTitle}>Confirm Delete</Text>
                        <Text style={styles.confirmBody}>Are you sure you want to delete {deleteTarget?.email}?</Text>
                        {deleting ? <ActivityIndicator /> : (
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                                <AppButton title="Cancel" size="small" variant="secondary" onPress={() => setDeleteTarget(null)} />
                                <AppButton title="Delete" size="small" variant="danger" onPress={confirmDelete} />
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
        backgroundColor: COLORS.background,
    },
    message: {
        padding: 10,
        backgroundColor: COLORS.primarySoft,
        color: COLORS.primaryDark,
        borderRadius: RADIUS.sm,
        marginBottom: 12,
        textAlign: 'center',
    },
    emptyText: {
        textAlign: 'center',
        color: COLORS.textSecondary,
        marginTop: 20,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        marginBottom: 10,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md,
        ...CARD_SHADOW,
    },
    userEmail: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    userRoles: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    modalContainer: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        backgroundColor: COLORS.background,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
        color: COLORS.textPrimary,
    },
    caption: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    helperText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 8,
    },
    confirmOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    confirmBox: {
        width: 320,
        backgroundColor: COLORS.surface,
        padding: 18,
        borderRadius: RADIUS.md,
    },
    confirmTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
        color: COLORS.textPrimary,
    },
    confirmBody: {
        marginBottom: 16,
        color: COLORS.textPrimary,
    },
});
