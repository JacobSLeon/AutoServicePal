import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Modal, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { useAddServiceRecordMutation, useUploadServiceProofsMutation, useUpdateServiceRecordMutation } from '../store/api/apiSlice';
import Card from '../components/Card';
import InputField from '../components/InputField';
import Button from '../components/Button';
import CheckboxRow from '../components/CheckboxRow';
import { theme } from '../utils/theme';
import { compressImage } from '../utils/imageCompressor';
import { crossPlatformAlert } from '../utils/alert';
import { Ionicons } from '@expo/vector-icons';

const WORK_ITEMS = [
  'Oil & Filter', 'Air Filter', 'Cabin Filter', 'Fuel Filter',
  'Spark Plugs', 'Glow Plugs', 'Brake Pads (Front)', 'Brake Pads (Rear)',
  'Brake Discs (Front)', 'Brake Discs (Rear)', 'Brake Fluid', 'Coolant',
  'Timing Belt', 'Water Pump', 'Drive Belt', 'Battery',
  'Tyres (Front)', 'Tyres (Rear)', 'Wheel Alignment', 'Suspension (Front)',
  'Suspension (Rear)', 'Exhaust', 'Clutch', 'Gearbox Oil',
  'Differential Oil', 'Air Conditioning', 'Wiper Blades', 'Bulbs',
  'Diagnostics', 'MOT', 'Other'
];

