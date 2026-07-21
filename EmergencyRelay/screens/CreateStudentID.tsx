import React from "react";
import { View, Text, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import Student from "../models/Student";
import { createStudentServer } from "../services/api";
import { COLORS } from "../constants/theme";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import TextField from "../components/TextField";
import AppButton from "../components/AppButton";

export default function CreateStudentID() {
  const { user } = useAuth();
  const navigation = useNavigation();
  let [firstName, setFirstName] = React.useState('');
  let [lastName, setLastName] = React.useState('');
  const [imageUri, setImageUri] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

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

  const handleCreateID = async () => {
    if (!firstName.trim() || !lastName.trim()) return Alert.alert('Error', 'First and last name required');
    setSaving(true);
    try {
      // ensure user is signed in (server requires auth)
      if (!user) {
        setSaving(false);
        Alert.alert('Not signed in', 'You must sign in before creating students');
        navigation.goBack();
        return;
      }
      const payload = { firstName: firstName.trim(), lastName: lastName.trim(), imageUrl: imageUri || undefined };
      const created = await createStudentServer(payload);
      Alert.alert('Success', 'Student created');
      navigation.goBack();
    } catch (err) {
      console.error('create student failed', err);
      // helpful messaging for common dev issues
      const msg = err && err.message ? err.message : 'Create failed';
      if (msg === 'no_token' || (err && err.status === 401)) {
        Alert.alert('Not signed in', 'Please sign in before creating students');
      } else if (err && err.status === 404) {
        Alert.alert('Server error', 'Server endpoint not found (POST /students). Try restarting the dev server.');
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setSaving(false);
    }
  }

  const handleCancel = () => {
    // Logic to navigate back to the previous screen
    // This can be implemented using React Navigation's useNavigation hook
    navigation.goBack();
  }

  return (
    <View style={styles.container}>
      <View style={styles.page}>
        <PageHeader eyebrow="ADMIN SETTINGS" title="Create Student ID" />
        <Card>
          <TextField placeholder="First Name" onChangeText={setFirstName} />
          <TextField placeholder="Last Name" onChangeText={setLastName} />
          <AppButton title={imageUri ? 'Change Photo' : 'Pick Photo'} variant="secondary" onPress={pickImage} />
          {imageUri ? <Text style={styles.helperText}>Photo selected</Text> : null}
          <View style={{ height: 8 }} />
          {saving ? <ActivityIndicator /> : <AppButton title="Create Student" onPress={handleCreateID} />}
        </Card>
        <AppButton title="Cancel" variant="outline" onPress={handleCancel} />
      </View>
    </View>
  );
};

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
});
