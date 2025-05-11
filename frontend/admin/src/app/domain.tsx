import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import ProtectedRoute from '../components/ProtectedRoute';

interface Domain {
  id: string;
  name: string;
  ns1: string;
  ns2: string;
  status: string;
  createdAt: string;
}

export default function DomainPage() {
  return (
    <ProtectedRoute>
      <DomainContent />
    </ProtectedRoute>
  );
}

function DomainContent() {
  const router = useRouter();
  const [domainName, setDomainName] = useState('');
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch domains on component mount
  useEffect(() => {
    fetchDomains();
  }, []);

  // Import the queued fetch utility
  const { queuedFetch } = require('../utils/requestQueue');

  // Function to fetch domains
  const fetchDomains = async () => {
    setIsLoading(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      
      if (!accessToken) {
        setErrorMessage('Authentication token not found. Please log in again.');
        return;
      }
      
      // Use queued fetch to prevent token rotation conflicts
      const data = await queuedFetch('http://localhost:80/api/v1/domain/list', {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
        },
      });
      
      // queuedFetch already handles response status checks
      if (data && data.domains) {
        setDomains(data.domains || []);
      } else {
        setErrorMessage((data && data.error) || 'Failed to fetch domains');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'An error occurred while fetching domains');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission to add a new domain
  const handleSubmit = async () => {
    // Reset error message
    setErrorMessage('');
    
    if (!domainName) {
      setErrorMessage('Please enter a domain name');
      return;
    }
    
    setIsLoading(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      
      if (!accessToken) {
        setErrorMessage('Authentication token not found. Please log in again.');
        return;
      }
      
      const res = await fetch('http://localhost:80/api/v1/domain/addDomain', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': accessToken,
        },
        credentials: 'include',
        body: JSON.stringify({ domainName }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        Alert.alert(
          'Success', 
          data.message || `Domain ${data.domain.name} added successfully. Please configure your domain's nameservers.`
        );
        setDomainName(''); // Clear the input field
        fetchDomains(); // Refresh the domain list
      } else {
        setErrorMessage(data.error || 'Failed to add domain');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'An error occurred while adding the domain');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Domain Management</Text>
      </View>

      <ScrollView style={styles.content}>
        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add New Domain</Text>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Domain Name</Text>
            <TextInput 
              placeholder="Enter domain name (e.g., example.com)" 
              value={domainName} 
              onChangeText={setDomainName} 
              style={styles.input} 
              autoCapitalize="none"
            />
          </View>
          <Button 
            title={isLoading ? "Adding..." : "Add Domain"} 
            onPress={handleSubmit} 
            disabled={isLoading}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Domains</Text>
          {domains.length === 0 ? (
            <Text style={styles.emptyText}>No domains found. Add your first domain above.</Text>
          ) : (
            domains.map(domain => (
              <View key={domain.id} style={styles.domainCard}>
                <View style={styles.domainHeader}>
                  <Text style={styles.domainName}>{domain.name}</Text>
                  <View style={[styles.statusBadge, 
                    domain.status === 'ACTIVE' ? styles.statusActive : 
                    domain.status === 'PENDING' ? styles.statusPending : styles.statusInactive
                  ]}>
                    <Text style={styles.statusText}>{domain.status}</Text>
                  </View>
                </View>
                
                <View style={styles.nameserverContainer}>
                  <Text style={styles.nameserverLabel}>Nameservers:</Text>
                  <View style={styles.nameserverBox}>
                    <Text style={styles.nameserverText}>{domain.ns1}</Text>
                  </View>
                  <View style={styles.nameserverBox}>
                    <Text style={styles.nameserverText}>{domain.ns2}</Text>
                  </View>
                </View>
                
                <Text style={styles.instructionText}>
                  Configure these nameservers in your domain registrar (e.g., Namecheap) to activate this domain.
                </Text>
                
                <Text style={styles.dateText}>Added on {new Date(domain.createdAt).toLocaleDateString()}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#0066cc',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  emptyText: {
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  domainCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  domainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  domainName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBadge: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  statusActive: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4caf50',
    borderWidth: 1,
  },
  statusPending: {
    backgroundColor: '#fff8e1',
    borderColor: '#ffc107',
    borderWidth: 1,
  },
  statusInactive: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  nameserverContainer: {
    marginBottom: 12,
  },
  nameserverLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  nameserverBox: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  nameserverText: {
    fontFamily: 'monospace',
    fontSize: 14,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
});
