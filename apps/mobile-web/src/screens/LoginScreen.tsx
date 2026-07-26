import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator } from 'react-native';
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
      <Text style={styles.title}>Welcome Back</Text>
      
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

      {isLoading ? (
        <ActivityIndicator size="large" />
      ) : (
        <Button title="Login" onPress={handleLogin} />
      )}

      <View style={styles.footer}>
        <Text>Don't have an account? </Text>
        <Button title="Register" onPress={() => navigation.navigate('Register')} />
      </View>
    </View>
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
});
