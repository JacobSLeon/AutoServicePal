import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { useLazyLookupVehicleQuery } from '../store/api/apiSlice';
import { addVehicle } from '../store/slices/vehicleSlice';

export default function AddVehicleScreen({ navigation }: any) {
  const [regNumber, setRegNumber] = useState('');
  const [triggerLookup, { data, isLoading, error }] = useLazyLookupVehicleQuery();
  const dispatch = useDispatch();

  const handleLookup = () => {
    if (!regNumber.trim()) return;
    triggerLookup(regNumber.toUpperCase());
  };

  const handleAdd = () => {
    if (data) {
      // Mock mapping to vehicle slice format
      dispatch(addVehicle({
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
        isGuest: true, // For now, everything added here is local guest data
      }));
      Alert.alert('Success', 'Vehicle added to your local garage.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
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
        <Button title="Lookup" onPress={handleLookup} disabled={isLoading} />
      </View>

      {isLoading && <ActivityIndicator style={{ marginTop: 20 }} />}
      
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
