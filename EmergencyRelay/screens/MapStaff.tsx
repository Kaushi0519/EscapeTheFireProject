import {View, Text, Button, StyleSheet, TextInput, ScrollView, Alert, Dimensions} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useEmergency } from '../contexts/EmergencyContext';
import React, {useState, useEffect} from 'react';
import { getUserLocationsServer, getActiveAlertsServer, createAlertServer, cancelAlertServer } from '../services/api';
import { ReportBox } from '../models/Report';
import FloorMap from '../components/FloorMap';

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

                <View style={styles.mapBox}>
                    <Text style={styles.mapBoxTitle}>Live User Locations</Text>
                    <ScrollView style={styles.userListScroll} nestedScrollEnabled={true}>
                        {locationError && (
                            <Text style={{color: 'red', textAlign: 'center', margin: 10}}>
                                Error: {locationError}
                            </Text>
                        )}
                        {loading && <Text style={{textAlign: 'center', marginTop: 10}}>Loading...</Text>}
                        {!loading && userLocations.length === 0 && !locationError && (
                            <Text style={{textAlign: 'center', marginTop: 10, color: '#666'}}>
                                No users with location data
                            </Text>
                        )}
                        {[...userLocations].sort((a, b) => (a.email || '').localeCompare(b.email || '')).map(u => (
                            <View key={u.id} style={styles.userItem}>
                                <Text style={{fontWeight: '600'}}>{u.email}</Text>
                                <Text style={{fontSize: 12, color: '#666'}}>
                                    {u.lastLocation?.room ? `Room: ${u.lastLocation.room}` : 'Location: Unknown'}
                                </Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>

            {selectedAlert && (
                <>
                    <ReportBox 
                        location={selectedAlert.location}
                        staff={selectedAlert.staff}
                        type={selectedAlert.type}
                    />
                    <View style={styles.reportButtonsContainer}>
                        <Button title="Cancel Alert" onPress={handleCancelAlert} />
                        <View style={{ width: 8 }} />
                        <Button title="Back" onPress={() => setSelectedAlert(null)} />
                    </View>
                </>
            )}

            {showCreateForm ? (
                <>
                    <View style={styles.formContainer}>
                        <Text style={styles.formTitle}>Create New Alert</Text>
                        {formError && (
                            <Text style={{color: 'red', fontSize: 12, marginBottom: 8}}>
                                {formError}
                            </Text>
                        )}
                        <TextInput
                            placeholder="Location (e.g., Room 101)"
                            style={styles.input}
                            value={alertLocation}
                            onChangeText={setAlertLocation}
                        />
                        <TextInput
                            placeholder="Alert Type (e.g., Fire, Medical)"
                            style={styles.input}
                            value={alertType}
                            onChangeText={setAlertType}
                        />
                        <View style={styles.formButtonsContainer}>
                            <Button title="Create" onPress={handleCreateAlert} />
                            <View style={{ width: 8 }} />
                            <Button title="Cancel" onPress={() => setShowCreateForm(false)} />
                        </View>
                    </View>
                </>
            ) : !selectedAlert && alerts.length > 0 ? (
                <>
                    <View style={styles.alertsContainer}>
                        <Text style={styles.alertsTitle}>Active Alerts ({alerts.length})</Text>
                        <ScrollView style={{ maxHeight: 120 }}>
                            {alerts.map(alert => (
                                <Button 
                                    key={alert.id}
                                    title={`${alert.type} - ${alert.location}`}
                                    onPress={() => setSelectedAlert(alert)}
                                />
                            ))}
                        </ScrollView>
                    </View>
                </>
            ) : null}

            <View style={{ height: 16 }} />
            {!showCreateForm && !selectedAlert && !emergencyState.isActive && (
                <Button title="Create Alert" onPress={handleOpenCreateForm} />
            )}
            {!showCreateForm && !selectedAlert && !emergencyState.isActive && (
                <View style={{ height: 16 }} />
            )}
            <Button title="Back" onPress={handleBack} />
            <View style={{ height: 20 }} />
        </View>
        </ScrollView>
    )
};

const { height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContainer: {
        paddingBottom: 50,
    },
    container: {
        alignItems: 'center',
        backgroundColor: '#ffffffff',
        paddingTop: 10,
    },
    floorMapContainer: {
        width: '98%',
        marginBottom: 12,
    },
    mapBox: {
        width: '95%',
        height: screenHeight * 0.50, // 25% of screen height
        backgroundColor: '#ddd',
        borderRadius: 8,
        borderColor: '#000',
        borderWidth: 1,
        overflow: 'hidden',
    },
    mapBoxTitle: {
        textAlign: 'center',
        paddingVertical: 10,
        fontWeight: 'bold',
        fontSize: 18,
        backgroundColor: '#ccc',
    },
    userListScroll: {
        flex: 1,
    },
    userItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#bbb',
        backgroundColor: '#eee',
    },
    alertsContainer: {
        width: '90%',
        padding: 12,
        backgroundColor: '#fff3cd',
        borderRadius: 8,
        borderColor: '#ffc107',
        borderWidth: 2,
        marginVertical: 8,
    },
    alertsTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#ff6b6b',
    },
    reportButtonsContainer: {
        flexDirection: 'row',
        width: '90%',
        justifyContent: 'center',
        gap: 8,
        marginVertical: 8,
    },
    formContainer: {
        width: '90%',
        padding: 12,
        backgroundColor: '#e3f2fd',
        borderRadius: 8,
        borderColor: '#2196f3',
        borderWidth: 2,
        marginVertical: 8,
    },
    formTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#1976d2',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        marginBottom: 8,
        borderRadius: 4,
        backgroundColor: '#fff',
    },
    formButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginTop: 8,
    },
    // Emergency banner styles
    emergencyBanner: {
        width: '100%',
        backgroundColor: '#d32f2f',
        padding: 16,
        alignItems: 'center',
        marginBottom: 10,
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