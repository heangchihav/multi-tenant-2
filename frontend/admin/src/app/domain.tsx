import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';

export default function DomainPage() {
  const [domainName, setDomainName] = useState('');

  const handleSubmit = async () => {
    try {
      const res = await fetch('/api/v1/domain/addDomain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ domainName }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', `Domain ${data.domain.name} added`);
      } else {
        Alert.alert('Error', data.error || 'Failed to add domain');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Domain Setup</Text>
      <TextInput placeholder="Domain Name" value={domainName} onChangeText={setDomainName} style={styles.input} />
      <Button title="Save Domain" onPress={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 12 },
});
