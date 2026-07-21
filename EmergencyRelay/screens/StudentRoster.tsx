/**
 * Developer Notes:
 * - This screen manages rosters and students with server-backed data.
 * - It supports loading rosters, viewing details, assigning staff, and updating students.
 * - Admin-only actions are controlled through AuthContext role checks.
 * - Keep API calls and modal flows in sync with current roster/students endpoints.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet, Image, Switch, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { listRosters, getRoster, updateStudentInRoster, createRoster, addStudentToRoster, assignRoster, getUsersServer, getStudentsServer, deleteRoster } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function StudentRoster() {
    const navigation = useNavigation();
    const { isAdmin, user } = useAuth();
    const amAdmin = isAdmin && isAdmin();
    const [rosters, setRosters] = useState([]);
    const [selectedRoster, setSelectedRoster] = useState(null);
    const [students, setStudents] = useState([]);
    // student-picker modal state (server-backed students list)
    const [studentList, setStudentList] = useState([]);
    const [studentLoading, setStudentLoading] = useState(false);
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [loading, setLoading] = useState(false);
        const [creating, setCreating] = useState(false);
        const [newRosterName, setNewRosterName] = useState('');
        const [assignEmail, setAssignEmail] = useState('');
    const [creatingRosterStaff, setCreatingRosterStaff] = useState(null);
        const [newStudentName, setNewStudentName] = useState('');
        const [newStudentImage, setNewStudentImage] = useState('');
        const [newGlobalStudentName, setNewGlobalStudentName] = useState('');
        const [newGlobalStudentImage, setNewGlobalStudentImage] = useState('');
        const [selectedRosterForStudent, setSelectedRosterForStudent] = useState(null);
    const [staffList, setStaffList] = useState([]);
    const [staffLoading, setStaffLoading] = useState(false);
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [staffSelectTarget, setStaffSelectTarget] = useState(null);
    const [selectedStaffForAssign, setSelectedStaffForAssign] = useState(null);
    const [selectedStudentsForCreate, setSelectedStudentsForCreate] = useState([]);
    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
    const [confirmDeleteTarget, setConfirmDeleteTarget] = useState(null);

    async function openStaffModal(target) {
        setStaffSelectTarget(target);
        try {
            if (!staffList || staffList.length === 0) {
                await loadStaff();
            }
        } catch (e) {
            // loadStaff shows its own error
        }
        // ensure student modal is closed before showing staff modal to avoid stacking issues
        setShowStudentModal(false);
        setShowStaffModal(true);
    }

    function toggleSelectedStudentForCreate(student) {
        setSelectedStudentsForCreate(prev => {
            const exists = prev.find(s => s.id === student.id);
            if (exists) return prev.filter(s => s.id !== student.id);
            return [...prev, student];
        });
    }

    useEffect(() => {
        loadRosters();
    }, []);

    async function loadRosters() {
        setLoading(true);
        try {
            const data = await listRosters();
            setRosters(data || []);
            if (amAdmin) loadStaff();
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
            Alert.alert('Error', 'Could not load staff list');
        } finally {
            setStaffLoading(false);
        }
    }

    async function loadStudents() {
        setStudentLoading(true);
        try {
            const rows = await getStudentsServer();
            setStudentList(rows || []);
        } catch (e) {
            console.error('Load students failed', e);
            Alert.alert('Error', 'Could not load students');
        } finally {
            setStudentLoading(false);
        }
    }

    async function openStudentModal() {
        setSelectedRoster(null); 
        setStudents([]);
        try {
            if (!studentList || studentList.length === 0) {
                await loadStudents();
            }
        } catch (e) {
            // loadStudents already alerts
        }
        // ensure staff modal is closed before showing student modal to avoid stacking issues
        setShowStaffModal(false);
        setShowStudentModal(true);
    }

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

    async function handleCreateRoster() {
        if (!newRosterName) return Alert.alert('Error', 'Roster name required');
        setCreating(true);
        try {
            const r = await createRoster({ name: newRosterName, assignedToEmail: creatingRosterStaff ? creatingRosterStaff.email : undefined });
            // if admin selected existing students to add, push them into the roster
            if (r && r.id && selectedStudentsForCreate && selectedStudentsForCreate.length > 0) {
                for (const s of selectedStudentsForCreate) {
                    const name = `${s.firstName} ${s.lastName}`;
                    try {
                        await addStudentToRoster(r.id, { name, imageUrl: s.imageUrl || undefined });
                    } catch (e) {
                        console.warn('Failed to add selected student to roster', e && e.message);
                    }
                }
            }
            setNewRosterName('');
            setAssignEmail('');
            setCreatingRosterStaff(null);
            setSelectedStudentsForCreate([]);
            await loadRosters();
            if (r && r.id) openRoster(r.id);
        } catch (e) {
            console.error('Create roster failed', e);
            Alert.alert('Error', e && e.message ? e.message : 'Create failed');
        } finally {
            setCreating(false);
        }
    }

    async function handleAssignRoster(rosterId) {
        const staff = selectedStaffForAssign;
        if (!staff) return Alert.alert('Error', 'Select a staff member to assign');
        try {
            await assignRoster(rosterId, { staffId: staff.id, staffEmail: staff.email });
            setSelectedStaffForAssign(null);
            await loadRosters();
        } catch (e) {
            console.error('Assign failed', e);
            Alert.alert('Error', e && e.message ? e.message : 'Assign failed');
        }
    }

    function confirmDeleteRoster(id, name) {
        // ensure other modals are closed so the confirm modal is visible
        setShowStaffModal(false);
        setShowStudentModal(false);
        setConfirmDeleteTarget({ id, name });
        setShowConfirmDeleteModal(true);
    }

    async function handleDeleteRoster(id) {
        try {
            await deleteRoster(id);
            // if currently open, close it
            if (selectedRoster && (selectedRoster.id === id || selectedRoster._id === id)) {
                setSelectedRoster(null);
                setStudents([]);
            }
            await loadRosters();
            Alert.alert('Deleted', 'Roster deleted');
        } catch (e) {
            console.error('Delete roster failed', e);
            Alert.alert('Error', e && e.message ? e.message : 'Delete failed');
        }
    }

    async function handleAddStudent() {
        if (!selectedRoster) return;
        if (!newStudentName) return Alert.alert('Error', 'Student name required');
        try {
            const s = await addStudentToRoster(selectedRoster.id, { name: newStudentName, imageUrl: newStudentImage || undefined });
            setNewStudentName('');
            setNewStudentImage('');
            setStudents(prev => [...prev, s]);
        } catch (e) {
            console.error('Add student failed', e);
            Alert.alert('Error', e && e.message ? e.message : 'Add failed');
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

    if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator /></View>;

    if (selectedRoster) {
        return (
            <View style={{ flex: 1, padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ fontSize: 20 }}>{selectedRoster.name}</Text>
                    {amAdmin ? <Button title="Delete Roster" color="#c00" onPress={() => confirmDeleteRoster(selectedRoster.id || selectedRoster._id, selectedRoster.name)} /> : null}
                </View>
                                { (amAdmin) || (selectedRoster.assignedTo == null) ? (
                                        <View style={{ marginBottom: 8 }}>
                                            <Text style={{ fontSize: 12, color: '#666' }}>Assign to staff:</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                                <Button title={selectedStaffForAssign ? `Staff: ${selectedStaffForAssign.email}` : 'Select staff'} onPress={() => openStaffModal('assignRoster')} />
                                                <View style={{ width: 8 }} />
                                                <Button title="Assign" onPress={() => handleAssignRoster(selectedRoster.id)} />
                                            </View>
                                        </View>
                                    ) : null }
                    { ((amAdmin) || (selectedRoster.assignedTo == null) || (selectedRoster.assignedTo === user?.id)) ? (
                                    <View style={{ marginBottom: 8 }}>
                                        <Text style={{ fontSize: 12, color: '#666' }}>Add student:</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <View style={{ flex: 1, marginRight: 8 }}>
                                                <Button title="Add New Student(s) to Class" onPress={openStudentModal} />
                                            </View>
                                        </View>
                                    </View>
                    ) : null }
                <FlatList
                    data={students}
                    style={{ flex: 1 }}
                    keyExtractor={item => item.id || item._id || `${(item.firstName || '')}-${(item.lastName || '')}-${(item.name || '')}`}
                    renderItem={({ item }) => (
                        <View style={styles.row}>
                            {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.avatar} /> : <View style={[styles.avatar, { backgroundColor: '#eee' }]} />}
                            <Text style={{ flex: 1 }}>{item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim()}</Text>
                            <Switch value={!!item.accounted} onValueChange={(val) => toggleAccounted(item.id || item._id, val)} />
                        </View>
                    )}
                />
                <Button title="Back to Rosters" onPress={() => { setSelectedRoster(null); setStudents([]); }} />
            </View>
        );
    }
    return (
        <View style={{ flex: 1, padding: 16 }}>
            <Text style={{ fontSize: 20, marginVertical: 12 }}>Rosters</Text>
            <Button title="Refresh List" onPress={loadRosters} />

            {/* Admin bar: create roster with name, staff assign, and select existing students */}
            {amAdmin ? (
                <View style={{ marginVertical: 12, padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 6, backgroundColor: '#fafafa' }}>
                    <Text style={{ fontSize: 16, marginBottom: 8 }}>Create new roster</Text>
                    <TextInput value={newRosterName} onChangeText={setNewRosterName} placeholder="Roster name" style={{ borderWidth: 1, borderColor: '#ddd', padding: 8, marginBottom: 8 }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Button title={creatingRosterStaff ? `Assign: ${creatingRosterStaff.email}` : 'Select staff (optional)'} onPress={() => openStaffModal('createRoster')} />
                        <View style={{ width: 8 }} />
                        <Button title={selectedStudentsForCreate.length > 0 ? `Students: ${selectedStudentsForCreate.length}` : 'Select students (optional)'} onPress={() => openStudentModal()} />
                        <View style={{ width: 8 }} />
                        <Button title={creating ? 'Creating...' : 'Create Roster'} onPress={async () => {
                            if (creatingRosterStaff) {
                                if (!staffList || staffList.length === 0) await loadStaff();
                                const found = (staffList || []).find(s => s.email && s.email.toLowerCase() === creatingRosterStaff.email.toLowerCase());
                                if (!found) return Alert.alert('Error', 'No staff member found with that email');
                            }
                            try {
                                await handleCreateRoster();
                                Alert.alert('Success', 'Roster created');
                            } catch (e) {
                                // handleCreateRoster already alerts
                            }
                        }} />
                    </View>
                    {/* show selected students */}
                    {selectedStudentsForCreate.length > 0 ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                            {selectedStudentsForCreate.map(s => (
                                <View key={s.id} style={{ padding: 6, backgroundColor: '#eef', borderRadius: 12, marginRight: 8, marginBottom: 8 }}>
                                    <Text>{s.firstName} {s.lastName}</Text>
                                </View>
                            ))}
                        </View>
                    ) : null}
                </View>
            ) : null}

            {/* For staff: show their assigned roster(s) in full at the top; staff still see all rosters below */}
            {!amAdmin ? (
                <View style={{ marginBottom: 12, padding: 8, borderWidth: 1, borderColor: '#eee', borderRadius: 6 }}>
                    <Text style={{ fontSize: 16, marginBottom: 8 }}>Your Class</Text>
                    {(() => {
                        const assigned = (rosters || []).filter(r => r.assignedTo && user && r.assignedTo === user.id);
                        if (!assigned || assigned.length === 0) return <Text style={{ color: '#666', marginVertical: 8 }}>No classes assigned to you</Text>;
                        return assigned.map(r => (
                            <TouchableOpacity key={r.id} onPress={() => openRoster(r.id)} style={{ padding: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' }}>
                                <Text style={{ fontSize: 16 }}>{r.name}{r.assignedToEmail ? ` - ${r.assignedToEmail}` : ''}</Text>
                            </TouchableOpacity>
                        ));
                    })()}
                </View>
            ) : null}

            {/* All rosters list (for admin shows all; for staff may be limited by server) */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }}>
                <Text style={{ fontSize: 16, marginBottom: 8 }}>Classes</Text>
                {rosters.length === 0 ? <Text style={{ color: '#666', marginVertical: 8 }}>No classes</Text> : null}
                {rosters.map(item => (
                    <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#eee' }}>
                        <TouchableOpacity style={[styles.rosterRow, { flex: 1, padding: 8, backgroundColor: '#fff' }]} onPress={() => openRoster(item.id)}>
                            <Text style={{ fontSize: 16 }}>{item.name} {item.assignedToEmail ? `- ${item.assignedToEmail}` : ''}</Text>
                        </TouchableOpacity>
                        {amAdmin ? <Button title="Delete" color="#c00" onPress={() => confirmDeleteRoster(item.id, item.name)} /> : null}
                    </View>
                ))}
            </ScrollView>

            {/* Staff selection modal */}
            <Modal visible={showStaffModal} animationType="slide" onRequestClose={() => setShowStaffModal(false)}>
                <View style={{ flex: 1, padding: 16 }}>
                    <Text style={{ fontSize: 18, marginBottom: 12 }}>Select staff</Text>
                    {staffLoading ? <ActivityIndicator /> : (
                        <FlatList
                            data={staffList}
                            keyExtractor={i => i.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderColor: '#eee' }} onPress={() => {
                                    if (staffSelectTarget === 'assignRoster') setSelectedStaffForAssign(item);
                                    if (staffSelectTarget === 'createRoster') setCreatingRosterStaff(item);
                                    setShowStaffModal(false);
                                }}>
                                    <Text style={{ fontSize: 16 }}>{item.email}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    )}
                    <View style={{ height: 12 }} />
                    <Button title="Close" onPress={() => setShowStaffModal(false)} />
                </View>
            </Modal>

            {/* Student modal reused for both single-add and multi-select */}
            <Modal visible={showStudentModal} animationType="slide" onRequestClose={() => setShowStudentModal(false)}>
                <View style={{ flex: 1, padding: 16 }}>
                    <Text style={{ fontSize: 18, marginBottom: 12 }}>Select student</Text>
                    {studentLoading ? <ActivityIndicator /> : (
                        <FlatList
                            data={studentList}
                            keyExtractor={i => i.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', alignItems: 'center' }} onPress={async () => {
                                    if (amAdmin) {
                                        // toggle multi-select for admin create flow
                                        toggleSelectedStudentForCreate(item);
                                    } else {
                                        // when selecting an existing student as staff (from within roster add flow)
                                        if (!selectedRoster) return Alert.alert('Error', 'No roster open');
                                        try {
                                            const name = `${item.firstName} ${item.lastName}`;
                                            const s = await addStudentToRoster(selectedRoster.id, { name, imageUrl: item.imageUrl || undefined });
                                            setStudents(prev => [...prev, s]);
                                            setShowStudentModal(false);
                                            Alert.alert('Success', 'Student added to roster');
                                        } catch (e) {
                                            console.error('Add existing student failed', e);
                                            Alert.alert('Error', e && e.message ? e.message : 'Add failed');
                                        }
                                    }
                                }}>
                                    {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} /> : <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee', marginRight: 12 }} />}
                                    <Text style={{ fontSize: 16, flex: 1 }}>{item.firstName} {item.lastName}</Text>
                                    {amAdmin ? (
                                        <Text style={{ color: selectedStudentsForCreate.find(s => s.id === item.id) ? '#06c' : '#999' }}>{selectedStudentsForCreate.find(s => s.id === item.id) ? 'Selected' : 'Tap to select'}</Text>
                                    ) : null}
                                </TouchableOpacity>
                            )}
                        />
                    )}
                    <View style={{ height: 12 }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Button title="Done" onPress={async () => {
                            setShowStudentModal(false);
                            // If a roster is currently open, refresh it so newly-added students appear
                            try {
                                if (selectedRoster && selectedRoster.id) {
                                    await openRoster(selectedRoster.id);
                                }
                            } catch (e) {
                                // openRoster will alert on error; swallow here to avoid double alerts
                            }
                        }} />
                        {amAdmin ? <Button title="Clear selection" onPress={() => setSelectedStudentsForCreate([])} /> : null}
                    </View>
                </View>
            </Modal>
            {/* In-component confirm delete modal (reliable inside app UI) */}
            <Modal visible={showConfirmDeleteModal} transparent animationType="fade" onRequestClose={() => setShowConfirmDeleteModal(false)}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    <View style={{ width: '90%', backgroundColor: '#fff', padding: 16, borderRadius: 8 }}>
                        <Text style={{ fontSize: 18, marginBottom: 12 }}>Delete roster</Text>
                        <Text style={{ marginBottom: 12 }}>Are you sure you want to delete roster "{confirmDeleteTarget ? confirmDeleteTarget.name : ''}"? This cannot be undone.</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                            <Button title="Cancel" onPress={() => { setShowConfirmDeleteModal(false); setConfirmDeleteTarget(null); }} />
                            <View style={{ width: 12 }} />
                            <Button title="Delete" color="#c00" onPress={async () => {
                                setShowConfirmDeleteModal(false);
                                const id = confirmDeleteTarget && confirmDeleteTarget.id;
                                setConfirmDeleteTarget(null);
                                if (id) await handleDeleteRoster(id);
                            }} />
                        </View>
                    </View>
                </View>
            </Modal>
            <Button title="Back" onPress={() => navigation.goBack()} />
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#eee' },
    avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
    rosterRow: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' }
});