import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useLoginMutation, useSyncVehiclesMutation, useLazyGetVehiclesQuery } from '../store/api/apiSlice';
import { setCredentials } from '../store/slices/authSlice';
import { RootState } from '../store/store';
import { setVehicles } from '../store/slices/vehicleSlice';
import { crossPlatformAlert } from '../utils/alert';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [login, { isLoading }] = useLoginMutation();
  const [syncVehicles] = useSyncVehiclesMutation();
  const [getVehicles] = useLazyGetVehiclesQuery();
  const dispatch = useDispatch();

  const localVehicles = useSelector((state: RootState) => state.vehicles.vehicles);

  const handleLogin = async () => {
    if (!email || !password) {
      crossPlatformAlert('Error', 'Please enter both email and password');
      return;
    }

    try {
      const response = await login({ email, password }).unwrap();
      
      // Store credentials in Redux
      dispatch(setCredentials({
        user: response.data.user,
        token: response.data.token,
      }));

      // Option A: Merge/Sync Guest Vehicles automatically
      const guestVehicles = localVehicles.filter(v => v.isGuest);
      if (guestVehicles.length > 0) {
        try {
          const syncResponse = await syncVehicles(guestVehicles).unwrap();
          if (syncResponse.data && Array.isArray(syncResponse.data.vehicles)) {
             const mergedVehicles = syncResponse.data.vehicles.map((v: any) => ({
                id: v.id.toString(),
                registrationNumber: v.registrationNumber,
                make: v.make,
                model: v.model,
                colour: v.colour,
                motStatus: v.motStatus || 'Unknown',
                motDueDate: v.motExpiryDate,
                taxStatus: v.taxStatus || 'Unknown',
                taxDueDate: v.taxDueDate,
                isVerified: v.isVerified || false,
                isGuest: false,
             }));
             dispatch(setVehicles(mergedVehicles));
          }
          crossPlatformAlert('Sync Complete', 'Your guest vehicles have been saved to your account!');
        } catch (syncErr) {
          console.error('Error syncing vehicles:', syncErr);
          crossPlatformAlert('Sync Warning', 'Logged in, but failed to sync guest vehicles. You may need to re-add them.');
        }
      } else {
        // No guest vehicles to sync, but we should fetch their existing cloud garage!
        try {
          const cloudVehicles = await getVehicles().unwrap();
          if (cloudVehicles.data && Array.isArray(cloudVehicles.data.vehicles)) {
             const mappedVehicles = cloudVehicles.data.vehicles.map((v: any) => ({
                id: v.id.toString(),
                registrationNumber: v.registration_number,
                make: v.make,
                model: v.model,
                colour: v.colour,
                motStatus: 'Unknown',
                taxStatus: 'Unknown',
                isVerified: v.is_v5_verified || false,
                isGuest: false,
             }));
             dispatch(setVehicles(mappedVehicles));
          }
        } catch (getErr) {
          console.error('Error fetching vehicles:', getErr);
        }
      }

      navigation.navigate('MainTabs');
    } catch (err: any) {
      const message = err?.data?.message || 'Login failed. Please check your credentials.';
      crossPlatformAlert('Login Failed', message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logoIcons}>🚗 🏍️ 🚐</Text>
        <Text style={styles.title}>AUTO SERVICE PAL</Text>
        <Text style={styles.subtitle}>All your vehicle service history in one place.</Text>
      </View>
      
      <View style={styles.formContainer}>
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

        <TouchableOpacity 
          style={styles.forgotPassword} 
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        {isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: theme.spacing.md }} />
        ) : (
          <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
            <Text style={styles.primaryButtonText}>Log In</Text>
          </TouchableOpacity>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkText}>Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

import { theme } from '../utils/theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  logoIcons: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: theme.spacing.xl,
  },
  forgotPasswordText: {
    ...theme.typography.caption,
    color: theme.colors.primaryLight,
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
