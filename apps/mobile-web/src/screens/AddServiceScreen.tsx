import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, ScrollView, Switch, Image, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { useAddServiceRecordMutation, useUploadServiceProofsMutation } from '../store/api/apiSlice';
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
      <View style={styles.card}>
        <Text style={styles.label}>Service Date</Text>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.colors.textSecondary}
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
      </View>

      <Text style={styles.sectionTitle}>Work Performed</Text>
      <View style={styles.card}>
        {STANDARD_ITEMS.map((item) => {
          const isSelected = !!selectedItems[item.key];
          return (
            <TouchableOpacity 
              key={item.key} 
              style={[styles.checkboxRow, isSelected && styles.checkboxRowActive]}
              onPress={() => toggleItem(item.key)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                {isSelected && <Text style={styles.checkboxTick}>✓</Text>}
              </View>
              <Text style={[styles.checkboxLabel, isSelected && styles.checkboxLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}

        {selectedItems['other'] && (
          <TextInput
            style={[styles.input, { marginTop: theme.spacing.md }]}
            placeholder="Describe 'Other' work..."
            placeholderTextColor={theme.colors.textSecondary}
            value={customDescription}
            onChangeText={setCustomDescription}
          />
        )}
      </View>

      <Text style={styles.sectionTitle}>Proof Images ({images.length}/10)</Text>
      <View style={styles.card}>
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
      </View>

      <View style={styles.submitContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} />
        ) : (
          <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}>
            <Text style={styles.primaryButtonText}>Save Service Record</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

import { theme } from '../utils/theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.subtle,
  },
  label: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.glass,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    ...theme.typography.body,
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
  },
  checkboxRowActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 4,
    marginRight: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.glass,
  },
  checkboxActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkboxTick: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  checkboxLabel: {
    ...theme.typography.body,
  },
  checkboxLabelActive: {
    fontWeight: 'bold',
    color: theme.colors.primaryLight,
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
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.pill,
    alignItems: 'center',
    ...theme.shadows.subtle,
  },
  primaryButtonText: {
    ...theme.typography.h3,
    color: '#000',
  }
});
