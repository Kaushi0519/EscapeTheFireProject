/**
 * Developer Notes:
 * - This screen is the staff map view used during alerts.
 * - It currently shows a placeholder map area and a back button.
 * - The back button returns to the previous staff screen.
 * - Replace the placeholder box when real map integration is added.
 */

import {View, Text, TextInput, Button, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import React, {useState} from 'react';

export default function Map() {
    const navigation = useNavigation();

    function handleBack() { // Handles back button press, navigates back to staff dashboard
        (navigation as any).goBack();
    }

    return(
        <View style={styles.container}>
            <View style={styles.mapBox}>
                <Text style={{textAlign: 'center', marginTop: '25%'}}>Map goes here</Text>
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