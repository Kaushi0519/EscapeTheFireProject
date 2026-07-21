import {View, Text, TextInput, Button, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import React, {useState} from 'react';

const DashboardAdmin = () => {
    
    const navigation = useNavigation();
    const { signOut } = useAuth();

    function handleAlertInitiation() {
        // Handle alert initiation logic here
        console.log('Alert initiated');
        (navigation as any).navigate('MapAdmin');
    }   

    function handleViewClassRoster() {
        // Handle view class roster logic here
        console.log('Viewing class roster');
        (navigation as any).navigate('RostersAdmin');
    }  

    async function handleLogout() {
        await signOut();
    }

    function handleCreateStaffAccount() {
        // Handle create staff account logic here
        console.log('Creating new staff account');
        (navigation as any).navigate('CreateStaffAccount');
    }

    function handleDeleteStaffAccount() {
        // Handle delete staff account logic here
        console.log('Deleting staff account');
        (navigation as any).navigate('DeleteStaffAccount');
    }

    function handleDeleteStudentID() {
        console.log('Deleting student account');
        (navigation as any).navigate('DeleteStudentAccount');
    }

    function handleCreateStudentID() {
        // Handle create student ID logic here
        console.log('Creating student ID');
        (navigation as any).navigate('CreateStudentID');
    }

    return (
        <View style={styles.container}>
            <View style={styles.containerBox}>
                <Text style={styles.title}>Emergency Management</Text>
                <Text style={styles.caption}>From here you can initiate alerts and view & manage all class rosters</Text>
                <View style={{ height: 16 }} />
                <Button title="Initiate Alert" onPress={handleAlertInitiation} />
                <View style={{ height: 16 }} />
                <Button title="View Class Roster" onPress={handleViewClassRoster} />
                <View style={{ height: 16 }} />
            </View>
            <View style={{ height: 32 }} />
            <View style={styles.containerBox}>
                <Text style={styles.title}>Admin Settings</Text>
                <Text style={styles.caption}>From here you can manage staff accounts and manage student IDs</Text>
                <View style={{ height: 16 }} />
                <Button title="Create New Staff Account" onPress={handleCreateStaffAccount} />
                <View style={{ height: 16 }} />
                <Button title="Delete Staff Account" onPress={handleDeleteStaffAccount} />
                <View style={{ height: 16 }} />
                <Button title="Create Student ID" onPress={handleCreateStudentID} />
                <View style={{ height: 16 }} />
                <Button title="Delete Student ID" onPress={handleDeleteStudentID} />
                <View style={{ height: 16 }} />
            </View>
            <View style={{ height: 32 }} />
            <View style={{width: '100%', maxWidth: 400}}>
                <Button title="Logout" onPress={handleLogout} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffffff',
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
});

export default DashboardAdmin;