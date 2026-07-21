import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function MapAdminWeb() {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <Text style={styles.title}>Map not supported on web</Text>
        <Text style={styles.sub}>Use an iOS/Android build to view the full map screen.</Text>
      </View>
      <Button title="Back" onPress={() => (navigation as any).goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 12,
  },
  body: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    textAlign: 'center',
    color: '#333',
  },
});