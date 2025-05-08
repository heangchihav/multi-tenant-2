import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useRouter } from 'expo-router';

export default function Page() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <View style={styles.main}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Button title="Cloudflare Setup" onPress={() => router.push('/cloudflare')} />
        <Button title="Domain Setup" onPress={() => router.push('/domain')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  main: {
    width: '100%',
    maxWidth: 960,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 24,

  },
});
