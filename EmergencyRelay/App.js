/**
 * Development notes:
 * - Every time a new page is created, it must be added to the RootNavigator function in this file with the appropriate permissions (admin, staff, or non-user).
 * - All pages that a staff member is expected to view should be listed in the staff Stack.Navigator, and all pages that an admin is expected to view should be listed in the admin Stack.Navigator.
 * - Do not edit the App component unless you know what you're doing, as it sets up important context and navigation for the app.
 */

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
import { StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function RootNavigator() {
  const { user, isAdmin } = useAuth();

  if (!user) { // Permissions for pages non-users can view
    return (
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={Login} />
      </Stack.Navigator>
    );
  }

  if (isAdmin()) { // Permissions for pages admin can view (all pages an admin is expected to view should be listed here)
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

  return (  // Permissions for pages staff can view (all pages a staff member is expected to view should be listed here)
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardStaff" component={DashboardStaff} />
      <Stack.Screen name="RostersStaff" component={RostersStaff} />
      <Stack.Screen name="MapStaff" component={MapStaff} />
    </Stack.Navigator>
  );
}

export default function App() {  // Main app component that sets up navigation and authentication context (do not edit unless you know what you're doing)
  return (
    <NavigationContainer>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </NavigationContainer>
  );
}

