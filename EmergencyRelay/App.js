import { createStackNavigator } from '@react-navigation/stack';
import Login from './screens/Login';
import DashboardStaff from './screens/DashboardStaff';
import DashboardAdmin from './screens/DashboardAdmin';
import CreateStaffAccount from './screens/CreateStaffAccount';
const Stack = createStackNavigator();
import { NavigationContainer } from '@react-navigation/native';
import { StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function RootNavigator() {
  const { user, isAdmin } = useAuth();

  if (!user) {
    return (
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={Login} />
      </Stack.Navigator>
    );
  }

  if (isAdmin()) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="DashboardAdmin" component={DashboardAdmin} />
        <Stack.Screen name="CreateStaffAccount" component={CreateStaffAccount} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardStaff" component={DashboardStaff} />
    </Stack.Navigator>
  );
}

// then in the default export:
export default function App() {
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
