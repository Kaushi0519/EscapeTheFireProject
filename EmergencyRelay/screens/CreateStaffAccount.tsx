import {View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import React, {useState} from 'react';
import * as ImagePicker from 'expo-image-picker';
import { createUserServer } from '../services/api';

const CreateStaffAccount = () => {

    const navigation = useNavigation();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6, allowsEditing: true });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                setImageUri(result.assets[0].uri);
            }
        } catch (e) {
            console.error('image pick failed', e);
            Alert.alert('Error', 'Image picker failed');
        }
    };

    async function handleCreateAccount() {
        if (email.trim() === '' || password.trim() === '') {
            setError('Email and password are required');
            return;
        }

        setLoading(true);
        try {
            await createUserServer({ email, password, roles: ['staff'], imageUrl: imageUri || undefined });
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
            await createUserServer({ email, password, roles: ['admin'], imageUrl: imageUri || undefined });
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
                <Button title={imageUri ? 'Change Photo' : 'Pick Photo (optional)'} onPress={pickImage} />
                {imageUri ? <Text style={{ marginVertical: 8 }}>Photo selected</Text> : null}
                <View style={{height: 16}}/>
                <Text style={styles.error}>{error}</Text>
                <View style={{height: 16}}/>
                {loading ? <ActivityIndicator /> : (
                    <>
                        <Button title="Create Staff Account" onPress={handleCreateAccount} />
                        <View style={{height: 16}}/>
                        <Button title="Create Admin Account" onPress={handleCreateAdminAccount} />
                    </>
                )}
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