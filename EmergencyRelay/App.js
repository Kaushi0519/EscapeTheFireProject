import { createStackNavigator } from '@react-navigation/stack';
import Login from './screens/Login';
import DashboardStaff from './screens/DashboardStaff';
import DashboardAdmin from './screens/DashboardAdmin';
import CreateStaffAccount from './screens/CreateStaffAccount';
import RostersAdmin from './screens/RostersAdmin';
import RostersStaff from './screens/RostersStaff';
import CreateStudentID from './screens/CreateStudentID';
import EditStudentID from './screens/EditStudentID';
import EditStaffAccount from './screens/EditStaffAccount';
import MapAdmin from './screens/MapAdmin';
import MapStaff from './screens/MapStaff';
import Instructions from './screens/Instructions';
const Stack = createStackNavigator();
import { NavigationContainer } from '@react-navigation/native';
import { StyleSheet, Platform } from 'react-native';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { EmergencyProvider } from './contexts/EmergencyContext';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

// Set notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function requestLocationPermission() {
  let { foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  let { backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (foregroundStatus !== 'granted' || backgroundStatus !== 'granted') {
    console.log('Location permission denied');
    return false;
  } else {
    console.log('Location permission granted');
    return true;
  }
}

async function requestNotificationPermissions() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permission denied');
      return false;
    }
    console.log('Notification permission granted');
    return true;
  } catch (e) {
    console.error('Failed to request notification permissions:', e);
    return false;
  }
}

async function getPushToken() {
  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch (e) {
    console.error('Failed to get push token:', e);
    return null;
  }
}

async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('emergency-alerts', {
      name: 'Emergency Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }
}


function RootNavigator() {
  const { user, isAdmin } = useAuth();

  if (!user) { // Permissions for pages non-users can view
    return (
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Instructions" component={Instructions} options={{ headerShown: true }} />
      </Stack.Navigator>
    );
  }

  if (isAdmin()) { // Permissions for pages admin can view
    return (
      <Stack.Navigator screenOptions={{ headerShown: true }}>
        <Stack.Screen name="DashboardAdmin" component={DashboardAdmin} />
        <Stack.Screen name="CreateStaffAccount" component={CreateStaffAccount} />
        <Stack.Screen name="RostersAdmin" component={RostersAdmin} />
        <Stack.Screen name="CreateStudentID" component={CreateStudentID} />
        <Stack.Screen name="EditStudentID" component={EditStudentID} />
        <Stack.Screen name="EditStaffAccount" component={EditStaffAccount} />
        <Stack.Screen name="MapAdmin" component={MapAdmin} />
        <Stack.Screen name="Instructions" component={Instructions} />
      </Stack.Navigator>
    );
  }

  return (  // Permissions for pages staff can view
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="DashboardStaff" component={DashboardStaff} />
      <Stack.Screen name="RostersStaff" component={RostersStaff} />
      <Stack.Screen name="MapStaff" component={MapStaff} />
      <Stack.Screen name="Instructions" component={Instructions} />
    </Stack.Navigator>
  );
}



export default function App() {
  useEffect(() => {
    async function setup() {
      await requestLocationPermission();
      await requestNotificationPermissions();
      await setupNotificationChannel();
    }
    setup();

    // Set up notification listener for when notifications are received
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    return () => subscription.remove();
  }, []);

  return (
    <NavigationContainer>
      <AuthProvider>
        <EmergencyProvider>
          <RootNavigator />
        </EmergencyProvider>
      </AuthProvider>
    </NavigationContainer>
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
