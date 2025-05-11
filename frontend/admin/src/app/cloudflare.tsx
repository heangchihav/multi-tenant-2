import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import ProtectedRoute from '../components/ProtectedRoute';

export default function CloudflarePage() {
  return (
    <ProtectedRoute>
      <CloudflareContent />
    </ProtectedRoute>
  );
}

function CloudflareContent() {
  const [accountId, setAccountId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [tunnelId, setTunnelId] = useState('');

  const handleSubmit = async () => {
    try {
      // Get the access token from localStorage
      const accessToken = localStorage.getItem('accessToken');
      
      if (!accessToken) {
        Alert.alert('Error', 'Authentication token not found. Please log in again.');
        return;
      }
      
      // Use the full URL to ensure proper routing through Nginx
      const res = await fetch('http://localhost:80/api/v1/cloudflare/addcloudflared', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': accessToken, // Include the access token in the Authorization header
          // The X-CSRF-TOKEN header will be automatically included from the cookie
        },
        credentials: 'include', // This is crucial - it ensures cookies are sent with the request
        body: JSON.stringify({ 
          accountId, 
          apiKey,
          tunnelId
        }),
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
      <TextInput placeholder="Tunnel ID (optional)" value={tunnelId} onChangeText={setTunnelId} style={styles.input} />
      <Button title="Save" onPress={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 12 },
});
