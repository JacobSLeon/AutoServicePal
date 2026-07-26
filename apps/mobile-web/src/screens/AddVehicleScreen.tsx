import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useLazyLookupVehicleQuery, useAddVehicleMutation } from '../store/api/apiSlice';
import { addVehicle as addLocalVehicle } from '../store/slices/vehicleSlice';
import { RootState } from '../store/store';
import { crossPlatformAlert } from '../utils/alert';

export default function AddVehicleScreen({ navigation }: any) {
  const [regNumber, setRegNumber] = useState('');
  const [triggerLookup, { data, isLoading: isLookingUp, error }] = useLazyLookupVehicleQuery();
  const [addVehicleToCloud, { isLoading: isAdding }] = useAddVehicleMutation();
  const dispatch = useDispatch();

  const token = useSelector((state: RootState) => state.auth.token);
  const isAuthenticated = !!token;

  const handleLookup = () => {
    if (!regNumber.trim()) return;
    triggerLookup(regNumber.toUpperCase());
  };

  const handleAdd = async () => {
    if (data) {
      if (isAuthenticated) {
        try {
          const response = await addVehicleToCloud({
            registration_number: data.registrationNumber,
            make: data.make,
            model: data.model || 'Unknown Model',
            sub_model: null,
            colour: data.colour,
          }).unwrap();
          
          const v = response.data.vehicle;
          
          dispatch(addLocalVehicle({
            id: v.id.toString(),
            registrationNumber: v.registration_number,
            make: v.make,
            model: v.model,
            colour: v.colour,
            motStatus: data.motStatus || 'Unknown',
            motDueDate: data.motExpiryDate || 'Unknown',
            taxStatus: data.taxStatus || 'Unknown',
            taxDueDate: data.taxDueDate || 'Unknown',
            isVerified: false,
            isGuest: false,
          }));
          
          crossPlatformAlert('Success', 'Vehicle added to your account.', [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
        } catch (err: any) {
          crossPlatformAlert('Error', err?.data?.message || 'Failed to add vehicle to your account.');
        }
      } else {
        dispatch(addLocalVehicle({
          id: new Date().getTime().toString(),
          registrationNumber: data.registrationNumber,
          make: data.make,
          model: data.model || 'Unknown Model',
          colour: data.colour,
          motStatus: data.motStatus,
          motDueDate: data.motExpiryDate,
          taxStatus: data.taxStatus,
          taxDueDate: data.taxDueDate,
          isVerified: false,
          isGuest: true,
        }));
        crossPlatformAlert('Success', 'Vehicle added locally as a Guest.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Enter Registration Number</Text>
      
      <View style={styles.plateInputContainer}>
        <View style={styles.ukPlateBlueBandLarge}>
          <Text style={styles.ukPlateGBLarge}>GB</Text>
        </View>
        <TextInput
          style={styles.plateInput}
          placeholder="AB12 CDE"
          placeholderTextColor="rgba(0,0,0,0.3)"
          value={regNumber}
          onChangeText={setRegNumber}
          autoCapitalize="characters"
          maxLength={8}
        />
      </View>
      
      <TouchableOpacity 
        style={[styles.primaryButton, isLookingUp && styles.disabledBtn]} 
        onPress={handleLookup}
        disabled={isLookingUp}
      >
        <Text style={styles.primaryButtonText}>{isLookingUp ? "Searching..." : "Lookup Vehicle"}</Text>
      </TouchableOpacity>
      
      {error && <Text style={styles.error}>Could not find vehicle details. Please check the registration.</Text>}

      {data && (
        <View style={styles.detailsCard}>
          <Text style={styles.title}>{data.make} {data.model}</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Colour:</Text>
            <Text style={styles.detailValue}>{data.colour}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>MOT:</Text>
            <Text style={styles.detailValue}>{data.motStatus} ({data.motExpiryDate})</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tax:</Text>
            <Text style={styles.detailValue}>{data.taxStatus} ({data.taxDueDate})</Text>
          </View>
          
          <TouchableOpacity style={styles.successButton} onPress={handleAdd}>
            <Text style={styles.primaryButtonText}>Add to Garage</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

import { theme } from '../utils/theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  label: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  plateInputContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.plateYellow,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#000',
    alignItems: 'stretch',
    overflow: 'hidden',
    alignSelf: 'center',
    marginBottom: theme.spacing.xl,
    width: '80%',
    ...theme.shadows.glass,
  },
  ukPlateBlueBandLarge: {
    backgroundColor: '#003399',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  ukPlateGBLarge: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 16,
  },
  plateInput: {
    flex: 1,
    ...theme.typography.plate,
    fontSize: 32,
    textAlign: 'center',
    paddingVertical: theme.spacing.sm,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    ...theme.shadows.subtle,
  },
  successButton: {
    backgroundColor: theme.colors.secondary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  primaryButtonText: {
    ...theme.typography.h3,
    color: '#000', // for secondary button mostly
  },
  disabledBtn: {
    opacity: 0.5,
  },
  error: {
    color: theme.colors.error,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  detailsCard: {
    marginTop: theme.spacing.xl,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.glass,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.primary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailLabel: {
    ...theme.typography.bodySecondary,
  },
  detailValue: {
    ...theme.typography.body,
    fontWeight: 'bold',
  }
});
