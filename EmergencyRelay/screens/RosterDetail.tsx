import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet, Image, Switch, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { getRoster, addStudentToRoster, updateStudentInRoster, getStudentsServer, deleteStudentFromRoster, getUsersServer, assignRoster } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function RosterDetail({ rosterId, onClose }) {
    const { user, isAdmin } = useAuth();
    const [selectedRoster, setSelectedRoster] = useState(null);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [studentList, setStudentList] = useState([]);
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [staffList, setStaffList] = useState([]);
    const [showStaffModal, setShowStaffModal] = useState(false);

    useEffect(() => {
        if (rosterId) openRoster(rosterId);
    }, [rosterId]);

    async function openRoster(id) {
        setLoading(true);
        try {
            const r = await getRoster(id);
            setSelectedRoster(r);
            setStudents(r.students || []);
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

    return (
        <View style={styles.container}>
            <View style={{ padding: 8, flexDirection: 'row', alignItems: 'center' }}>
                {(isAdmin && isAdmin()) || (selectedRoster && user && selectedRoster.assignedTo === user.id) ? (
                    <>
                        <Button title="Add existing student" onPress={() => { loadStudents(); setShowStudentModal(true); }} />
                        <View style={{ width: 8 }} />
                        {(isAdmin && isAdmin()) ? (
                            <>
                                <Button title={selectedRoster && selectedRoster.assignedToEmail ? `Assigned: ${selectedRoster.assignedToEmail}` : 'Assign staff'} onPress={() => { loadStaff(); setShowStaffModal(true); }} />
                                <View style={{ width: 8 }} />
                            </>
                        ) : null}
                    </>
                ) : null}
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator />
                </View>
            ) : !selectedRoster ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: '#666' }}>Roster not found</Text>
                </View>
            ) : (
                <FlatList
                    data={students}
                    keyExtractor={item => item.id || item._id || `${item.name || item.firstName || ''}`}
                    renderItem={({ item }) => (
                        <View style={styles.row}>
                            {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.avatar} /> : <View style={[styles.avatar, { backgroundColor: '#eee' }]} />}
                            <Text style={{ flex: 1 }}>{item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim()}</Text>
                            <Switch value={!!item.accounted} onValueChange={(val) => toggleAccounted(item.id || item._id, val)} />
                            {((isAdmin && isAdmin()) || (selectedRoster && user && selectedRoster.assignedTo === user.id)) ? (
                                <Button title="Remove" color="#c00" onPress={() => handleRemoveStudent(item.id || item._id)} />
                            ) : null}
                        </View>
                    )}
                />
            )}

            <Modal visible={showStudentModal} animationType="slide" onRequestClose={() => setShowStudentModal(false)}>
                <View style={{ flex: 1, padding: 16 }}>
                    <Text style={{ fontSize: 18, marginBottom: 12 }}>Select student to add</Text>
                    <FlatList data={studentList} keyExtractor={i => i.id} renderItem={({ item }) => (
                        <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', alignItems: 'center' }} onPress={() => { handleAddExistingStudent(item); setShowStudentModal(false); }}>
                            {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} /> : <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee', marginRight: 12 }} />}
                            <Text style={{ fontSize: 16 }}>{item.firstName} {item.lastName}</Text>
                        </TouchableOpacity>
                    )} />
                    <Button title="Close" onPress={() => setShowStudentModal(false)} />
                </View>
            </Modal>

            <Modal visible={showStaffModal} animationType="slide" onRequestClose={() => setShowStaffModal(false)}>
                <View style={{ flex: 1, padding: 16 }}>
                    <Text style={{ fontSize: 18, marginBottom: 12 }}>Assign staff (select one or choose None)</Text>
                    <FlatList data={staffList} keyExtractor={i => i.id} renderItem={({ item }) => (
                        <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderColor: '#eee' }} onPress={async () => { try { await assignRoster(selectedRoster.id, { staffId: item.id }); setSelectedRoster({ ...selectedRoster, assignedTo: item.id, assignedToEmail: item.email }); setShowStaffModal(false); } catch (e) { Alert.alert('Error', 'Assign failed'); } }}>
                            <Text style={{ fontSize: 16 }}>{item.email}</Text>
                        </TouchableOpacity>
                    )} ListFooterComponent={() => (
                        <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderColor: '#eee' }} onPress={async () => { try { await assignRoster(selectedRoster.id, { clear: true }); setSelectedRoster({ ...selectedRoster, assignedTo: null, assignedToEmail: null }); setShowStaffModal(false); } catch (e) { Alert.alert('Error', 'Clear assign failed'); } }}>
                            <Text style={{ fontSize: 16 }}>None (unassign)</Text>
                        </TouchableOpacity>
                    )} />
                    <Button title="Close" onPress={() => setShowStaffModal(false)} />
                </View>
            </Modal>
            <View style={{alignItems: 'center', padding: 8 }}>
                <Text style={{ fontSize: 20 }}>{selectedRoster ? selectedRoster.name : 'Loading roster...'}</Text>
                {onClose ? <Button title="Close" onPress={onClose} /> : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    row: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingVertical: 8, 
        borderBottomWidth: 1, 
        borderColor: '#eee' 
    },
     avatar: { 
        width: 48, 
        height: 48, 
        borderRadius: 24, 
        marginRight: 12 
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 16,
    }
});
