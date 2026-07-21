import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { listRosters, getAllClearStatus } from '../services/api';
import RosterDetail from './RosterDetail';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, RADIUS, CARD_SHADOW } from '../constants/theme';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import AppButton from '../components/AppButton';

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

    function renderStatusDots(status) {
        if (!status) return null;
        const studentsAllClear = status.accountedStudents === status.totalStudents;
        const staffClear = !status.hasStaff || status.staffAccounted;
        return (
            <View style={{ flexDirection: 'row', marginTop: 6 }}>
                <View style={styles.statusItem}>
                    <View style={[styles.statusDot, { backgroundColor: staffClear ? COLORS.success : COLORS.danger }]} />
                    <Text style={styles.statusLabel}>Staff</Text>
                </View>
                <View style={styles.statusItem}>
                    <View style={[styles.statusDot, { backgroundColor: studentsAllClear ? COLORS.success : COLORS.danger }]} />
                    <Text style={styles.statusLabel}>Students ({status.accountedStudents}/{status.totalStudents})</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <PageHeader eyebrow="STAFF" title="Rosters" />
            <AppButton title="Refresh" variant="secondary" onPress={loadRosters} />

            {/* All Clear Status Indicator */}
            {allClearStatus && (
                <View style={[styles.clearBanner, { backgroundColor: allClearStatus.allClear ? COLORS.success : COLORS.danger }]}>
                    <Text style={styles.clearBannerTitle}>
                        {allClearStatus.allClear ? '✓ ALL CLEAR' : '⚠ NOT ALL CLEAR'}
                    </Text>
                    <Text style={styles.clearBannerSubtext}>
                        {allClearStatus.accountedRosters} / {allClearStatus.totalRosters} rosters fully accounted
                    </Text>
                </View>
            )}
            {loading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
            {error ? <Text style={styles.errorText}>{String(error)}</Text> : null}

            <Card title="My Classes">
                {assigned.length === 0 ? <Text style={styles.emptyText}>No rosters assigned to you</Text> : null}
                {assigned.map(r => {
                    const status = getRosterStatus(r.id);
                    return (
                        <TouchableOpacity key={r.id} style={styles.rosterRow} onPress={() => openRoster(r.id)}>
                            <Text style={styles.rosterName}>{r.name}</Text>
                            <Text style={styles.rosterSubtext}>Staff: {r.assignedToEmail || ''}</Text>
                            {renderStatusDots(status)}
                        </TouchableOpacity>
                    );
                })}
            </Card>

            <Modal visible={!!selectedRosterId} animationType="slide" onRequestClose={() => { setSelectedRosterId(null); loadRosters(); }}>
                <View style={{ flex: 1, backgroundColor: COLORS.background }}>
                    <RosterDetail rosterId={selectedRosterId} onClose={() => { setSelectedRosterId(null); loadRosters(); }} />
                </View>
            </Modal>

            <Card title="All Classes" style={{ flex: 1 }}>
                <FlatList
                    data={[...rosters].sort((a, b) => (a.name || '').localeCompare(b.name || ''))}
                    keyExtractor={i => i.id}
                    ListEmptyComponent={<Text style={styles.emptyText}>No rosters available</Text>}
                    renderItem={({ item }) => {
                        const status = getRosterStatus(item.id);
                        return (
                            <TouchableOpacity style={styles.rosterRow} onPress={() => openRoster(item.id)}>
                                <Text style={styles.rosterName}>{item.name}</Text>
                                <Text style={styles.rosterSubtext}>Staff: {item.assignedToEmail || ''}</Text>
                                {renderStatusDots(status)}
                            </TouchableOpacity>
                        );
                    }}
                />
            </Card>

            <AppButton title="Back" variant="outline" onPress={() => navigation.goBack()} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: COLORS.background,
    },
    clearBanner: {
        padding: 12,
        borderRadius: RADIUS.md,
        marginVertical: 10,
        alignItems: 'center',
    },
    clearBannerTitle: {
        color: COLORS.textOnColor,
        fontWeight: 'bold',
        fontSize: 16,
    },
    clearBannerSubtext: {
        color: COLORS.textOnColor,
        fontSize: 12,
        marginTop: 4,
    },
    errorText: {
        color: COLORS.danger,
        marginTop: 8,
    },
    emptyText: {
        color: COLORS.textSecondary,
    },
    rosterRow: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
    },
    rosterName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    rosterSubtext: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 4,
    },
    statusLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
});
