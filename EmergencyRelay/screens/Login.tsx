import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, RADIUS, CARD_SHADOW } from '../constants/theme';
import TextField from '../components/TextField';
import AppButton from '../components/AppButton';

const Login = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { signIn } = useAuth();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    try {
      setError('');
      setSubmitting(true);
      await signIn(email, password);
    } catch (err) {
      console.error('Login failed', err);
      if (err && (err.status === 401 || err.status === 400)) setError('Invalid email or password');
      else if (err && err.message) setError(`Login failed: ${err.message}`);
      else setError('Login failed — check your connection or try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image style={styles.logo} source={require('../assets/BoysAndGirlsClubLogo.png')} />
        <Text style={styles.eyebrow}>EMERGENCY RELAY</Text>
        <Text style={styles.title}>Emergency Management</Text>

        <TextField
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextField
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!isPasswordVisible}
          rightAccessory={
            <TouchableOpacity style={styles.toggleButton} onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
              <Text style={styles.toggleText}>{isPasswordVisible ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          }
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={{ height: 8 }} />
        <AppButton title="Login" onPress={handleLogin} loading={submitting} />
        <View style={{ height: 10 }} />
        <AppButton title="Instructions" variant="secondary" onPress={() => (navigation as any).navigate('Instructions')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: COLORS.background,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 24,
    ...CARD_SHADOW,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginBottom: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
  toggleButton: {
    paddingHorizontal: 14,
  },
  toggleText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  error: {
    color: COLORS.danger,
    marginBottom: 4,
    textAlign: 'center',
    fontSize: 13,
  },
});

export default Login;
