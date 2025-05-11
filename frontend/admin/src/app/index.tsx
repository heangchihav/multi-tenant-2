import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import ProtectedRoute from '../components/ProtectedRoute';

export default function Page() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const router = useRouter();
  const [username, setUsername] = useState<string>('');

  // Get username from localStorage on component mount
  React.useEffect(() => {
    try {
      const storedUsername = localStorage.getItem('username') || '';
      setUsername(storedUsername);
    } catch (error) {
      console.error('Error accessing localStorage:', error);
    }
  }, []);

  const handleLogout = () => {
    // Call logout API
    fetch('http://localhost:80/api/v1/auth/logout', {
      method: 'GET',
      credentials: 'include',
    }).catch(error => {
      console.error('Error during logout:', error);
    }).finally(() => {
      // Clear authentication data
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('username');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      // Redirect to login page
      router.replace('/login' as any);
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {username}</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.main}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <View style={styles.buttonContainer}>
          <Button title="Cloudflare Setup" onPress={() => router.push('/cloudflare')} />
        </View>
        <View style={styles.buttonContainer}>
          <Button title="Domain Setup" onPress={() => router.push('/domain')} />
        </View>
        <View style={styles.buttonContainer}>
          <Button title="Template Management" onPress={() => router.push('/template' as any)} />
        </View>
        <View style={styles.buttonContainer}>
          <Button title="Client Setup" onPress={() => router.push('/createclient' as any)} />
        </View>
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  logoutText: {
    color: '#333',
  },
  main: {
    width: '100%',
    maxWidth: 960,
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 16,
  },
});
