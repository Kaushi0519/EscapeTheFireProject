import {View, Text, TextInput, Button, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import React, {useState} from 'react';
import { createUserServer } from '../services/api';
import { getUsersServer } from '../services/api';
import { get } from 'react-native/Libraries/TurboModule/TurboModuleRegistry';

const CreateStaffAccount = () => {

    const navigation = useNavigation();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleCreateAccount() {
        if (email.trim() === '' || password.trim() === '') {
            setError('Email and password are required');
            return;
        }
        //check if user already exists
        //if (getUsersServer.find(u => u.email === email)) {

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

    async function handleCreateAdminAccount() {
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

    function handleCancel() {
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