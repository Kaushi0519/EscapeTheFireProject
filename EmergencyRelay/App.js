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
import Instructions from './screens/Instructions';
const Stack = createStackNavigator();
import { NavigationContainer } from '@react-navigation/native';
import { StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import * as Location from 'expo-location';

async function requestLocationPermission() {
  let { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    console.log('Location permission denied');
    return false;
  } else {
    console.log('Location permission granted');
    return true;
  }
}


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
      <Stack.Navigator screenOptions={{ headerShown: true }}>
        <Stack.Screen name="DashboardAdmin" component={DashboardAdmin} />
        <Stack.Screen name="CreateStaffAccount" component={CreateStaffAccount} />
        <Stack.Screen name="DeleteStaffAccount" component={DeleteStaffAccount} />
        <Stack.Screen name="DeleteStudentAccount" component={DeleteStudentAccount} />
        <Stack.Screen name="RostersAdmin" component={RostersAdmin} />
        <Stack.Screen name="CreateStudentID" component={CreateStudentID} />
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

  requestLocationPermission();

  return (
    <NavigationContainer>
      <AuthProvider>
        <RootNavigator />
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
