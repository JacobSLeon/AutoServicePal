import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useRegisterMutation } from '../store/api/apiSlice';
import { crossPlatformAlert } from '../utils/alert';

export default function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullNameV5, setFullNameV5] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  
  const [register, { isLoading }] = useRegisterMutation();

  const handleRegister = async () => {
    if (!email || !password || !fullNameV5 || !passwordConfirmation) {
      crossPlatformAlert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== passwordConfirmation) {
      crossPlatformAlert('Error', 'Passwords do not match');
      return;
    }

    try {
      await register({ 
        email, 
        password, 
        full_name_v5: fullNameV5,
        password_confirmation: passwordConfirmation 
      }).unwrap();
      crossPlatformAlert('Success', 'Account created successfully! Please log in.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (err: any) {
      console.error('Registration error:', err);
      
      let message = 'Registration failed. Please check your details.';
      
      // Handle 409 Conflict (Email already exists)
      if (err?.status === 409) {
        message = 'An account with this email already exists.';
      } 
      // Handle validation errors from backend
      else if (err?.data?.errors && Array.isArray(err.data.errors)) {
        message = err.data.errors.map((e: any) => e.message).join('\n');
      } 
      // Fallback to standard message
      else if (err?.data?.message) {
        message = err.data.message;
      }

      crossPlatformAlert('Registration Failed', message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Full Name (As on V5 logbook)"
        value={fullNameV5}
        onChangeText={setFullNameV5}
        autoCapitalize="words"
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        value={passwordConfirmation}
        onChangeText={setPasswordConfirmation}
        secureTextEntry
      />
      <Text style={styles.hint}>Password must be at least 8 characters long, contain 1 uppercase letter and 1 number.</Text>

      {isLoading ? (
        <ActivityIndicator size="large" />
      ) : (
        <Button title="Register" onPress={handleRegister} />
      )}

      <View style={styles.footer}>
        <Text>Already have an account? </Text>
        <Button title="Login" onPress={() => navigation.navigate('Login')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
});
