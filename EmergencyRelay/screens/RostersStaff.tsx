import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { listRosters } from '../services/api';
import RosterDetail from './RosterDetail';
import { useAuth } from '../contexts/AuthContext';

export default function RostersStaff() {
    const navigation = useNavigation();
    const { user } = useAuth();
    const [rosters, setRosters] = useState([]);
    const [loading, setLoading] = useState(false);

    const [error, setError] = useState(null);
    useEffect(() => { loadRosters(); }, [user]);

    const [selectedRosterId, setSelectedRosterId] = useState(null);
    async function loadRosters() {
        setLoading(true);
        setError(null);
        try { const data = await listRosters(); setRosters(data || []); } catch (e) { console.error(e); } finally { setLoading(false); }
    }

    function openRoster(id) { setSelectedRosterId(id); }

    const assigned = (rosters || []).filter(r => r.assignedTo && user && r.assignedTo === user.id);

    return (
        <View style={{ flex: 1, padding: 16 }}>
            <Text style={{ fontSize: 20, marginBottom: 12 }}>Rosters (Staff)</Text>
            <Button title="Refresh" onPress={loadRosters} />
            {loading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
            {error ? <Text style={{ color: '#c00', marginTop: 8 }}>{String(error)}</Text> : null}
            <View style={styles.rosterBox}>
                <Text style={styles.RosterTitle}>My Classes</Text>
                {assigned.length === 0 ? <Text style={[styles.RosterText, { color: '#666' }]}>No rosters assigned to you</Text> : null}
                {assigned.map(r => (
                    <TouchableOpacity key={r.id} style={{ padding: 8, borderBottomWidth: 1, borderColor: '#eee' }} onPress={() => openRoster(r.id)}>
                        <Text style={styles.RosterText}>Class: {r.name}</Text>
                        <Text style={styles.RosterText}>Staff: {r.assignedToEmail ? `${r.assignedToEmail}` : ''}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <Modal visible={!!selectedRosterId} animationType="slide" onRequestClose={() => { setSelectedRosterId(null); loadRosters(); }}>
                <View style={{ flex: 1, backgroundColor: '#fff' }}>
                    <RosterDetail rosterId={selectedRosterId} onClose={() => { setSelectedRosterId(null); loadRosters(); }} />
                </View>
            </Modal>
            <View style={styles.rosterBox}>
                <Text style={styles.RosterTitle}>All Classes</Text>
                <FlatList data={rosters} keyExtractor={i => i.id} ListEmptyComponent={<Text style={{ color: '#666' }}>No rosters available</Text>} renderItem={({ item }) => (
                    <TouchableOpacity style={{ padding: 8, borderBottomWidth: 1, borderColor: '#eee' }} onPress={() => openRoster(item.id)}>
                        <Text style={styles.RosterText}>Class: {item.name}</Text>
                        <Text style={styles.RosterText}>Staff: {item.assignedToEmail ? `${item.assignedToEmail}` : ''}</Text>
                    </TouchableOpacity>
                )} />
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
