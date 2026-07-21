import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image, Switch, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { getRoster, addStudentToRoster, updateStudentInRoster, getStudentsServer, deleteStudentFromRoster, getUsersServer, assignRoster, getUserLocationsServer, updateRoster } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, RADIUS } from '../constants/theme';
import AppButton from '../components/AppButton';

export default function RosterDetail({ rosterId, onClose }) {
    const { user, isAdmin } = useAuth();
    const [selectedRoster, setSelectedRoster] = useState(null);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [studentList, setStudentList] = useState([]);
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [staffList, setStaffList] = useState([]);
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [staffLocation, setStaffLocation] = useState<string | null>(null);
    const [staffAccounted, setStaffAccounted] = useState(false);

    useEffect(() => {
        if (rosterId) openRoster(rosterId);
    }, [rosterId]);

    async function openRoster(id) {
        setLoading(true);
        try {
            const r = await getRoster(id);
            setSelectedRoster(r);
            setStudents(r.students || []);
            setStaffAccounted(r.staffAccounted || false);

            // Fetch staff location if roster has assigned staff
            if (r.assignedTo) {
                try {
                    const locations = await getUserLocationsServer();
                    const staffUser = locations.find(u => u.id === r.assignedTo);
                    if (staffUser && staffUser.lastLocation && staffUser.lastLocation.room) {
                        setStaffLocation(staffUser.lastLocation.room);
                    } else {
                        setStaffLocation(null);
                    }
                } catch (locErr) {
                    console.error('Failed to fetch staff location', locErr);
                    setStaffLocation(null);
                }
            } else {
                setStaffLocation(null);
            }
        } catch (e) {
            console.error('Open roster failed', e);
            Alert.alert('Error', e && e.message ? e.message : 'Open roster failed');
        } finally {
            setLoading(false);
        }
    }

    async function loadStudents() {
        try {
            const rows = await getStudentsServer();
            setStudentList(rows || []);
        } catch (e) {
            console.error('Load students failed', e);
        }
    }

    async function loadStaff() {
        try {
            const rows = await getUsersServer();
            const staff = (rows || []).filter(u => Array.isArray(u.roles) ? u.roles.includes('staff') : true);
            setStaffList(staff);
        } catch (e) {
            console.error('Load staff failed', e);
        }
    }

    async function handleAddExistingStudent(item) {
        if (!selectedRoster) return Alert.alert('Error', 'No roster open');
        const amAdmin = isAdmin && isAdmin();
        const canAdd = amAdmin || (selectedRoster && user && selectedRoster.assignedTo === user.id);
        if (!canAdd) return Alert.alert('Forbidden', 'You are not permitted to add students to this roster');
        try {
            const name = `${item.firstName} ${item.lastName}`;
            const s = await addStudentToRoster(selectedRoster.id, { name, imageUrl: item.imageUrl || undefined });
            setStudents(prev => [...prev, s]);
            Alert.alert('Success', 'Student added to roster');
        } catch (e) {
            console.error('Add existing student failed', e);
            Alert.alert('Error', e && e.message ? e.message : 'Add failed');
        }
    }

    async function handleRemoveStudent(studentId) {
        if (!selectedRoster) return;
        const amAdmin = isAdmin && isAdmin();
        const canRemove = amAdmin || (selectedRoster && user && selectedRoster.assignedTo === user.id);
        if (!canRemove) return Alert.alert('Forbidden', 'You are not permitted to remove students from this roster');
        try {
            await deleteStudentFromRoster(selectedRoster.id, studentId);
            setStudents(prev => prev.filter(s => s.id !== studentId));
            Alert.alert('Removed', 'Student removed from roster');
        } catch (e) {
            console.error('Remove student failed', e);
            Alert.alert('Error', e && e.message ? e.message : 'Remove failed');
        }
    }

    async function toggleAccounted(studentId, value) {
        if (!selectedRoster) return;
        try {
            const updated = await updateStudentInRoster(selectedRoster.id, studentId, { accounted: value });
            setStudents(prev => prev.map(s => s.id === studentId ? updated : s));
        } catch (e) {
            console.error('Update student failed', e);
            Alert.alert('Error', e && e.message ? e.message : 'Update failed');
        }
    }

    async function toggleStaffAccounted(value: boolean) {
        if (!selectedRoster) return;
        try {
            await updateRoster(selectedRoster.id, { staffAccounted: value });
            setStaffAccounted(value);
        } catch (e) {
            console.error('Update staff accounted failed', e);
            Alert.alert('Error', e && e.message ? e.message : 'Update failed');
        }
    }

    // Render staff row at the top of the list
    const renderStaffHeader = () => {
        if (!selectedRoster || !selectedRoster.assignedTo) return null;
        return (
            <View style={styles.row}>
                {selectedRoster.staffImageUrl ? (
                    <Image source={{ uri: selectedRoster.staffImageUrl }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, { backgroundColor: COLORS.primary }]}>
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>S</Text>
                    </View>
                )}
                <View style={{ flex: 1 }}>
                    <Text style={styles.staffName}>{selectedRoster.assignedToEmail || 'Staff Member'}</Text>
                    <Text style={styles.staffLocation}>
                        Location: {staffLocation || 'Unknown'}
                    </Text>
                </View>
                <Switch value={staffAccounted} onValueChange={toggleStaffAccounted} trackColor={{ true: COLORS.primary }} />
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.actionsRow}>
                {(isAdmin && isAdmin()) || (selectedRoster && user && selectedRoster.assignedTo === user.id) ? (
                    <>
                        <AppButton title="Add existing student" size="small" variant="secondary" onPress={() => { loadStudents(); setShowStudentModal(true); }} />
                        {(isAdmin && isAdmin()) ? (
                            <AppButton title={selectedRoster && selectedRoster.assignedToEmail ? `Assigned: ${selectedRoster.assignedToEmail}` : 'Assign staff'} size="small" variant="secondary" onPress={() => { loadStaff(); setShowStaffModal(true); }} />
                        ) : null}
                    </>
                ) : null}
            </View>

            {loading ? (
                <View style={styles.centerFill}>
                    <ActivityIndicator />
                </View>
            ) : !selectedRoster ? (
                <View style={styles.centerFill}>
                    <Text style={{ color: COLORS.textSecondary }}>Roster not found</Text>
                </View>
            ) : (
                <FlatList
                    data={[...students].sort((a, b) => (a.name || `${a.firstName} ${a.lastName}`).localeCompare(b.name || `${b.firstName} ${b.lastName}`))}
                    keyExtractor={item => item.id || item._id || `${item.name || item.firstName || ''}`}
                    ListHeaderComponent={renderStaffHeader}
                    renderItem={({ item }) => (
                        <View style={styles.row}>
                            {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.avatar} /> : <View style={[styles.avatar, { backgroundColor: COLORS.secondarySoft }]} />}
                            <Text style={{ flex: 1, color: COLORS.textPrimary }}>{item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim()}</Text>
                            <Switch value={!!item.accounted} onValueChange={(val) => toggleAccounted(item.id || item._id, val)} trackColor={{ true: COLORS.primary }} />
                            {((isAdmin && isAdmin()) || (selectedRoster && user && selectedRoster.assignedTo === user.id)) ? (
                                <AppButton title="Remove" size="small" variant="danger" onPress={() => handleRemoveStudent(item.id || item._id)} style={{ marginLeft: 8 }} />
                            ) : null}
                        </View>
                    )}
                />
            )}

            <Modal visible={showStudentModal} animationType="slide" onRequestClose={() => setShowStudentModal(false)}>
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Select student to add</Text>
                    <FlatList data={[...studentList].sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))} keyExtractor={i => i.id} renderItem={({ item }) => (
                        <TouchableOpacity style={styles.modalRow} onPress={() => { handleAddExistingStudent(item); setShowStudentModal(false); }}>
                            {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.avatarSm} /> : <View style={[styles.avatarSm, { backgroundColor: COLORS.secondarySoft }]} />}
                            <Text style={{ fontSize: 16, color: COLORS.textPrimary }}>{item.firstName} {item.lastName}</Text>
                        </TouchableOpacity>
                    )} />
                    <AppButton title="Close" variant="outline" onPress={() => setShowStudentModal(false)} />
                </View>
            </Modal>

            <Modal visible={showStaffModal} animationType="slide" onRequestClose={() => setShowStaffModal(false)}>
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Assign staff (select one or choose None)</Text>
                    <FlatList data={[...staffList].sort((a, b) => (a.email || '').localeCompare(b.email || ''))} keyExtractor={i => i.id} renderItem={({ item }) => (
                        <TouchableOpacity style={styles.modalRow} onPress={async () => { try { await assignRoster(selectedRoster.id, { staffId: item.id }); setSelectedRoster({ ...selectedRoster, assignedTo: item.id, assignedToEmail: item.email }); setShowStaffModal(false); } catch (e) { Alert.alert('Error', 'Assign failed'); } }}>
                            <Text style={{ fontSize: 16, color: COLORS.textPrimary }}>{item.email}</Text>
                        </TouchableOpacity>
                    )} ListFooterComponent={() => (
                        <TouchableOpacity style={styles.modalRow} onPress={async () => { try { await assignRoster(selectedRoster.id, { clear: true }); setSelectedRoster({ ...selectedRoster, assignedTo: null, assignedToEmail: null }); setShowStaffModal(false); } catch (e) { Alert.alert('Error', 'Clear assign failed'); } }}>
                            <Text style={{ fontSize: 16, color: COLORS.textSecondary }}>None (unassign)</Text>
                        </TouchableOpacity>
                    )} />
                    <AppButton title="Close" variant="outline" onPress={() => setShowStaffModal(false)} />
                </View>
            </Modal>
            <View style={styles.footer}>
                <Text style={styles.footerTitle}>{selectedRoster ? selectedRoster.name : 'Loading roster...'}</Text>
                {onClose ? <AppButton title="Close" variant="outline" size="small" onPress={onClose} /> : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarSm: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    staffName: {
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    staffLocation: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: COLORS.background,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
        flexWrap: 'wrap',
    },
    centerFill: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        flex: 1,
        padding: 16,
        backgroundColor: COLORS.background,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
        color: COLORS.textPrimary,
    },
    modalRow: {
        padding: 12,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
    },
    footer: {
        alignItems: 'center',
        padding: 10,
        gap: 8,
    },
    footerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
});
