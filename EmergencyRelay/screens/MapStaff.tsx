import {View, Text, TextInput, Button, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import React, {useState, useEffect} from 'react';
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
            } catch (e) {}
        }
        fetchLocations();
        const interval = setInterval(fetchLocations, 10000);
        return () => clearInterval(interval);
    }, []);

    return(
        <View style={styles.container}>
            <View style={styles.mapBox}>
                <Text style={{textAlign: 'center', marginTop: '5%'}}>User Locations:</Text>
                {userLocations.map(u => (
                    <Text key={u.id}>{u.email}: {u.last_location?.room || 'Unknown'}</Text>
                ))}
            </View>
            <View style={{ height: 16 }} />
            <Button title="Back" onPress={handleBack} />
        </View>
    )
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffffff',
    },
    mapBox: {
        width: '90%',
        height: '80%',
        backgroundColor: '#ddd',
        borderRadius: 8,
        borderColor: '#000',
        borderWidth: 1,
    }
});