import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Button, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import ProtectedRoute from '../components/ProtectedRoute';

export default function TemplatePage() {
  return (
    <ProtectedRoute>
      <TemplateContent />
    </ProtectedRoute>
  );
}

function TemplateContent() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Array<{id: string; name: string; label: string; createdAt: string; updatedAt: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    label: ''
  });

  // Fetch templates on component mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Import the queued fetch utility
  const { queuedFetch } = require('../utils/requestQueue');

  // Function to fetch templates
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      // Use queued fetch to prevent token rotation conflicts
      const data = await queuedFetch('http://localhost:80/api/v1/template/getTemplates', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // queuedFetch already handles response status checks
      if (data && data.data) {
        setTemplates(data.data || []);
      } else {
        throw new Error((data && data.error) || 'Failed to fetch templates');
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!formData.name || !formData.label) {
      Alert.alert('Validation Error', 'Template name and label are required');
      return;
    }

    try {
      const response = await fetch('http://localhost:80/api/v1/template/addTemplate', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add template');
      }

      // Reset form and refresh templates
      setFormData({ name: '', label: '' });
      Alert.alert('Success', 'Template added successfully');
      fetchTemplates();
    } catch (err: unknown) {
      console.error('Error adding template:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add template');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Template Management</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add New Template</Text>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Template Name</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => handleInputChange('name', text)}
              placeholder="Enter template name (e.g., portfolio, ecommerce)"
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Display Label</Text>
            <TextInput
              style={styles.input}
              value={formData.label}
              onChangeText={(text) => handleInputChange('label', text)}
              placeholder="Enter friendly display name"
            />
          </View>
          <Button title="Add Template" onPress={handleSubmit} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Existing Templates</Text>
          {loading ? (
            <Text>Loading templates...</Text>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : templates.length === 0 ? (
            <Text>No templates found. Add your first template above.</Text>
          ) : (
            templates.map((template) => (
              <View key={template.id} style={styles.templateCard}>
                <Text style={styles.templateName}>{template.name}</Text>
                <Text style={styles.templateLabel}>{template.label}</Text>
                <Text style={styles.templateId}>ID: {template.id}</Text>
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
  errorText: {
    color: 'red',
    marginBottom: 16,
  },
  templateCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    padding: 12,
    marginBottom: 8,
  },
  templateName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  templateLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  templateId: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
});
