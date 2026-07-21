import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { listRosters, createRoster, addStudentToRoster, getUsersServer, getStudentsServer, deleteRoster, getAllClearStatus } from '../services/api';
import RosterDetail from './RosterDetail';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, RADIUS } from '../constants/theme';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import TextField from '../components/TextField';
import AppButton from '../components/AppButton';

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
    const [allClearStatus, setAllClearStatus] = useState<{allClear: boolean; totalRosters: number; accountedRosters: number; rosterStatuses: Array<{id: string; totalStudents: number; accountedStudents: number; hasStaff: boolean; staffAccounted: boolean}>} | null>(null);

    // Helper to get status for a specific roster
    function getRosterStatus(rosterId: string) {
        if (!allClearStatus || !allClearStatus.rosterStatuses) return null;
        return allClearStatus.rosterStatuses.find(s => s.id === rosterId);
    }

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
            // Fetch all clear status
            try {
                const clearStatus = await getAllClearStatus();
                setAllClearStatus(clearStatus);
            } catch (e) {
                console.error('Load all clear status failed', e);
            }
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
        <View style={{ flex: 1, padding: 16, backgroundColor: COLORS.background }}>
            <PageHeader eyebrow="ADMIN" title="Rosters" />
            <AppButton title="Refresh" variant="secondary" onPress={loadRosters} />

            {/* All Clear Status Indicator */}
            {allClearStatus && (
                <View style={{
                    backgroundColor: allClearStatus.allClear ? COLORS.success : COLORS.danger,
                    padding: 12,
                    borderRadius: RADIUS.md,
                    marginVertical: 10,
                    alignItems: 'center'
                }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                        {allClearStatus.allClear ? '✓ ALL CLEAR' : '⚠ NOT ALL CLEAR'}
                    </Text>
                    <Text style={{ color: '#fff', fontSize: 12, marginTop: 4 }}>
                        {allClearStatus.accountedRosters} / {allClearStatus.totalRosters} rosters fully accounted
                    </Text>
                </View>
            )}

            <Card title="Create new Class">
                <TextField value={newRosterName} onChangeText={setNewRosterName} placeholder="Class name" />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                    <AppButton size="small" variant="secondary" title={creatingRosterStaff ? `Assign: ${creatingRosterStaff.email}` : 'Select staff'} onPress={() => openStaffModal('createRoster')} />
                    <AppButton size="small" variant="secondary" title={selectedStudentsForCreate.length > 0 ? `Students: ${selectedStudentsForCreate.length}` : 'Select students'} onPress={() => openStudentModal()} />
                    <AppButton size="small" title={creating ? 'Creating...' : 'Create Roster'} onPress={handleCreateRoster} />
                </View>
                {error ? <Text style={{ color: COLORS.danger, marginBottom: 8 }}>{error}</Text> : null}
            </Card>

            <Card title="All Rosters" style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
                    {rosters.length === 0 ? <Text style={{ color: COLORS.textSecondary }}>No rosters</Text> : null}
                    {[...rosters].sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(item => {
                        const status = getRosterStatus(item.id);
                        const studentsAllClear = status ? status.accountedStudents === status.totalStudents : false;
                        const staffClear = status ? (!status.hasStaff || status.staffAccounted) : false;
                        return (
                            <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: COLORS.border }}>
                                <TouchableOpacity style={{ flex: 1, paddingVertical: 10 }} onPress={() => openRoster(item.id)}>
                                    <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>Class: {item.name}</Text>
                                    <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>Staff: {item.assignedToEmail ? `${item.assignedToEmail}` : ''}</Text>
                                    {status && (
                                        <View style={{ flexDirection: 'row', marginTop: 4 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                                                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: staffClear ? COLORS.success : COLORS.danger, marginRight: 4 }} />
                                                <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>Staff</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: studentsAllClear ? COLORS.success : COLORS.danger, marginRight: 4 }} />
                                                <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>Students ({status.accountedStudents}/{status.totalStudents})</Text>
                                            </View>
                                        </View>
                                    )}
                                </TouchableOpacity>
                                <AppButton title="Delete" size="small" variant="danger" onPress={() => confirmDeleteRoster(item.id, item.name)} />
                            </View>
                        );
                    })}
                </ScrollView>
            </Card>

            {selectedRosterId ? (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: COLORS.background }}>
                    <RosterDetail rosterId={selectedRosterId} onClose={() => { setSelectedRosterId(null); loadRosters(); setShowBackButton(true); }} />
                </View>
            ) : null}

            {/* Modals: staff and student and confirm delete (reuse patterns) */}
            <Modal visible={showStaffModal} animationType="slide" onRequestClose={() => { setShowStaffModal(false); setShowBackButton(false); }}>
                <View style={{ flex: 1, padding: 16, backgroundColor: COLORS.background }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12, color: COLORS.textPrimary }}>Select staff</Text>
                    {staffLoading ? <ActivityIndicator /> : (
                        <FlatList data={[...staffList].sort((a, b) => (a.email || '').localeCompare(b.email || ''))} keyExtractor={i => i.id} renderItem={({ item }) => (
                            <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderColor: COLORS.border }} onPress={() => { if (staffSelectTarget === 'assignRoster') setSelectedStaffForAssign(item); if (staffSelectTarget === 'createRoster') setCreatingRosterStaff(item); setShowStaffModal(false); }}>
                                <Text style={{ fontSize: 16, color: COLORS.textPrimary }}>{item.email}</Text>
                            </TouchableOpacity>
                        )} />
                    )}
                    <AppButton title="Close" variant="outline" onPress={() => { setShowStaffModal(false); setShowBackButton(true); }} />
                </View>
            </Modal>

            <Modal visible={showStudentModal} animationType="slide" onRequestClose={() => { setShowStudentModal(false); setShowBackButton(false); }}>
                <View style={{ flex: 1, padding: 16, backgroundColor: COLORS.background }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12, color: COLORS.textPrimary }}>Select student</Text>
                    {studentLoading ? <ActivityIndicator /> : (
                        <FlatList data={[...studentList].sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))} keyExtractor={i => i.id} renderItem={({ item }) => (
                            <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center' }} onPress={() => toggleSelectedStudentForCreate(item)}>
                                {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} /> : <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.secondarySoft, marginRight: 12 }} />}
                                <Text style={{ fontSize: 16, flex: 1, color: COLORS.textPrimary }}>{item.firstName} {item.lastName}</Text>
                                <Text style={{ color: selectedStudentsForCreate.find(s => s.id === item.id) ? COLORS.primary : COLORS.textSecondary }}>{selectedStudentsForCreate.find(s => s.id === item.id) ? 'Selected' : 'Tap to select'}</Text>
                            </TouchableOpacity>
                        )} />
                    )}
                    <View style={{ height: 12 }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                        <AppButton title="Done" onPress={() => { setShowStudentModal(false); setShowBackButton(true); }} style={{ flex: 1 }} />
                        <AppButton title="Clear selection" variant="secondary" onPress={() => setSelectedStudentsForCreate([])} style={{ flex: 1 }} />
                    </View>
                </View>
            </Modal>

            <Modal visible={showConfirmDeleteModal} transparent animationType="fade" onRequestClose={() => setShowConfirmDeleteModal(false)}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    <View style={{ width: '90%', backgroundColor: COLORS.surface, padding: 18, borderRadius: RADIUS.md }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12, color: COLORS.textPrimary }}>Delete roster</Text>
                        <Text style={{ marginBottom: 16, color: COLORS.textPrimary }}>Are you sure you want to delete roster "{confirmDeleteTarget ? confirmDeleteTarget.name : ''}"? This cannot be undone.</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                            <AppButton title="Cancel" size="small" variant="secondary" onPress={() => { setShowConfirmDeleteModal(false); setConfirmDeleteTarget(null); }} />
                            <AppButton title="Delete" size="small" variant="danger" onPress={async () => { setShowConfirmDeleteModal(false); const id = confirmDeleteTarget && confirmDeleteTarget.id; setConfirmDeleteTarget(null); if (id) await handleDeleteRoster(id); }} />
                        </View>
                    </View>
                </View>
            </Modal>
            {showBackButton && <AppButton title="Back" variant="outline" onPress={() => navigation.goBack()} />}
        </View>
    );
}
