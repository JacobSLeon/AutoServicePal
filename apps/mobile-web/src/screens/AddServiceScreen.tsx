import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Switch, Image, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { useAddServiceRecordMutation, useUploadServiceProofsMutation } from '../store/api/apiSlice';
import Card from '../components/Card';
import InputField from '../components/InputField';
import Button from '../components/Button';
import CheckboxRow from '../components/CheckboxRow';
import { theme } from '../utils/theme';
import { compressImage } from '../utils/imageCompressor';
import { crossPlatformAlert } from '../utils/alert';

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
  
  const vehicle = useSelector((state: RootState) => 
    state.vehicles.vehicles.find(v => v.id === vehicleId)
  );

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
      crossPlatformAlert('Limit Reached', 'You can only upload up to 10 images.');
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
    if (vehicle?.isGuest) {
      crossPlatformAlert('Authentication Required', 'You must create an account to save service records.');
      return;
    }

    // Validation
    const workItems = Object.keys(selectedItems)
      .filter(key => selectedItems[key])
      .map(key => ({
        item_key: key,
        custom_description: key === 'other' ? customDescription : null
      }));

    if (workItems.length === 0) {
      crossPlatformAlert('Validation Error', 'Please select at least one work item.');
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
          
          if (Platform.OS === 'web') {
            try {
              const response = await fetch(compressedUri);
              const blob = await response.blob();
              formData.append('images', blob, filename);
            } catch (e) {
              console.error('Failed to process image on web:', e);
            }
          } else {
            formData.append('images', {
              uri: compressedUri,
              name: filename,
              type: 'image/jpeg'
            } as any);
          }
        }

        await uploadServiceProofs({ serviceId, formData }).unwrap();
      }

      crossPlatformAlert('Success', 'Service record added successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);

    } catch (err: any) {
      console.error(err);
      crossPlatformAlert('Error', err?.data?.message || 'Failed to add service record.');
    }
  };

  const isLoading = isAdding || isUploading;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Card>
        <InputField
          label="Service Date"
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
        />

        <Text style={styles.label}>Service Type</Text>
        <View style={styles.typeSelectorRow}>
          <TouchableOpacity 
            style={[styles.typeBtn, isDealer && styles.typeBtnActive]} 
            onPress={() => setIsDealer(true)}
          >
            <Text style={[styles.typeBtnText, isDealer && styles.typeBtnTextActive]}>🏢 Dealer</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.typeBtn, !isDealer && styles.typeBtnActive]} 
            onPress={() => setIsDealer(false)}
          >
            <Text style={[styles.typeBtnText, !isDealer && styles.typeBtnTextActive]}>🔧 Self-Performed</Text>
          </TouchableOpacity>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Work Performed</Text>
      <Card>
        {STANDARD_ITEMS.map((item) => {
          const isSelected = !!selectedItems[item.key];
          return (
            <CheckboxRow
              key={item.key}
              label={item.label}
              isSelected={isSelected}
              onToggle={() => toggleItem(item.key)}
            />
          );
        })}

        {selectedItems['other'] && (
          <InputField
            style={{ marginTop: theme.spacing.md, marginBottom: 0 }}
            placeholder="Describe 'Other' work..."
            value={customDescription}
            onChangeText={setCustomDescription}
          />
        )}
      </Card>

      <Text style={styles.sectionTitle}>Proof Images ({images.length}/10)</Text>
      <Card>
        <Text style={styles.hintText}>Attach invoices, receipts, or photos of the work done.</Text>
        
        <View style={styles.imageGrid}>
          {images.map((uri, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image source={{ uri }} style={styles.previewImage} />
              <TouchableOpacity 
                style={styles.removeBtn}
                onPress={() => setImages(prev => prev.filter((_, i) => i !== index))}
              >
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          
          {images.length < 10 && (
            <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
              <Text style={styles.addImageIcon}>+</Text>
              <Text style={styles.addImageText}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>

      <View style={styles.submitContainer}>
        <Button
          title="Save Service Record"
          onPress={handleSubmit}
          isLoading={isLoading}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  label: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.sm,
  },
  typeSelectorRow: {
    flexDirection: 'row',
  },
  typeBtn: {
    flex: 1,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    backgroundColor: theme.colors.glass,
  },
  typeBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  typeBtnText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  typeBtnTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
  sectionTitle: {
    ...theme.typography.h2,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  hintText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  imageWrapper: {
    width: '30%',
    aspectRatio: 1,
    marginRight: '3%',
    marginBottom: '3%',
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addImageBtn: {
    width: '30%',
    aspectRatio: 1,
    marginRight: '3%',
    marginBottom: '3%',
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.glass,
  },
  addImageIcon: {
    fontSize: 24,
    color: theme.colors.textSecondary,
  },
  addImageText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  submitContainer: {
    marginTop: theme.spacing.xl,
  }
});
