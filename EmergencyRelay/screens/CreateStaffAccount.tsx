/**
 * Developer Notes:
 * - This screen allows an admin to create new staff or admin accounts.
 * - It uses the createUserServer function to interact with the backend API.
 * - On successful account creation, the user is navigated back to the admin dashboard.
 * - Error handling is implemented to provide feedback on failed account creation attempts.
 */

import {View, Text, TextInput, Button, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import React, {useState} from 'react';
import { createUserServer } from '../services/api';

const CreateStaffAccount = () => {

    const navigation = useNavigation();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleCreateAccount() { // Handle create staff account button press, navigate to admin dashboard on success, show error on failure
        setError('');
        if (email.trim() === '' || password.trim() === '') {
            setError('Email and password are required');
            return;
        }

        setLoading(true);
        try {
            await createUserServer({ email, password, roles: ['staff'] });
            // on success, return to admin dashboard
            (navigation as any).replace('DashboardAdmin');
        } catch (e) {
            console.error('Create account failed', e);
            setError(e && e.message ? e.message : 'Create account failed');
        } finally {
            setLoading(false);
        }

    }

    async function handleCreateAdminAccount() { // Handle create admin account button press, navigate to admin dashboard on success, show error on failure
        setError('');

        if (email.trim() === '' || password.trim() === '') {
            setError('Email and password are required');
            return;
        }

        setLoading(true);
        try {
            await createUserServer({ email, password, roles: ['admin'] });
            // on success, return to admin dashboard
            (navigation as any).replace('DashboardAdmin');
        } catch (e) {
            console.error('Create account failed', e);
            setError(e && e.message ? e.message : 'Create account failed');
        } finally {
            setLoading(false);
        }

    }

    function handleCancel() { // Handle cancel button press, navigate back to admin dashboard
        console.log("Returning to Admin Dashboard");
        (navigation as any).replace('DashboardAdmin');
    }

        return (
            <View style={styles.container}>
                <Text style={styles.title}>Create Staff Account</Text>
                <TextInput style={styles.input} placeholder="Email" onChangeText={setEmail} />
                <TextInput style={styles.input} placeholder="Password" secureTextEntry onChangeText={setPassword} />
                <View style={{height: 16}}/>
                <Text style={styles.error}>{error}</Text>
                <View style={{height: 16}}/>
                <Button title="Create Staff Account" onPress={handleCreateAccount} />
                <View style={{height: 16}}/>
                <Button title="Create Admin Account" onPress={handleCreateAdminAccount} />
                <View style={{height: 16}}/>
                <Button title="Cancel" onPress={handleCancel} />
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
    title: {
        fontSize: 24,
        marginBottom: 16,
        textAlign: 'center',
    },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
        },
    error: {
        color: 'red',
        textAlign: 'center',
    },
    });

export default CreateStaffAccount;