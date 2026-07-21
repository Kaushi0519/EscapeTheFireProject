import {View, Text, Button, StyleSheet, Alert, Platform, ScrollView} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useEmergency } from '../contexts/EmergencyContext';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import ActionButton from '../components/ActionButton';

const DashboardStaff = () => {

    const navigation = useNavigation();
    const { user, signOut } = useAuth();
    const { emergencyState } = useEmergency();

    function handleAlertInitiation() {
        (navigation as any).navigate('MapStaff');
    }

    function handleViewClassRoster() {
        (navigation as any).navigate('RostersStaff');
    }

    function handleInstructions() {
        (navigation as any).navigate('Instructions');
    }

    async function handleLogout() {
        if (Platform.OS === 'web') {
            // Use window.confirm on web since Alert.alert callbacks can be unreliable
            const confirmed = window.confirm('Are you sure you want to log out?');
            if (confirmed) {
                try {
                    await signOut();
                } catch (e) {
                    console.error('Logout failed:', e);
                }
            }
        } else {
            Alert.alert(
                'Confirm Logout',
                'Are you sure you want to log out?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Logout', style: 'destructive', onPress: async () => {
                        try {
                            await signOut();
                        } catch (e) {
                            console.error('Logout failed:', e);
                        }
                    }}
                ]
            );
        }
    }

    return (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContainer}>
            {/* Active Emergency Banner */}
            {emergencyState.isActive && (
                <View style={styles.emergencyBanner}>
                    <View style={styles.emergencyHeaderRow}>
                        <Ionicons name="warning" size={22} color="#fff" />
                        <Text style={styles.emergencyBannerTitle}>ACTIVE EMERGENCY</Text>
                    </View>
                    <Text style={styles.emergencyBannerText}>
                        Type: {emergencyState.type}
                    </Text>
                    <Text style={styles.emergencyBannerText}>
                        Location: {emergencyState.location?.room} (Floor {emergencyState.location?.floor})
                    </Text>
                    {emergencyState.requiresEvacuation ? (
                        <Text style={styles.emergencyBannerEvacuation}>
                            EVACUATION REQUIRED
                        </Text>
                    ) : (
                        <Text style={styles.emergencyBannerSubtext}>
                            Shelter in place. No evacuation required.
                        </Text>
                    )}
                    <View style={{ marginTop: 10 }}>
                        <Button
                            title="Go to Emergency Map"
                            onPress={() => (navigation as any).navigate('MapStaff')}
                            color="#fff"
                        />
                    </View>
                </View>
            )}

            <View style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.eyebrow}>STAFF DASHBOARD</Text>
                    <Text style={styles.title}>Emergency Management</Text>
                    {user?.email ? <Text style={styles.subtitle}>Signed in as {user.email}</Text> : null}
                </View>

                {/* Actions card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Quick Actions</Text>
                    <Text style={styles.cardCaption}>Initiate alerts and manage your class rosters</Text>
                    <View style={styles.cardDivider} />
                    <ActionButton title="Initiate Alert" icon="megaphone-outline" variant="danger" onPress={handleAlertInitiation} />
                    <ActionButton title="View Class Roster" icon="people-outline" variant="primary" onPress={handleViewClassRoster} />
                    <ActionButton title="Instructions" icon="information-circle-outline" variant="secondary" onPress={handleInstructions} />
                </View>

                <ActionButton title="Logout" icon="log-out-outline" variant="secondary" onPress={handleLogout} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    scrollContainer: {
        flexGrow: 1,
        padding: 16,
        paddingBottom: 40,
    },
    page: {
        width: '100%',
        maxWidth: 480,
        alignSelf: 'center',
    },
    header: {
        marginBottom: 20,
        alignItems: 'center',
    },
    eyebrow: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1976D2',
        letterSpacing: 1,
        marginBottom: 4,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A1A1A',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 13,
        color: '#757575',
        marginTop: 4,
    },
    card: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 18,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    cardCaption: {
        fontSize: 13,
        color: '#757575',
        marginTop: 2,
    },
    cardDivider: {
        height: 1,
        backgroundColor: '#EEEEEE',
        marginVertical: 12,
    },
    // Emergency banner styles
    emergencyBanner: {
        width: '100%',
        backgroundColor: '#d32f2f',
        padding: 16,
        alignItems: 'center',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
    },
    emergencyHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    emergencyBannerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    emergencyBannerText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    emergencyBannerEvacuation: {
        color: '#ffeb3b',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 8,
    },
    emergencyBannerSubtext: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        marginTop: 4,
    },
});

export default DashboardStaff;
