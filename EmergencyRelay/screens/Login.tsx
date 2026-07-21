/**
 * Developer Notes:
 * - This screen is the entry point for users to log in to the app.
 * - It uses the AuthContext to handle authentication logic.
 * - On successful login, the user is navigated to the appropriate dashboard based on their role.
 * - Empty usernames and passwords and used usernames are handled with error messages.
 */

import {View, Text, TextInput, Button, StyleSheet, Image} from 'react-native';
import React, {useState} from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, getAccessToken } = useAuth();
  const [error, setError] = useState('');

  const handleLogin = async () => { // Handle login button press, navigate to appropriate dashboard on success, show error on failure
  try {
    setError('');
    await signIn(email, password);
  } catch (err) {
    console.error('Login failed', err);
    if (err && (err.status === 401 || err.status === 400)) setError('Invalid email or password');
    else if (err && err.message) setError(`Login failed: ${err.message}`);
    else setError('Login failed — check your connection or try again');
  }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emergency Management</Text>
      <TextInput // Email input field
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput // Password input field
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry // hides the password input
      />
      <Button title="Login" onPress={handleLogin} />
      <Text style={styles.error}>{error}</Text> 
  <Image style={styles.logo} source={require('../assets/BoysAndGirlsClubLogo.png')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
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
  logo: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
    marginTop: 20,
    alignSelf: 'center',
  },
  error: {
    color: 'red',
    marginTop: 10,
  }
});


export default Login;