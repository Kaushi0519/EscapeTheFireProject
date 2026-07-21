import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, Modal, ActivityIndicator, Image, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { getStudentsServer, updateStudentServer, deleteStudentServer, getApiBaseUrl } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { COLORS, RADIUS, CARD_SHADOW } from '../constants/theme';
import PageHeader from '../components/PageHeader';
import TextField from '../components/TextField';
import AppButton from '../components/AppButton';

export default function EditStudentID() {
    const { user, loading: authLoading, isAdmin } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [lastMessage, setLastMessage] = useState('');
    const navigation = useNavigation();

    // Edit modal state
    const [editTarget, setEditTarget] = useState<any>(null);
    const [editFirstName, setEditFirstName] = useState('');
    const [editLastName, setEditLastName] = useState('');
    const [editImageUri, setEditImageUri] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

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
            const data = await getStudentsServer(getApiBaseUrl());
            setStudents(data || []);
        } catch (e) {
            console.error('Load students failed', e);
            const msg = e && e.message ? e.message : 'Load students failed';
            setLastMessage(`Load error: ${msg}`);
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    }

    function openEditModal(item: any) {
        setEditTarget(item);
        setEditFirstName(item.firstName || '');
        setEditLastName(item.lastName || '');
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
        if (!editFirstName.trim() || !editLastName.trim()) {
            Alert.alert('Error', 'First and last name are required');
            return;
        }
        setSaving(true);
        try {
            await updateStudentServer(editTarget.id, {
                firstName: editFirstName.trim(),
                lastName: editLastName.trim(),
                imageUrl: editImageUri || undefined,
            }, getApiBaseUrl());
            setLastMessage('Student updated successfully');
            setEditTarget(null);
            Alert.alert('Success', 'Student updated');
            load();
        } catch (e) {
            console.error('Update failed', e);
            const msg = e && e.message ? e.message : 'Update failed';
            Alert.alert('Error', msg);
        } finally {
            setSaving(false);
        }
    }

    function handleDeleteStudent(item: any) {
        setDeleteTarget(item);
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const name = `${deleteTarget.firstName} ${deleteTarget.lastName}`;
            await deleteStudentServer(deleteTarget.id, getApiBaseUrl());
            setLastMessage(`${name} has been deleted`);
            if (Platform.OS === 'web') {
                window.alert(`${name} has been deleted`);
            } else {
                Alert.alert('Deleted', `${name} has been deleted`);
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
            <PageHeader eyebrow="ADMIN SETTINGS" title="Manage Student IDs" subtitle="Edit or delete student information" />

            {lastMessage ? <Text style={styles.message}>{lastMessage}</Text> : null}

            {loading ? (
                <ActivityIndicator size="large" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={[...students].sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))}
                    keyExtractor={item => item.id}
                    style={{ flex: 1, width: '100%' }}
                    ListEmptyComponent={<Text style={styles.emptyText}>No students found</Text>}
                    renderItem={({ item }) => (
                        <View style={styles.studentRow}>
                            {item.imageUrl ? (
                                <Image source={{ uri: item.imageUrl }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, styles.avatarFallback]}>
                                    <Text style={{ color: COLORS.textSecondary }}>{(item.firstName || '?')[0]}</Text>
                                </View>
                            )}
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.studentName}>{item.firstName} {item.lastName}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <AppButton title="Edit" size="small" variant="secondary" onPress={() => openEditModal(item)} />
                                <AppButton title="Delete" size="small" variant="danger" onPress={() => handleDeleteStudent(item)} />
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
                    <Text style={styles.modalTitle}>Edit Student</Text>
                    <TextField label="First Name" value={editFirstName} onChangeText={setEditFirstName} placeholder="First Name" />
                    <TextField label="Last Name" value={editLastName} onChangeText={setEditLastName} placeholder="Last Name" />
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

            {/* Delete Confirmation Modal */}
            <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
                <View style={styles.confirmOverlay}>
                    <View style={styles.confirmBox}>
                        <Text style={styles.confirmTitle}>Confirm Delete</Text>
                        <Text style={styles.confirmBody}>Are you sure you want to delete {deleteTarget?.firstName} {deleteTarget?.lastName}?</Text>
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
    studentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        marginBottom: 10,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md,
        ...CARD_SHADOW,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarFallback: {
        backgroundColor: COLORS.secondarySoft,
        justifyContent: 'center',
        alignItems: 'center',
    },
    studentName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
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
