import {View, Text, StyleSheet, Alert, Dimensions} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useEmergency } from '../contexts/EmergencyContext';
import React, {useState, useEffect} from 'react';
import { getUserLocationsServer, getActiveAlertsServer, createAlertServer, cancelAlertServer } from '../services/api';
import { ReportBox } from '../models/Report';
import FloorMap from '../components/FloorMap';
import { COLORS, RADIUS, CARD_SHADOW } from '../constants/theme';
import Card from '../components/Card';
import TextField from '../components/TextField';
import AppButton from '../components/AppButton';
import { ScrollView } from 'react-native';

interface AlertData {
    id: string;
    location: string;
    staff: string;
    type: string;
    createdAt?: string;
}

export default function MapStaff() {
    const navigation = useNavigation();
    const { user } = useAuth();
    const { emergencyState } = useEmergency();
    const [userLocations, setUserLocations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [locationError, setLocationError] = useState(null);
    const [formError, setFormError] = useState(null);
    const [alerts, setAlerts] = useState<AlertData[]>([]);
    const [selectedAlert, setSelectedAlert] = useState<AlertData | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [alertLocation, setAlertLocation] = useState('');
    const [alertType, setAlertType] = useState('');

    function handleBack() {
        (navigation as any).goBack();
    }

    useEffect(() => {
        // Fetch user locations and alerts on mount and periodically
        async function fetchData() {
            try {
                setLoading(true);
                setLocationError(null);
                const locations = await getUserLocationsServer();
                setUserLocations(locations || []);
            } catch (e) {
                console.error('Failed to fetch user locations:', e);
                setLocationError(e && e.message ? e.message : 'Failed to load locations');
            }

            // Fetch alerts separately to avoid breaking location display on alert errors
            try {
                const activeAlerts = await getActiveAlertsServer();
                setAlerts(activeAlerts || []);
            } catch (e) {
                console.error('Failed to fetch alerts:', e);
                // Don't show alert errors - just set empty alerts
                setAlerts([]);
            } finally {
                setLoading(false);
            }
        }

        // Initial fetch
        fetchData();

        // Poll every 5 seconds for updates
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    async function handleCancelAlert() {
        if (!selectedAlert) return;
        try {
            await cancelAlertServer(selectedAlert.id);
            setAlerts(alerts.filter(a => a.id !== selectedAlert.id));
            setSelectedAlert(null);
        } catch (e) {
            console.error('Failed to cancel alert:', e);
            setFormError(e && e.message ? e.message : 'Failed to cancel alert');
        }
    }

    async function handleCreateAlert() {
        if (!alertType.trim() || !alertLocation.trim()) {
            setFormError('Please fill in all fields');
            return;
        }

        try {
            const newAlert = await createAlertServer({
                location: alertLocation,
                staff: user?.email || 'Staff',
                type: alertType
            });
            setAlerts([...alerts, newAlert]);
            setAlertLocation('');
            setAlertType('');
            setShowCreateForm(false);
            setFormError(null);
        } catch (e) {
            console.error('Failed to create alert:', e);
            setFormError(e && e.message ? e.message : 'Failed to create alert');
        }
    }

    function handleOpenCreateForm() {
        // Auto-populate location with user's current location
        if (userLocations.length > 0) {
            const currentLocation = userLocations[0].lastLocation?.room || 'Unknown';
            setAlertLocation(currentLocation);
        }
        setShowCreateForm(true);
        setFormError(null);
    }

    const [selectedStairwellGroup, setSelectedStairwellGroup] = useState<string | null>(null);

    // Get room IDs that have active alerts for highlighting
    const highlightedRooms = alerts.map(a => {
        // Extract room number from location string (e.g., "Room 101" -> "101")
        const match = a.location.match(/(\d+)/);
        return match ? match[1] : '';
    }).filter(Boolean);

    const handleRoomPress = (floor: number, roomId: string, roomName: string, type: string, stairwellGroup?: string) => {
        // Handle stairwell selection - toggle and highlight across all floors
        if (type === 'stairwell' && stairwellGroup) {
            if (selectedStairwellGroup === stairwellGroup) {
                setSelectedStairwellGroup(null); // Deselect
            } else {
                setSelectedStairwellGroup(stairwellGroup);
            }
            Alert.alert(
                roomName,
                `Floor ${floor}\n\nStairwell connects all floors.${selectedStairwellGroup === stairwellGroup ? '\n\nTap again to deselect.' : ''}`,
                [{ text: 'OK' }]
            );
            return;
        }

        // Check if there's an alert for this room
        const alertForRoom = alerts.find(a => a.location.toLowerCase().includes(roomName.toLowerCase()));
        if (alertForRoom) {
            setSelectedAlert(alertForRoom);
        } else {
            Alert.alert(
                roomName,
                `Floor ${floor}${type === 'hall' ? ' (Hallway)' : ''}\n\nNo active alerts for this location.`,
                [
                    { text: 'OK' },
                    {
                        text: 'Create Alert Here',
                        onPress: () => {
                            setAlertLocation(roomName);
                            setShowCreateForm(true);
                        }
                    },
                ]
            );
        }
    };

    return(
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={true}
        >
            <View style={styles.container}>
                {/* Active Emergency Banner */}
                {emergencyState.isActive && (
                    <View style={styles.emergencyBanner}>
                        <Text style={styles.emergencyBannerTitle}>ACTIVE EMERGENCY</Text>
                        <Text style={styles.emergencyBannerText}>
                            Type: {emergencyState.type} | Location: {emergencyState.location?.room}
                        </Text>
                        {emergencyState.requiresEvacuation ? (
                            <>
                                <Text style={styles.emergencyBannerEvacuation}>
                                    EVACUATION REQUIRED
                                </Text>
                                <Text style={styles.emergencyBannerSubtext}>
                                    Follow evacuation procedures. Map interactions disabled.
                                </Text>
                                {/* Placeholder for escape route info */}
                                <View style={styles.escapeRouteInfo}>
                                    <Text style={styles.escapeRouteText}>
                                        Escape route will be displayed once location is detected
                                    </Text>
                                </View>
                            </>
                        ) : (
                            <Text style={styles.emergencyBannerSubtext}>
                                Shelter in place. No evacuation required.
                            </Text>
                        )}
                    </View>
                )}

                {/* Floor Map at the top */}
                <View style={styles.floorMapContainer}>
                    <FloorMap
                        onRoomPress={handleRoomPress}
                        highlightedRooms={highlightedRooms}
                        selectedStairwellGroup={selectedStairwellGroup}
                        emergencyMode={emergencyState.isActive}
                        emergencyLocation={emergencyState.location?.room || null}
                    />
                </View>

                <Card title="Live User Locations" style={styles.mapBox}>
                    <ScrollView style={styles.userListScroll} nestedScrollEnabled={true}>
                        {locationError && (
                            <Text style={styles.inlineError}>
                                Error: {locationError}
                            </Text>
                        )}
                        {loading && <Text style={styles.loadingText}>Loading...</Text>}
                        {!loading && userLocations.length === 0 && !locationError && (
                            <Text style={styles.emptyText}>
                                No users with location data
                            </Text>
                        )}
                        {[...userLocations].sort((a, b) => (a.email || '').localeCompare(b.email || '')).map(u => (
                            <View key={u.id} style={styles.userItem}>
                                <Text style={styles.userEmail}>{u.email}</Text>
                                <Text style={styles.userLocation}>
                                    {u.lastLocation?.room ? `Room: ${u.lastLocation.room}` : 'Location: Unknown'}
                                </Text>
                            </View>
                        ))}
                    </ScrollView>
                </Card>

            {selectedAlert && (
                <>
                    <ReportBox
                        location={selectedAlert.location}
                        staff={selectedAlert.staff}
                        type={selectedAlert.type}
                    />
                    <View style={styles.reportButtonsContainer}>
                        <AppButton title="Cancel Alert" variant="danger" onPress={handleCancelAlert} />
                        <AppButton title="Back" variant="secondary" onPress={() => setSelectedAlert(null)} />
                    </View>
                </>
            )}

            {showCreateForm ? (
                <Card title="Create New Alert">
                    {formError && (
                        <Text style={styles.inlineError}>
                            {formError}
                        </Text>
                    )}
                    <TextField
                        placeholder="Location (e.g., Room 101)"
                        value={alertLocation}
                        onChangeText={setAlertLocation}
                    />
                    <TextField
                        placeholder="Alert Type (e.g., Fire, Medical)"
                        value={alertType}
                        onChangeText={setAlertType}
                    />
                    <View style={styles.formButtonsContainer}>
                        <AppButton title="Create" onPress={handleCreateAlert} />
                        <AppButton title="Cancel" variant="secondary" onPress={() => setShowCreateForm(false)} />
                    </View>
                </Card>
            ) : !selectedAlert && alerts.length > 0 ? (
                <Card title={`Active Alerts (${alerts.length})`} style={styles.alertsContainer}>
                    <ScrollView style={{ maxHeight: 120 }}>
                        {alerts.map(alert => (
                            <AppButton
                                key={alert.id}
                                variant="secondary"
                                title={`${alert.type} - ${alert.location}`}
                                onPress={() => setSelectedAlert(alert)}
                                style={{ marginBottom: 8 }}
                            />
                        ))}
                    </ScrollView>
                </Card>
            ) : null}

            <View style={{ height: 8 }} />
            {!showCreateForm && !selectedAlert && !emergencyState.isActive && (
                <AppButton title="Create Alert" variant="danger" onPress={handleOpenCreateForm} />
            )}
            {!showCreateForm && !selectedAlert && !emergencyState.isActive && (
                <View style={{ height: 10 }} />
            )}
            <AppButton title="Back" variant="outline" onPress={handleBack} />
            <View style={{ height: 20 }} />
        </View>
        </ScrollView>
    )
};

const { height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContainer: {
        paddingBottom: 50,
    },
    container: {
        alignItems: 'center',
        backgroundColor: COLORS.background,
        paddingTop: 10,
        paddingHorizontal: 16,
    },
    floorMapContainer: {
        width: '100%',
        marginBottom: 12,
    },
    mapBox: {
        width: '100%',
        height: screenHeight * 0.50,
    },
    userListScroll: {
        flex: 1,
    },
    userItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    userEmail: {
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    userLocation: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    inlineError: {
        color: COLORS.danger,
        textAlign: 'center',
        marginBottom: 8,
        fontSize: 12,
    },
    loadingText: {
        textAlign: 'center',
        marginTop: 10,
        color: COLORS.textSecondary,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 10,
        color: COLORS.textSecondary,
    },
    formButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginTop: 8,
    },
    alertsContainer: {
        width: '100%',
    },
    reportButtonsContainer: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'center',
        gap: 8,
        marginVertical: 8,
    },
    // Emergency banner styles
    emergencyBanner: {
        width: '100%',
        backgroundColor: COLORS.danger,
        padding: 16,
        alignItems: 'center',
        marginBottom: 10,
        borderRadius: RADIUS.md,
    },
    emergencyBannerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
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
        marginBottom: 4,
    },
    emergencyBannerSubtext: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        marginTop: 4,
    },
    escapeRouteInfo: {
        marginTop: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    escapeRouteText: {
        color: '#fff',
        fontSize: 12,
        textAlign: 'center',
    },
});
