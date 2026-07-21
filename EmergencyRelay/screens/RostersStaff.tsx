import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { listRosters, getAllClearStatus } from '../services/api';
import RosterDetail from './RosterDetail';
import { useAuth } from '../contexts/AuthContext';

export default function RostersStaff() {
    const navigation = useNavigation();
    const { user } = useAuth();
    const [rosters, setRosters] = useState([]);
    const [loading, setLoading] = useState(false);

    const [error, setError] = useState(null);
    const [allClearStatus, setAllClearStatus] = useState<{allClear: boolean; totalRosters: number; accountedRosters: number; rosterStatuses: Array<{id: string; totalStudents: number; accountedStudents: number; hasStaff: boolean; staffAccounted: boolean}>} | null>(null);
    
    // Helper to get status for a specific roster
    function getRosterStatus(rosterId: string) {
        if (!allClearStatus || !allClearStatus.rosterStatuses) return null;
        return allClearStatus.rosterStatuses.find(s => s.id === rosterId);
    }
    
    useEffect(() => { loadRosters(); }, [user]);

    const [selectedRosterId, setSelectedRosterId] = useState(null);
    async function loadRosters() {
        setLoading(true);
        setError(null);
        try {
            const data = await listRosters();
            setRosters(data || []);
            // Fetch all clear status
            try {
                const clearStatus = await getAllClearStatus();
                setAllClearStatus(clearStatus);
            } catch (e) {
                console.error('Load all clear status failed', e);
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    }

    function openRoster(id) { setSelectedRosterId(id); }

    const assigned = (rosters || []).filter(r => r.assignedTo && user && r.assignedTo === user.id);

    return (
        <View style={{ flex: 1, padding: 16 }}>
            <Text style={{ fontSize: 20, marginBottom: 12 }}>Rosters (Staff)</Text>
            <Button title="Refresh" onPress={loadRosters} />

            {/* All Clear Status Indicator */}
            {allClearStatus && (
                <View style={{
                    backgroundColor: allClearStatus.allClear ? '#4CAF50' : '#F44336',
                    padding: 12,
                    borderRadius: 8,
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
            {loading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
            {error ? <Text style={{ color: '#c00', marginTop: 8 }}>{String(error)}</Text> : null}
            <View style={styles.rosterBox}>
                <Text style={styles.RosterTitle}>My Classes</Text>
                {assigned.length === 0 ? <Text style={[styles.RosterText, { color: '#666' }]}>No rosters assigned to you</Text> : null}
                {assigned.map(r => {
                    const status = getRosterStatus(r.id);
                    const studentsAllClear = status ? status.accountedStudents === status.totalStudents : false;
                    const staffClear = status ? (!status.hasStaff || status.staffAccounted) : false;
                    return (
                        <TouchableOpacity key={r.id} style={{ padding: 8, borderBottomWidth: 1, borderColor: '#eee' }} onPress={() => openRoster(r.id)}>
                            <Text style={styles.RosterText}>Class: {r.name}</Text>
                            <Text style={styles.RosterText}>Staff: {r.assignedToEmail ? `${r.assignedToEmail}` : ''}</Text>
                            {status && (
                                <View style={{ flexDirection: 'row', marginTop: 4 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: staffClear ? '#4CAF50' : '#F44336', marginRight: 4 }} />
                                        <Text style={{ fontSize: 12, color: '#666' }}>Staff</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: studentsAllClear ? '#4CAF50' : '#F44336', marginRight: 4 }} />
                                        <Text style={{ fontSize: 12, color: '#666' }}>Students ({status.accountedStudents}/{status.totalStudents})</Text>
                                    </View>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
            <Modal visible={!!selectedRosterId} animationType="slide" onRequestClose={() => { setSelectedRosterId(null); loadRosters(); }}>
                <View style={{ flex: 1, backgroundColor: '#fff' }}>
                    <RosterDetail rosterId={selectedRosterId} onClose={() => { setSelectedRosterId(null); loadRosters(); }} />
                </View>
            </Modal>
            <View style={styles.rosterBox}>
                <Text style={styles.RosterTitle}>All Classes</Text>
                <FlatList data={[...rosters].sort((a, b) => (a.name || '').localeCompare(b.name || ''))} keyExtractor={i => i.id} ListEmptyComponent={<Text style={{ color: '#666' }}>No rosters available</Text>} renderItem={({ item }) => {
                    const status = getRosterStatus(item.id);
                    const studentsAllClear = status ? status.accountedStudents === status.totalStudents : false;
                    const staffClear = status ? (!status.hasStaff || status.staffAccounted) : false;
                    return (
                        <TouchableOpacity style={{ padding: 8, borderBottomWidth: 1, borderColor: '#eee' }} onPress={() => openRoster(item.id)}>
                            <Text style={styles.RosterText}>Class: {item.name}</Text>
                            <Text style={styles.RosterText}>Staff: {item.assignedToEmail ? `${item.assignedToEmail}` : ''}</Text>
                            {status && (
                                <View style={{ flexDirection: 'row', marginTop: 4 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: staffClear ? '#4CAF50' : '#F44336', marginRight: 4 }} />
                                        <Text style={{ fontSize: 12, color: '#666' }}>Staff</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: studentsAllClear ? '#4CAF50' : '#F44336', marginRight: 4 }} />
                                        <Text style={{ fontSize: 12, color: '#666' }}>Students ({status.accountedStudents}/{status.totalStudents})</Text>
                                    </View>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                }} />
            </View>

            <Button title="Back" onPress={() => navigation.goBack()} />
        </View>
    );
}

const styles = StyleSheet.create({
    RosterText: {
        marginTop: 4,
        fontSize: 16,
        marginBottom: 4,
    },
    RosterTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
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
