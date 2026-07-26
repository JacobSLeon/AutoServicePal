import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, ScrollView, Switch, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAddServiceRecordMutation, useUploadServiceProofsMutation } from '../store/api/apiSlice';
import { compressImage } from '../utils/imageCompressor';

const STANDARD_ITEMS = [
  { key: 'oil_filter', label: 'Oil & Filter' },
  { key: 'brakes', label: 'Brakes' },
  { key: 'spark_plugs', label: 'Spark Plugs' },
  { key: 'timing_belt', label: 'Timing Belt' },
  { key: 'tyres', label: 'Tyres' },
  { key: 'other', label: 'Other' },
];

export default function AddServiceScreen({ route, navigation }: any) {
  const { vehicleId } = route.params;

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDealer, setIsDealer] = useState(true);
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: boolean }>({});
  const [customDescription, setCustomDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const [addServiceRecord, { isLoading: isAdding }] = useAddServiceRecordMutation();
  const [uploadServiceProofs, { isLoading: isUploading }] = useUploadServiceProofsMutation();

  const toggleItem = (key: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const pickImages = async () => {
    if (images.length >= 10) {
      Alert.alert('Limit Reached', 'You can only upload up to 10 images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10 - images.length,
    });

    if (!result.canceled && result.assets) {
      const newUris = result.assets.map(a => a.uri);
      setImages(prev => [...prev, ...newUris]);
    }
  };

  const handleSubmit = async () => {
    // Validation
    const workItems = Object.keys(selectedItems)
      .filter(key => selectedItems[key])
      .map(key => ({
        item_key: key,
        custom_description: key === 'other' ? customDescription : null
      }));

    if (workItems.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one work item.');
      return;
    }

    try {
      // 1. Create service record
      const serviceResponse = await addServiceRecord({
        vehicle_id: vehicleId,
        service_type: isDealer ? 'Dealer' : 'Self',
        service_date: date,
        work_items: workItems
      }).unwrap();

      const serviceId = serviceResponse.data.id;

      // 2. Upload images if any
      if (images.length > 0) {
        const formData = new FormData();
        
        for (let i = 0; i < images.length; i++) {
          const compressedUri = await compressImage(images[i]);
          const filename = compressedUri.split('/').pop() || `image_${i}.jpg`;
          
          formData.append('images', {
            uri: compressedUri,
            name: filename,
            type: 'image/jpeg'
          } as any);
        }

        await uploadServiceProofs({ serviceId, formData }).unwrap();
      }

      Alert.alert('Success', 'Service record added successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);

    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err?.data?.message || 'Failed to add service record.');
    }
  };

  const isLoading = isAdding || isUploading;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.label}>Service Date (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        value={date}
        onChangeText={setDate}
        placeholder="e.g. 2026-07-26"
      />

      <View style={styles.switchRow}>
        <Text style={styles.label}>Service Type: {isDealer ? 'Dealer' : 'Self-Performed'}</Text>
        <Switch
          value={isDealer}
          onValueChange={setIsDealer}
        />
      </View>

      <Text style={styles.sectionTitle}>Work Items</Text>
      {STANDARD_ITEMS.map((item) => (
        <View key={item.key} style={styles.checkboxRow}>
          <Switch
            value={!!selectedItems[item.key]}
            onValueChange={() => toggleItem(item.key)}
          />
          <Text style={styles.checkboxLabel}>{item.label}</Text>
        </View>
      ))}

      {selectedItems['other'] && (
        <TextInput
          style={[styles.input, { marginTop: 10 }]}
          placeholder="Describe 'Other' work..."
          value={customDescription}
          onChangeText={setCustomDescription}
        />
      )}

      <Text style={styles.sectionTitle}>Proof Images ({images.length}/10)</Text>
      <Button title="Select Images" onPress={pickImages} />
      
      <View style={styles.imageGrid}>
        {images.map((uri, index) => (
          <View key={index} style={styles.imageWrapper}>
            <Image source={{ uri }} style={styles.previewImage} />
            <Text 
              style={styles.removeText}
              onPress={() => setImages(prev => prev.filter((_, i) => i !== index))}
            >
              Remove
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.submitContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <Button title="Save Service Record" onPress={handleSubmit} color="#4CAF50" />
        )}
      </View>
    </ScrollView>
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
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkboxLabel: {
    marginLeft: 10,
    fontSize: 16,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  imageWrapper: {
    marginRight: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeText: {
    color: 'red',
    marginTop: 4,
    fontSize: 12,
  },
  submitContainer: {
    marginTop: 30,
  }
});
