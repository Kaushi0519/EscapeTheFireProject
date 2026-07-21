import { createStackNavigator } from '@react-navigation/stack';
import Login from './screens/Login';
import DashboardStaff from './screens/DashboardStaff';
import DashboardAdmin from './screens/DashboardAdmin';
import CreateStaffAccount from './screens/CreateStaffAccount';
import DeleteStaffAccount from './screens/DeleteStaffAccount';
import DeleteStudentAccount from './screens/DeleteStudentAccount';
import RostersAdmin from './screens/RostersAdmin';
import RostersStaff from './screens/RostersStaff';
import CreateStudentID from './screens/CreateStudentID';
import MapAdmin from './screens/MapAdmin';
import MapStaff from './screens/MapStaff';
const Stack = createStackNavigator();
import { NavigationContainer } from '@react-navigation/native';
import { Platform, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import * as Location from 'expo-location';
import { PermissionsAndroid } from 'react-native';
import { useEffect } from 'react';


function RootNavigator() {
  const { user, isAdmin } = useAuth();

  if (!user) { // Permissions for pages non-users can view
    return (
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={Login} />
      </Stack.Navigator>
    );
  }

  if (isAdmin()) { // Permissions for pages admin can view
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="DashboardAdmin" component={DashboardAdmin} />
        <Stack.Screen name="CreateStaffAccount" component={CreateStaffAccount} />
        <Stack.Screen name="DeleteStaffAccount" component={DeleteStaffAccount} />
        <Stack.Screen name="DeleteStudentAccount" component={DeleteStudentAccount} />
        <Stack.Screen name="RostersAdmin" component={RostersAdmin} />
        <Stack.Screen name="CreateStudentID" component={CreateStudentID} />
        <Stack.Screen name="MapAdmin" component={MapAdmin} />
      </Stack.Navigator>
    );
  }

  return (  // Permissions for pages staff can view
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardStaff" component={DashboardStaff} />
      <Stack.Screen name="RostersStaff" component={RostersStaff} />
      <Stack.Screen name="MapStaff" component={MapStaff} />
    </Stack.Navigator>
  );
}

function requestLocationPermission() {
  useEffect(() => {
    (async () => {
      await Location.requestForegroundPermissionsAsync();
    })();
  }, []);
}

export default function App() {
  requestLocationPermission();

  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
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
