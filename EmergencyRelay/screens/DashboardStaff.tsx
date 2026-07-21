import {View, Text, TextInput, Button, StyleSheet, Alert, Platform, ScrollView} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useEmergency } from '../contexts/EmergencyContext';
import React, {useState} from 'react';

const DashboardStaff = () => {
    
    const navigation = useNavigation();
    const { signOut } = useAuth();
    const { emergencyState } = useEmergency();  

    function handleAlertInitiation() {
        // Handle alert initiation logic here
        console.log('Alert initiated');
        (navigation as any).navigate('MapStaff');
    }   

    function handleViewClassRoster() {
        // Handle view class roster logic here
        console.log('Viewing class roster');
        (navigation as any).navigate('RostersStaff');
    }  

    function handleInstructions() {
        console.log('Navigating to instructions');
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
                    <Text style={styles.emergencyBannerTitle}>ACTIVE EMERGENCY</Text>
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

            <View style={styles.container}>
                <View style={styles.containerBox}>
                <Text style={styles.title}>Emergency Management</Text>
                <Text style={styles.caption}>From here you can initiate alerts and your class roster(s)</Text>
                <View style={{ height: 16 }} />
                <Button title="Initiate Alert" onPress={handleAlertInitiation} />
                <View style={{ height: 16 }} />
                <Button title="View Class Roster" onPress={handleViewClassRoster} />
                <View style={{ height: 16 }} />
                <Button title="Instructions" onPress={handleInstructions} />
                <View style={{ height: 16 }} />
            </View>
            <View style={{ height: 32 }} />
            <View style={{width: '100%', maxWidth: 400}}>
                <Button title="Logout" onPress={handleLogout} />
            </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
        backgroundColor: '#ffffffff',
    },
    scrollContainer: {
        flexGrow: 1,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffffff',
        padding: 16,
    },
    containerBox: {
        width: '100%',
        maxWidth: 400,
        padding: 16,
        borderRadius: 8,
        borderColor: '#000',
        borderWidth: 1,
        backgroundColor: '#f9f9f9',
        elevation: 2,
    },
    title: {
        fontSize: 24,
        marginBottom: 16,
        textAlign: 'center',
    },
        caption: {
        fontSize: 12,
        color: '#666',
        marginBottom: 8,
        textAlign: 'center',
    },
    // Emergency banner styles
    emergencyBanner: {
        width: '100%',
        backgroundColor: '#d32f2f',
        padding: 16,
        alignItems: 'center',
    },
    emergencyBannerTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
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