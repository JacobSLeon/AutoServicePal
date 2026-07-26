import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator } from 'react-native';
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
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="e.g. AB12 CDE"
          value={regNumber}
          onChangeText={setRegNumber}
          autoCapitalize="characters"
        />
        <Button title="Lookup" onPress={handleLookup} disabled={isLookingUp} />
      </View>

      {isLookingUp && <ActivityIndicator style={{ marginTop: 20 }} />}
      
      {error && <Text style={styles.error}>Could not find vehicle details.</Text>}

      {data && (
        <View style={styles.detailsCard}>
          <Text style={styles.title}>{data.make} {data.model}</Text>
          <Text>Colour: {data.colour}</Text>
          <Text>MOT: {data.motStatus} ({data.motExpiryDate})</Text>
          <Text>Tax: {data.taxStatus} ({data.taxDueDate})</Text>
          
          <View style={{ marginTop: 20 }}>
            <Button title="Add to Garage" onPress={handleAdd} color="#4CAF50" />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    marginRight: 10,
    fontSize: 18,
    textTransform: 'uppercase',
  },
  error: {
    color: 'red',
    marginTop: 10,
  },
  detailsCard: {
    marginTop: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});
