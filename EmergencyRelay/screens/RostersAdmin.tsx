import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet, Image, Switch, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { listRosters, createRoster, addStudentToRoster, getUsersServer, getStudentsServer, deleteRoster } from '../services/api';
import RosterDetail from './RosterDetail';
import { useAuth } from '../contexts/AuthContext';

export default function RostersAdmin() {
    const navigation = useNavigation();
    const { isAdmin } = useAuth();
    const amAdmin = isAdmin && isAdmin();
    // admin-only screen: requires admin
    const [rosters, setRosters] = useState([]);
    const [selectedRoster, setSelectedRoster] = useState(null);
    const [selectedRosterId, setSelectedRosterId] = useState(null);
    const [studentList, setStudentList] = useState([]);
    const [studentLoading, setStudentLoading] = useState(false);
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newRosterName, setNewRosterName] = useState('');
    const [creatingRosterStaff, setCreatingRosterStaff] = useState(null);
    const [staffList, setStaffList] = useState([]);
    const [staffLoading, setStaffLoading] = useState(false);
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [staffSelectTarget, setStaffSelectTarget] = useState(null);
    const [selectedStaffForAssign, setSelectedStaffForAssign] = useState(null);
    const [selectedStudentsForCreate, setSelectedStudentsForCreate] = useState([]);
    const [error, setError] = useState(null);
    const [showBackButton, setShowBackButton] = useState(true);

    function toggleSelectedStudentForCreate(student) {
        setSelectedStudentsForCreate(prev => {
            const exists = prev.find(s => s.id === student.id);
            if (exists) return prev.filter(s => s.id !== student.id);
            return [...prev, student];
        });
    }
    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
    const [confirmDeleteTarget, setConfirmDeleteTarget] = useState(null);

    useEffect(() => { loadRosters(); }, []);

    async function loadRosters() {
        setLoading(true);
        try {
            const data = await listRosters();
            setRosters(data || []);
            loadStaff();
        } catch (e) {
            console.error('Load rosters failed', e);
            Alert.alert('Error', e && e.message ? e.message : 'Load rosters failed');
        } finally {
            setLoading(false);
        }
    }

    async function loadStaff() {
        setStaffLoading(true);
        try {
            const users = await getUsersServer();
            const staff = (users || []).filter(u => Array.isArray(u.roles) ? u.roles.includes('staff') : true);
            setStaffList(staff);
        } catch (e) {
            console.error('Load staff failed', e);
        } finally { setStaffLoading(false); }
    }

    async function loadStudents() {
        setStudentLoading(true);
        try { const rows = await getStudentsServer(); setStudentList(rows || []); } catch (e) { console.error(e); } finally { setStudentLoading(false); }
    }

    function openRoster(id) {
        setSelectedRosterId(id);
        setShowBackButton(false);
    }

    async function handleCreateRoster() {
        if (!newRosterName || newRosterName.trim() === '') {
            setError('Error: Please input a name for your class roster');
            console.log('Validation failed: roster name is empty');
            return;
        } else if (rosters.find(roster => roster.name.trim().toLowerCase() === newRosterName.trim().toLowerCase())) {
            setError('Error: A roster with this name already exists. Please choose a different name.');
            console.log('Validation failed: roster name already exists');
            return;
        }
        setError(null);
        setCreating(true);
        try {
            const r = await createRoster({ name: newRosterName, assignedToEmail: creatingRosterStaff ? creatingRosterStaff.email : undefined });
            if (r && r.id && selectedStudentsForCreate.length > 0) {
                for (const s of selectedStudentsForCreate) {
                    const name = `${s.firstName} ${s.lastName}`;
                    try { await addStudentToRoster(r.id, { name, imageUrl: s.imageUrl || undefined }); } catch (e) { console.warn(e); }
                }
            }
            setNewRosterName(''); setCreatingRosterStaff(null); setSelectedStudentsForCreate([]);
            await loadRosters(); if (r && r.id) openRoster(r.id);
        } catch (e) { Alert.alert('Error', 'Create failed'); } finally { setCreating(false); }
    }

    function openStaffModal(target) { setStaffSelectTarget(target); if (!staffList || staffList.length === 0) loadStaff(); setShowStudentModal(false); setShowStaffModal(true); }
    function openStudentModal() { if (!studentList || studentList.length === 0) loadStudents(); setShowStaffModal(false); setShowStudentModal(true); }

    function confirmDeleteRoster(id, name) { setShowStaffModal(false); setShowStudentModal(false); setConfirmDeleteTarget({ id, name }); setShowConfirmDeleteModal(true); }

    async function handleDeleteRoster(id) { try { await deleteRoster(id); await loadRosters(); Alert.alert('Deleted', 'Roster deleted'); } catch (e) { Alert.alert('Error', 'Delete failed'); } }
    // Student updates handled in RosterDetail

    if (!amAdmin) return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>Unauthorized</Text></View>;
    if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator /></View>;

    return (
        <View style={{ flex: 1, padding: 16 }}>
            <Text style={{ fontSize: 20, marginBottom: 12 }}>Rosters (Admin)</Text>
            <Button title="Refresh" onPress={loadRosters} />

            <View style={styles.rosterBox}>
                <Text style={styles.RosterTitle}>Create new Class</Text>
                <TextInput value={newRosterName} onChangeText={setNewRosterName} placeholder="Class name" style={{ borderWidth: 1, borderColor: '#ddd', padding: 8, marginBottom: 8 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Button title={creatingRosterStaff ? `Assign: ${creatingRosterStaff.email}` : 'Select staff (optional)'} onPress={() => openStaffModal('createRoster')} />
                    <View style={{ width: 8 }} />
                    <Button title={selectedStudentsForCreate.length > 0 ? `Students: ${selectedStudentsForCreate.length}` : 'Select students (optional)'} onPress={() => openStudentModal()} />
                    <View style={{ width: 8 }} />
                    <Button title={creating ? 'Creating...' : 'Create Roster'} onPress={handleCreateRoster} />
                    <Text style={{ color: '#c00', marginLeft: 12 }}>{error}</Text>
                </View>
            </View>

            <ScrollView style={styles.rosterBox} contentContainerStyle={{ paddingBottom: 80 }}>
                <Text style={styles.RosterTitle}>All Rosters</Text>
                {rosters.length === 0 ? <Text style={{ color: '#666' }}>No rosters</Text> : null}
                {rosters.map(item => (
                    <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#eee' }}>
                        <TouchableOpacity style={[styles.rosterRow, { flex: 1, padding: 8, backgroundColor: '#fff' }]} onPress={() => openRoster(item.id)}>
                            <Text style={styles.RosterText}>Class: {item.name}</Text>
                            <Text style={styles.RosterText}>Staff: {item.assignedToEmail ? `${item.assignedToEmail}` : ''}</Text>
                        </TouchableOpacity>
                        <Button title="Delete" color="#c00" onPress={() => confirmDeleteRoster(item.id, item.name)} />
                    </View>
                ))}
            </ScrollView>

            {selectedRosterId ? (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff' }}>
                    <RosterDetail rosterId={selectedRosterId} onClose={() => { setSelectedRosterId(null); loadRosters(); setShowBackButton(true); }} />
                </View>
            ) : null}

            {/* Modals: staff and student and confirm delete (reuse patterns) */}
            <Modal visible={showStaffModal} animationType="slide" onRequestClose={() => { setShowStaffModal(false); setShowBackButton(false); }}>
                <View style={{ flex: 1, padding: 16 }}>
                    <Text style={{ fontSize: 18, marginBottom: 12 }}>Select staff</Text>
                    {staffLoading ? <ActivityIndicator /> : (
                        <FlatList data={staffList} keyExtractor={i => i.id} renderItem={({ item }) => (
                            <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderColor: '#eee' }} onPress={() => { if (staffSelectTarget === 'assignRoster') setSelectedStaffForAssign(item); if (staffSelectTarget === 'createRoster') setCreatingRosterStaff(item); setShowStaffModal(false); }}>
                                <Text style={{ fontSize: 16 }}>{item.email}</Text>
                            </TouchableOpacity>
                        )} />
                    )}
                    <Button title="Close" onPress={() => { setShowStaffModal(false); setShowBackButton(true); }} />
                </View>
            </Modal>

            <Modal visible={showStudentModal} animationType="slide" onRequestClose={() => { setShowStudentModal(false); setShowBackButton(false); }}>
                <View style={{ flex: 1, padding: 16 }}>
                    <Text style={{ fontSize: 18, marginBottom: 12 }}>Select student</Text>
                    {studentLoading ? <ActivityIndicator /> : (
                        <FlatList data={studentList} keyExtractor={i => i.id} renderItem={({ item }) => (
                            <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', alignItems: 'center' }} onPress={() => toggleSelectedStudentForCreate(item)}>
                                {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} /> : <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee', marginRight: 12 }} />}
                                <Text style={{ fontSize: 16, flex: 1 }}>{item.firstName} {item.lastName}</Text>
                                <Text style={{ color: selectedStudentsForCreate.find(s => s.id === item.id) ? '#06c' : '#999' }}>{selectedStudentsForCreate.find(s => s.id === item.id) ? 'Selected' : 'Tap to select'}</Text>
                            </TouchableOpacity>
                        )} />
                    )}
                    <View style={{ height: 12 }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Button title="Done" onPress={() => { setShowStudentModal(false); setShowBackButton(true); }} />
                        <Button title="Clear selection" onPress={() => setSelectedStudentsForCreate([])} />
                    </View>
                </View>
            </Modal>

            <Modal visible={showConfirmDeleteModal} transparent animationType="fade" onRequestClose={() => setShowConfirmDeleteModal(false)}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    <View style={{ width: '90%', backgroundColor: '#fff', padding: 16, borderRadius: 8 }}>
                        <Text style={{ fontSize: 18, marginBottom: 12 }}>Delete roster</Text>
                        <Text style={{ marginBottom: 12 }}>Are you sure you want to delete roster "{confirmDeleteTarget ? confirmDeleteTarget.name : ''}"? This cannot be undone.</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                            <Button title="Cancel" onPress={() => { setShowConfirmDeleteModal(false); setConfirmDeleteTarget(null); }} />
                            <View style={{ width: 12 }} />
                            <Button title="Delete" color="#c00" onPress={async () => { setShowConfirmDeleteModal(false); const id = confirmDeleteTarget && confirmDeleteTarget.id; setConfirmDeleteTarget(null); if (id) await handleDeleteRoster(id); }} />
                        </View>
                    </View>
                </View>
            </Modal>
            {showBackButton && <Button title="Back" onPress={() => navigation.goBack()} />}
        </View>
    );
}

const styles = StyleSheet.create({
    // fix formatting
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
    rosterRow: { 
        paddingVertical: 12, 
        borderBottomWidth: 1, 
        borderColor: '#eee' 
    },
        RosterTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    RosterText: {
        marginTop: 4,
        fontSize: 16,
        marginBottom: 4,
    },
    rosterBox: {
        marginVertical: 12, 
        padding: 12, 
        borderWidth: 1, 
        borderColor: '#eee', 
        borderRadius: 6, 
        backgroundColor: '#fafafa'
    }
});
