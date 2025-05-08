import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';

export default function CloudflarePage() {
  const [accountId, setAccountId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [tunnelId, setTunnelId] = useState('');

  const handleSubmit = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/v1/cloudflare/addcloudflared', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ accountId, apiKey, tunnelId }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', 'Cloudflare account added');
      } else {
        Alert.alert('Error', data.error || 'Failed to add Cloudflare account');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cloudflare Setup</Text>
      <TextInput placeholder="Account ID" value={accountId} onChangeText={setAccountId} style={styles.input} />
      <TextInput placeholder="API Key" value={apiKey} onChangeText={setApiKey} style={styles.input} secureTextEntry />
      <TextInput placeholder="Tunnel ID" value={tunnelId} onChangeText={setTunnelId} style={styles.input} />
      <Button title="Save" onPress={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 12 },
});
