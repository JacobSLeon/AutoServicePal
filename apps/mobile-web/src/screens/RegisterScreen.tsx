import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
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

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/;
    if (!passwordRegex.test(password)) {
      crossPlatformAlert('Invalid Password', 'Password must be at least 8 characters long, contain 1 uppercase letter and 1 number.');
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
      
      if (err?.status === 409) {
        message = 'An account with this email already exists.';
      } else if (err?.data?.errors && Array.isArray(err.data.errors)) {
        message = err.data.errors.map((e: any) => e.message).join('\n');
      } else if (err?.data?.message) {
        message = err.data.message;
      }

      crossPlatformAlert('Registration Failed', message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join AUTO SERVICE PAL to manage your garage.</Text>
      </View>
      
      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Name as it appears on V5"
          placeholderTextColor={theme.colors.textSecondary}
          value={fullNameV5}
          onChangeText={setFullNameV5}
          autoCapitalize="words"
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={theme.colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={theme.colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor={theme.colors.textSecondary}
          value={passwordConfirmation}
          onChangeText={setPasswordConfirmation}
          secureTextEntry
        />
        <Text style={styles.hint}>Password must be at least 8 characters long, contain 1 uppercase letter and 1 number.</Text>

        {isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: theme.spacing.md }} />
        ) : (
          <TouchableOpacity style={styles.primaryButton} onPress={handleRegister}>
            <Text style={styles.primaryButtonText}>Register</Text>
          </TouchableOpacity>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

import { theme } from '../utils/theme';

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.bodySecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  formContainer: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.glass,
  },
  input: {
    backgroundColor: theme.colors.glass,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    ...theme.typography.body,
  },
  hint: {
    ...theme.typography.caption,
    marginBottom: theme.spacing.xl,
    color: theme.colors.textSecondary,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    ...theme.shadows.subtle,
  },
  primaryButtonText: {
    ...theme.typography.h3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
  },
  footerText: {
    ...theme.typography.bodySecondary,
  },
  linkText: {
    ...theme.typography.body,
    color: theme.colors.primaryLight,
    fontWeight: 'bold',
  }
});
