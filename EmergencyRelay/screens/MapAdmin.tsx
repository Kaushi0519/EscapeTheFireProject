import {View, Text, Button, StyleSheet, Image} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import React, {useState, useEffect, useMemo} from 'react';
import MapView, {Marker} from 'react-native-maps';
import { getApiBaseUrl } from '../services/api';

export default function Map() {
    const navigation = useNavigation();
    const [userLocations, setUserLocations] = useState([]);

    function handleBack() {
        (navigation as any).goBack();
    }

    useEffect(() => {
        async function fetchLocations() {
            try {
                const res = await fetch(getApiBaseUrl() + '/admin/users', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
                });
                if (res.ok) {
                    const users = await res.json();
                    setUserLocations(users);
                }
            } catch (e) {
                console.warn('Failed to fetch user locations', e);
            }
        }
        fetchLocations();
        const interval = setInterval(fetchLocations, 10000);
        return () => clearInterval(interval);
    }, []);

    const markers = useMemo(() => {
        return userLocations
            .map((u) => {
                const lat = u.last_location?.latitude ?? u.last_location?.lat;
                const lon = u.last_location?.longitude ?? u.last_location?.lng ?? u.last_location?.long;
                if (typeof lat === 'number' && typeof lon === 'number') {
                    return {
                        id: u.id,
                        email: u.email,
                        room: u.last_location?.room,
                        coordinate: { latitude: lat, longitude: lon },
                    };
                }
                return null;
            })
            .filter((item) => item !== null);
    }, [userLocations]);

    const initialRegion = useMemo(() => {
        if (markers.length > 0) {
            return {
                ...markers[0].coordinate,
                latitudeDelta: 0.04,
                longitudeDelta: 0.04,
            };
        }
        return {
            latitude: 37.78825,
            longitude: -122.4324,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
        };
    }, [markers]);

    return (
        <View style={styles.container}>
            <View style={styles.mapBox}>
                <MapView
                    style={styles.map}
                    initialRegion={initialRegion}
                    showsUserLocation={false}
                    showsMyLocationButton={false}
                    rotateEnabled={true}
                    zoomEnabled={true}
                    scrollEnabled={true}
                    pitchEnabled={true}
                >
                    <Marker
                        coordinate={{ latitude: 38.076396381197696, longitude: -78.50526921950066 }}
                        title="First Floor View"
                        description="Building Floor Plan"
                    >
                        <Image 
                            source={require('../assets/firstFloorView.png')}
                            style={{ 
                                width: 250, 
                                height: 250,
                                transform: [{ rotate: '0deg' }]
                            }}
                            resizeMode="contain"
                        />
                    </Marker>
                </MapView>
            </View>
            <View style={{ height: 16 }} />
            <View style={styles.mapBox}>
                <MapView
                    style={styles.map}
                    initialRegion={initialRegion}
                    showsUserLocation={false}
                    showsMyLocationButton={false}
                    rotateEnabled={true}
                    zoomEnabled={true}
                    scrollEnabled={true}
                    pitchEnabled={true}
                >
                    {markers.map((m) => (
                        <Marker
                            key={m.id}
                            coordinate={m.coordinate}
                            title={m.email}
                            description={m.room ? `Room: ${m.room}` : 'No room data'}
                        />
                    ))}
                </MapView>
            </View>
            <View style={{ height: 16 }} />
            <Button title="Back" onPress={handleBack} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    mapBox: {
        width: '95%',
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 8,
    },
    map: {
        flex: 1,
    },
});