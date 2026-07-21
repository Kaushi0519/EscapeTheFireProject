import {View, Text, StyleSheet, Alert, ActivityIndicator} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import React, {useState} from 'react';
import * as ImagePicker from 'expo-image-picker';
import { createUserServer } from '../services/api';
import { COLORS } from '../constants/theme';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import TextField from '../components/TextField';
import AppButton from '../components/AppButton';

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
            <View style={styles.page}>
                <PageHeader eyebrow="ADMIN SETTINGS" title="Create Staff Account" />
                <Card>
                    <TextField placeholder="Email" autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} />
                    <TextField placeholder="Password" secureTextEntry onChangeText={setPassword} />
                    <AppButton title={imageUri ? 'Change Photo' : 'Pick Photo (optional)'} variant="secondary" onPress={pickImage} />
                    {imageUri ? <Text style={styles.helperText}>Photo selected</Text> : null}
                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    <View style={{ height: 8 }} />
                    {loading ? <ActivityIndicator /> : (
                        <>
                            <AppButton title="Create Staff Account" onPress={handleCreateAccount} />
                            <View style={{ height: 10 }} />
                            <AppButton title="Create Admin Account" variant="secondary" onPress={handleCreateAdminAccount} />
                        </>
                    )}
                </Card>
                <AppButton title="Cancel" variant="outline" onPress={handleCancel} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        padding: 16,
    },
    page: {
        width: '100%',
        maxWidth: 480,
        alignSelf: 'center',
    },
    helperText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 8,
    },
    error: {
        color: COLORS.danger,
        textAlign: 'center',
        marginTop: 8,
    },
});

export default CreateStaffAccount;
