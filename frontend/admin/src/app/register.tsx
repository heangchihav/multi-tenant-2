import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import AuthRedirect from '../components/AuthRedirect';

export default function RegisterPage() {
  return (
    <AuthRedirect>
      <RegisterContent />
    </AuthRedirect>
  );
}

function RegisterContent() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [isRootAccount, setIsRootAccount] = useState(true); // Default to root account
  const [parentMerchantId, setParentMerchantId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  const handleRegister = async () => {
    // Reset error message
    setErrorMessage('');
    
    // Basic validation
    if (!username || !password) {
      setErrorMessage('Please enter both username and password');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    // Validate merchant information
    if (isRootAccount && !merchantName) {
      setErrorMessage('Please enter a merchant name for the root account');
      return;
    }

    if (!isRootAccount && !parentMerchantId) {
      setErrorMessage('Please enter a parent merchant ID for the sub-account');
      return;
    }

    setIsLoading(true);
    try {
      // Prepare request body based on account type
      const requestBody = isRootAccount
        ? { 
            username, 
            password,
            createMerchant: true,
            merchantName
          }
        : { 
            username, 
            password,
            merchantId: parentMerchantId
          };

      const res = await fetch('http://localhost:80/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important for cookies
        body: JSON.stringify(requestBody),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Store authentication state and tokens in localStorage
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('username', username);
        
        if (data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
        }
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        
        // Show success message
        Alert.alert('Success', 'Registration successful');
        
        // Navigate to dashboard immediately
        setTimeout(() => {
          router.replace('/');
        }, 500);
      } else {
        // Extract detailed error message from response
        const errorMsg = data.message || data.error || 
                        (data.errors && data.errors.length > 0 ? data.errors[0].message : null) ||
                        'Registration failed';
        
        setErrorMessage(errorMsg);
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Registration</Text>
      
      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}
      
      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
        autoCapitalize="none"
      />
      
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      
      <TextInput
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        style={styles.input}
      />
      
      {/* Account Type Selection */}
      <View style={styles.switchContainer}>
        <Text>Root Account</Text>
        <Switch
          value={isRootAccount}
          onValueChange={setIsRootAccount}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
        />
      </View>
      
      {/* Merchant Information - conditionally rendered based on account type */}
      {isRootAccount ? (
        <TextInput
          placeholder="Merchant Name"
          value={merchantName}
          onChangeText={setMerchantName}
          style={styles.input}
        />
      ) : (
        <TextInput
          placeholder="Parent Merchant ID"
          value={parentMerchantId}
          onChangeText={setParentMerchantId}
          style={styles.input}
        />
      )}
      
      <Text style={styles.infoText}>
        {isRootAccount 
          ? "This is a root account. A new merchant will be created."
          : "This is a sub-account. It will inherit merchant information from the parent."}
      </Text>
      
      <Button
        title={isLoading ? "Registering..." : "Register"}
        onPress={handleRegister}
        disabled={isLoading}
      />
      
      <View style={styles.loginLink}>
        <Text>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/login')}>
          <Text style={styles.link}>Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
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
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  link: {
    color: 'blue',
    textDecorationLine: 'underline',
  },
});
