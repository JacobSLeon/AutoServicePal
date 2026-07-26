import React from 'react';
import { View, Text, StyleSheet, Button, Platform } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { removeVehicle } from '../store/slices/vehicleSlice';
import * as ImagePicker from 'expo-image-picker';
import { useUploadV5Mutation } from '../store/api/apiSlice';
import { crossPlatformAlert } from '../utils/alert';

export default function VehicleDetailsScreen({ route, navigation }: any) {
  const { vehicleId } = route.params;
  const dispatch = useDispatch();
  
  const vehicle = useSelector((state: RootState) => 
    state.vehicles.vehicles.find(v => v.id === vehicleId)
  );

  const [uploadV5, { isLoading: isUploading }] = useUploadV5Mutation();

  if (!vehicle) {
    return (
      <View style={styles.container}>
        <Text>Vehicle not found.</Text>
      </View>
    );
  }

  const handleRemove = () => {
    crossPlatformAlert('Remove Vehicle', 'Are you sure you want to remove this vehicle from your garage?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Remove', 
        style: 'destructive',
        onPress: () => {
          dispatch(removeVehicle(vehicleId));
          navigation.goBack();
        }
      }
    ]);
  };

  const handleViewServiceHistory = () => {
    if (vehicle.isGuest) {
      crossPlatformAlert('Authentication Required', 'You must create an account to view service history.');
      return;
    }
    navigation.navigate('ServiceHistory', { vehicleId: vehicle.id });
  };

  const handleUploadV5 = async () => {
    if (vehicle.isGuest) {
      crossPlatformAlert('Authentication Required', 'You must be logged in to upload V5 documents.');
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      crossPlatformAlert('Permission Denied', 'You need to grant camera roll permissions to upload an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8, // Basic compression
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        try {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          formData.append('v5_image', blob, 'v5_document.jpg');
        } catch (e) {
          console.error('Failed to convert to blob:', e);
          crossPlatformAlert('Error', 'Failed to process image on web.');
          return;
        }
      } else {
        formData.append('v5_image', {
          uri: asset.uri,
          name: 'v5_document.jpg',
          type: 'image/jpeg'
        } as any);
      }

      try {
        await uploadV5({ vehicleId: vehicle.id, formData }).unwrap();
        crossPlatformAlert('Success', 'V5 document uploaded and is awaiting verification.');
      } catch (err) {
        crossPlatformAlert('Upload Failed', 'There was an error uploading your document.');
      }
    }
  };

  const handleAddServiceRecord = () => {
    if (vehicle.isGuest) {
      crossPlatformAlert('Authentication Required', 'You must create an account to save service records.');
      return;
    }
    navigation.navigate('AddService', { vehicleId: vehicle.id });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{vehicle.registrationNumber}</Text>
      <Text style={styles.subtitle}>{vehicle.make} {vehicle.model}</Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>Colour: <Text style={styles.value}>{vehicle.colour}</Text></Text>
        <Text style={styles.label}>MOT Status: <Text style={styles.value}>{vehicle.motStatus} ({vehicle.motDueDate})</Text></Text>
        <Text style={styles.label}>Tax Status: <Text style={styles.value}>{vehicle.taxStatus} ({vehicle.taxDueDate})</Text></Text>
        <Text style={styles.label}>Verified: <Text style={styles.value}>{vehicle.isVerified ? 'Yes ✅' : 'No ❌'}</Text></Text>
      </View>

      <View style={styles.actions}>
        <Button 
          title="View Service History" 
          onPress={handleViewServiceHistory} 
        />
        <View style={{ height: 16 }} />
        <Button 
          title="Add Service Record" 
          color="#4CAF50"
          onPress={handleAddServiceRecord} 
        />
        <View style={{ height: 16 }} />
        <Button 
          title={isUploading ? "Uploading..." : "Upload V5 Logbook"} 
          onPress={handleUploadV5} 
          disabled={isUploading || vehicle.isVerified}
        />
        <View style={{ height: 16 }} />
        <Button title="Remove Vehicle" color="red" onPress={handleRemove} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 18,
    color: '#555',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  value: {
    fontWeight: 'normal',
  },
  actions: {
    marginTop: 'auto',
    marginBottom: 20,
  },
});
