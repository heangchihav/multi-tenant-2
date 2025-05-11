import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import ProtectedRoute from '../components/ProtectedRoute';

// Define interface for template data
interface Template {
  id: string;
  name: string;
  label: string;
}

// Define interface for domain data
interface Domain {
  id: string;
  name: string;
  status: string;
}

export default function CreateClientPage() {
  return (
    <ProtectedRoute>
      <CreateClientContent />
    </ProtectedRoute>
  );
}

function CreateClientContent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  
  // Form data
  const [formData, setFormData] = useState({
    merchantName: '',
    username: '',
    password: '',
    confirmPassword: '',
    label: ''
  });

  // Fetch templates and domains on component mount
  useEffect(() => {
    fetchTemplates();
    fetchDomains();
  }, []);

  // Fetch templates from the API
  // Import the queued fetch utility
  const { queuedFetch } = require('../utils/requestQueue');

  const fetchTemplates = async () => {
    try {
      // Use queued fetch to prevent token rotation conflicts
      const data = await queuedFetch('http://localhost:80/api/v1/template/getTemplates', {
        method: 'GET'
      });

      if (data && data.data) {
        setTemplates(data.data || []);
      } else {
        throw new Error('Failed to fetch templates');
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
      setErrorMessage('Failed to load templates. Please try again later.');
    }
  };

  // Fetch domains from the API
  const fetchDomains = async () => {
    try {
      // Use queued fetch to prevent token rotation conflicts
      const data = await queuedFetch('http://localhost:80/api/v1/domain/list', {
        method: 'GET'
      });

      if (data && data.domains) {
        setDomains(data.domains || []);
      } else {
        throw new Error('Failed to fetch domains');
      }
    } catch (err) {
      console.error('Error fetching domains:', err);
      setErrorMessage('Failed to load domains. Please try again later.');
    }
  };

  // Handle form input changes
  const handleInputChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Toggle domain selection
  const toggleDomainSelection = (domainName: string) => {
    if (selectedDomains.includes(domainName)) {
      setSelectedDomains(selectedDomains.filter(d => d !== domainName));
    } else {
      setSelectedDomains([...selectedDomains, domainName]);
    }
  };

  // Create client function
  const handleCreateClient = async () => {
    // Reset error message
    setErrorMessage('');
    
    // Basic validation
    if (!formData.merchantName || !formData.username || !formData.password) {
      setErrorMessage('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (!selectedTemplate) {
      setErrorMessage('Please select a template');
      return;
    }

    if (selectedDomains.length === 0) {
      setErrorMessage('Please select at least one domain');
      return;
    }

    setIsLoading(true);
    try {
      // Step 1: Create the merchant and admin user
      const merchantData = await queuedFetch('http://localhost:80/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          createMerchant: true,
          merchantName: formData.merchantName
        }),
      });
      
      if (!merchantData || merchantData.error) {
        throw new Error(merchantData?.message || merchantData?.error || 'Failed to create merchant');
      }

      // Step 2: Create the website with the selected template
      const merchantId = merchantData.user.merchant.id;
      const websiteData = await queuedFetch('http://localhost:80/api/v1/client/website/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: merchantId,
          templateName: selectedTemplate,
          domains: selectedDomains,
          label: formData.label || `${formData.merchantName}'s Website`
        }),
      });
      
      if (!websiteData || websiteData.error) {
        throw new Error(websiteData?.message || websiteData?.error || 'Failed to set up website');
      }

      // Show success message
      Alert.alert(
        'Success', 
        'Client created successfully!',
        [{ text: 'OK', onPress: () => router.replace('/') }]
      );
      
    } catch (err: unknown) {
      console.error('Error creating client:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create client');
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
        <Text style={styles.headerTitle}>Create Client</Text>
      </View>

      <ScrollView style={styles.content}>
        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Information</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Merchant Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.merchantName}
              onChangeText={(text) => handleInputChange('merchantName', text)}
              placeholder="Enter merchant name"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Username *</Text>
            <TextInput
              style={styles.input}
              value={formData.username}
              onChangeText={(text) => handleInputChange('username', text)}
              placeholder="Enter username for admin account"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Password *</Text>
            <TextInput
              style={styles.input}
              value={formData.password}
              onChangeText={(text) => handleInputChange('password', text)}
              placeholder="Enter password"
              secureTextEntry
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Confirm Password *</Text>
            <TextInput
              style={styles.input}
              value={formData.confirmPassword}
              onChangeText={(text) => handleInputChange('confirmPassword', text)}
              placeholder="Confirm password"
              secureTextEntry
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Website Label (Optional)</Text>
            <TextInput
              style={styles.input}
              value={formData.label}
              onChangeText={(text) => handleInputChange('label', text)}
              placeholder="Enter website label"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Template *</Text>
          {templates.length === 0 ? (
            <Text>No templates available</Text>
          ) : (
            <ScrollView horizontal style={styles.templateList}>
              {templates.map((template) => (
                <TouchableOpacity
                  key={template.id}
                  style={[
                    styles.templateCard,
                    selectedTemplate === template.name && styles.selectedCard
                  ]}
                  onPress={() => setSelectedTemplate(template.name)}
                >
                  <Text style={styles.templateName}>{template.label}</Text>
                  <Text style={styles.templateId}>{template.name}</Text>
                  {selectedTemplate === template.name && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Domains *</Text>
          {domains.length === 0 ? (
            <Text>No domains available</Text>
          ) : (
            <View style={styles.domainList}>
              {domains.map((domain) => (
                <TouchableOpacity
                  key={domain.id}
                  style={[
                    styles.domainCard,
                    selectedDomains.includes(domain.name) && styles.selectedCard
                  ]}
                  onPress={() => toggleDomainSelection(domain.name)}
                >
                  <Text style={styles.domainName}>{domain.name}</Text>
                  <Text style={styles.domainStatus}>{domain.status}</Text>
                  {selectedDomains.includes(domain.name) && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title={isLoading ? "Creating..." : "Create Client"}
            onPress={handleCreateClient}
            disabled={isLoading}
          />
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
  },
  templateList: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  templateCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    marginRight: 12,
    width: 180,
    height: 100,
    justifyContent: 'center',
    position: 'relative',
  },
  selectedCard: {
    borderColor: '#4caf50',
    borderWidth: 2,
    backgroundColor: '#f1f8e9',
  },
  templateName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  templateId: {
    fontSize: 12,
    color: '#666',
  },
  domainList: {
    marginBottom: 16,
  },
  domainCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    position: 'relative',
  },
  domainName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  domainStatus: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginTop: 16,
    marginBottom: 32,
  },
});