export default function AddServiceScreen({ route, navigation }: any) {
  const { vehicleId, editMode, existingRecord } = route.params || {};

  const vehicle = useSelector((state: RootState) =>
    state.vehicles.vehicles.find(v => v.id === vehicleId)
  );

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [recordName, setRecordName] = useState(`Service-${date}`);
  const [isDealer, setIsDealer] = useState(true);
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: boolean }>({});
  const [customDescription, setCustomDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const [showWorkItemModal, setShowWorkItemModal] = useState(false);

  const [addServiceRecord, { isLoading: isAdding }] = useAddServiceRecordMutation();
  const [updateServiceRecord, { isLoading: isUpdating }] = useUpdateServiceRecordMutation();
  const [uploadServiceProofs, { isLoading: isUploading }] = useUploadServiceProofsMutation();

  useEffect(() => {
    if (editMode && existingRecord) {
      setDate(new Date(existingRecord.service_date).toISOString().split('T')[0]);
      setRecordName(existingRecord.record_name);
      setIsDealer(existingRecord.service_type === 'Dealer');
      
      const newSelectedItems: { [key: string]: boolean } = {};
      let customDesc = '';
      if (existingRecord.work_items) {
        existingRecord.work_items.forEach((wi: any) => {
          newSelectedItems[wi.item_key] = true;
          if (wi.item_key === 'Other' && wi.custom_description) {
            customDesc = wi.custom_description;
          }
        });
      }
      setSelectedItems(newSelectedItems);
      setCustomDescription(customDesc);
    }
  }, [editMode, existingRecord]);

  useEffect(() => {
    if (!editMode) {
      setRecordName(`Service-${date}`);
    }
  }, [date, editMode]);

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
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const newUris = result.assets.map(a => a.uri);
      setImages(prev => {
        const next = [...prev, ...newUris].slice(0, 10);
        if (next.length > prev.length) {
          crossPlatformAlert('Images Attached', `Successfully attached ${next.length - prev.length} new proof document(s)`);
        }
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    if (vehicle?.isGuest) {
      crossPlatformAlert('Authentication Required', 'You must create an account to save service records.');
      return;
    }

    const workItems = Object.keys(selectedItems)
      .filter(key => selectedItems[key])
      .map(key => ({
        item_key: key,
        custom_description: key === 'Other' ? customDescription : null
      }));

    if (workItems.length === 0) {
      crossPlatformAlert('Validation Error', 'Please select at least one work item.');
      return;
    }

    if (selectedItems['Other'] && !customDescription.trim()) {
      crossPlatformAlert('Validation Error', 'Please provide a description for the "Other" work item.');
      return;
    }

    try {
      let serviceId;
      const serviceDataPayload = {
        vehicle_id: vehicleId,
        service_date: date,
        record_name: recordName,
        service_type: isDealer ? 'Dealer' : 'Self',
        work_items: workItems
      };

      if (editMode && existingRecord) {
        await updateServiceRecord({
          id: existingRecord.id,
          serviceData: serviceDataPayload
        }).unwrap();
        serviceId = existingRecord.id;
      } else {
        const response = await addServiceRecord(serviceDataPayload).unwrap();
        serviceId = response.data.id;
      }

      // If new images were attached, upload them
      const newImages = images.filter(img => !img.startsWith('http'));
      if (newImages.length > 0) {
        const formData = new FormData();

        for (let i = 0; i < newImages.length; i++) {
          const compressedUri = await compressImage(newImages[i]);
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

      crossPlatformAlert('Success', editMode ? 'Service record updated successfully!' : 'Service record added successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);

    } catch (err: any) {
      console.error(err);
      crossPlatformAlert('Error', err?.data?.message || (editMode ? 'Failed to update service record.' : 'Failed to add service record.'));
    }
  };

  const isLoading = isAdding || isUpdating || isUploading;
  const selectedCount = Object.keys(selectedItems).filter(k => selectedItems[k]).length;
  const top3 = Object.keys(selectedItems).filter(k => selectedItems[k]).slice(0, 3);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>

      {/* Header Banner */}
      <View style={styles.redBanner}>
        <Text style={styles.bannerTitle}>ADD SERVICE RECORD</Text>
      </View>

      <View style={styles.content}>
        <InputField
          label="Record Name"
          value={recordName}
          onChangeText={setRecordName}
          placeholder="Service-YYYY-MM-DD"
        />

        <InputField
          label="Service Date"
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
        />

        <Text style={styles.label}>Service Type</Text>
        <View style={styles.pillToggleRow}>
          <TouchableOpacity
            style={[styles.pillToggleBtn, isDealer && styles.pillToggleBtnActive, { borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
            onPress={() => setIsDealer(true)}
          >
            <Text style={[styles.pillToggleText, isDealer && styles.pillToggleTextActive]}>🏢 Dealer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pillToggleBtn, !isDealer && styles.pillToggleBtnActive, { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
            onPress={() => setIsDealer(false)}
          >
            <Text style={[styles.pillToggleText, !isDealer && styles.pillToggleTextActive]}>🔧 Self-Performed</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Work Items</Text>
          <TouchableOpacity onPress={() => setShowWorkItemModal(true)} style={styles.selectBtn}>
            <Text style={styles.selectBtnText}>Select Items ({selectedCount})</Text>
          </TouchableOpacity>
        </View>

        <Card style={{ marginBottom: theme.spacing.lg }}>
          {selectedCount === 0 ? (
            <Text style={styles.hintText}>No items selected yet. Tap to select.</Text>
          ) : (
            <View>
              {top3.map(item => (
                <View key={item} style={styles.inlineWorkItem}>
                  <Text style={styles.inlineWorkItemText}>• {item}</Text>
                  {/* Verified checkmark would go here if editing and verified, but this is create */}
                </View>
              ))}
              {selectedCount > 3 && (
                <Text style={styles.moreItemsText}>+ {selectedCount - 3} more items...</Text>
              )}
            </View>
          )}
        </Card>

        {selectedItems['Other'] && (
          <InputField
            label="Other Description"
            placeholder="Describe custom work..."
            value={customDescription}
            onChangeText={setCustomDescription}
          />
        )}

        <Text style={styles.sectionTitle}>Proof Images ({images.length}/10)</Text>
        <Card style={{ marginBottom: theme.spacing.xl }}>
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
                <Ionicons name="camera-outline" size={32} color={theme.colors.textSecondary} />
                <Text style={styles.addImageText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>

        {editMode && (
          <Button
            title="Remove Record"
            variant="danger"
            style={{ marginBottom: theme.spacing.md }}
            onPress={() => crossPlatformAlert('Not Implemented', 'Remove logic coming soon')}
          />
        )}

        <Button
          title={isLoading ? "Saving..." : "Save Record"}
          onPress={handleSubmit}
          isLoading={isLoading}
        />
      </View>

      {/* Work Items Modal */}
      <Modal
        visible={showWorkItemModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWorkItemModal(false)}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Work Items</Text>
          <TouchableOpacity onPress={() => setShowWorkItemModal(false)}>
            <Text style={styles.modalDoneText}>Done</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalList}>
          {WORK_ITEMS.map((item) => (
            <CheckboxRow
              key={item}
              label={item}
              isSelected={!!selectedItems[item]}
              onToggle={() => toggleItem(item)}
            />
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  redBanner: {
    backgroundColor: theme.colors.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: theme.spacing.md,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...theme.shadows.glass,
  },
  bannerTitle: {
    ...theme.typography.h2,
    color: '#FFF',
  },
  content: {
    padding: theme.spacing.md,
  },
  label: {
    ...theme.typography.bodySecondary,
    marginBottom: theme.spacing.sm,
  },
  pillToggleRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  pillToggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.pill,
  },
  pillToggleBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pillToggleText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontWeight: 'bold',
  },
  pillToggleTextActive: {
    color: '#FFF',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  selectBtn: {
    backgroundColor: theme.colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.pill,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  selectBtnText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  inlineWorkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  inlineWorkItemText: {
    ...theme.typography.body,
  },
  moreItemsText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
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
    width: '31%',
    aspectRatio: 1,
    marginRight: '2%',
    marginBottom: '2%',
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
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
    width: '31%',
    aspectRatio: 1,
    marginRight: '2%',
    marginBottom: '2%',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
  },
  addImageText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  modalTitle: {
    ...theme.typography.h3,
  },
  modalDoneText: {
    ...theme.typography.h3,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  modalList: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
  }
});
