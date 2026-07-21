import React, { useEffect } from 'react';
import { StyleSheet, View, Button, Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Configure how the app handles notifications when it's open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  
  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Enable notifications to receive alerts.');
    }
  };

  const sendEmergencyAlert = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🚨 Emergency Alert",
        body: "This is a priority notification.",
        data: { data: 'goes here' },
        sound: true, // Requires 'sound: true' in the handler above
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null, // 'null' sends it immediately
    });
  };

  return (
    <View style={styles.container}>
      <Button 
        title="Send Emergency Alert" 
        onPress={sendEmergencyAlert} 
        color="#FF0000"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});