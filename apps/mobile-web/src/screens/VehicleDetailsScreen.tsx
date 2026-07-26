import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, FlatList, ActivityIndicator, Image } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { removeVehicle } from '../store/slices/vehicleSlice';
import * as ImagePicker from 'expo-image-picker';
import { useUploadV5Mutation, useGetServiceHistoryQuery } from '../store/api/apiSlice';
import { crossPlatformAlert } from '../utils/alert';
import { theme } from '../utils/theme';

export default function VehicleDetailsScreen({ route, navigation }: any) {
  const { vehicleId } = route.params;
  const dispatch = useDispatch();
  
  const vehicle = useSelector((state: RootState) => 
    state.vehicles.vehicles.find(v => v.id === vehicleId)
  );

  const { data: historyData, isLoading: isLoadingHistory } = useGetServiceHistoryQuery(vehicleId, {
    skip: !vehicle || vehicle.isGuest
  });

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

  const renderHistoryItem = ({ item }: { item: any }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View style={styles.historyTypeBadge}>
          <Text style={styles.historyTypeIcon}>{item.service_type === 'Dealer' ? '🏢' : '🔧'}</Text>
        </View>
        <View style={styles.historyTitleContainer}>
          <Text style={styles.historyDate}>{new Date(item.service_date).toLocaleDateString()}</Text>
          <Text style={styles.historyTitle}>{item.record_name}</Text>
        </View>
        <TouchableOpacity 
          style={styles.editBtn} 
          onPress={() => crossPlatformAlert('Not Implemented', 'Edit service coming soon')}
        >
          <Text style={styles.editBtnText}>View / Edit</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.historyWorkRow}>
        <Text style={styles.historyWorkText}>
          {item.work_items?.length ? item.work_items.map((wi: any) => wi.item_key.replace(/_/g, ' ')).join(', ') : 'No specific work logged'}
        </Text>
      </View>
      
      {item.proofs && item.proofs.length > 0 && (
        <View style={styles.historyImageGrid}>
          {item.proofs.map((proof: any) => (
            <Image key={proof.id} source={{ uri: proof.image_url }} style={styles.historyImage} />
          ))}
        </View>
      )}
    </View>
  );

  return (
    <FlatList
      style={styles.container}
      data={historyData?.data?.history || []}
      keyExtractor={(item) => item.id}
      renderItem={renderHistoryItem}
      ListHeaderComponent={
        <View style={styles.headerSection}>
          <View style={styles.topHeader}>
            <View style={styles.ukPlateLarge}>
              <View style={styles.ukPlateBlueBandLarge}>
                <Text style={styles.ukPlateGBLarge}>GB</Text>
              </View>
              <Text style={styles.regTextLarge}>{vehicle.registrationNumber.toUpperCase()}</Text>
            </View>
            <TouchableOpacity onPress={handleRemove} style={styles.deleteIcon}>
              <Text style={styles.deleteIconText}>🗑️</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pillsRow}>
            <View style={styles.pillBox}>
              <Text style={styles.pillLabel}>MOT</Text>
              <Text style={styles.pillValue}>{vehicle.motDueDate || 'Unknown'}</Text>
            </View>
            <View style={styles.pillBox}>
              <Text style={styles.pillLabel}>TAX</Text>
              <Text style={styles.pillValue}>{vehicle.taxDueDate || 'Unknown'}</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.addServiceBtn} onPress={handleAddServiceRecord}>
              <Text style={styles.addServiceBtnText}>Add Service</Text>
            </TouchableOpacity>
            {!vehicle.isVerified && (
              <TouchableOpacity 
                style={[styles.uploadV5Btn, isUploading && styles.disabledBtn]} 
                onPress={handleUploadV5}
                disabled={isUploading}
              >
                <Text style={styles.uploadV5BtnText}>{isUploading ? "Uploading..." : "Upload V5"}</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.sectionHeader}>SERVICE HISTORY</Text>
          {isLoadingHistory && <ActivityIndicator size="small" color={theme.colors.primary} style={{marginTop: 10}}/>}
          {!isLoadingHistory && (!historyData?.data?.history || historyData.data.history.length === 0) && (
            <Text style={styles.emptyHistory}>No service history found.</Text>
          )}
        </View>
      }
      contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerSection: {
    padding: theme.spacing.md,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  ukPlateLarge: {
    flexDirection: 'row',
    backgroundColor: theme.colors.plateYellow,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#000',
    alignItems: 'center',
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  ukPlateBlueBandLarge: {
    backgroundColor: '#003399',
    paddingHorizontal: 8,
    paddingVertical: 8,
    height: '100%',
    justifyContent: 'center',
  },
  ukPlateGBLarge: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 14,
  },
  regTextLarge: {
    ...theme.typography.plate,
    fontSize: 36,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
  },
  deleteIcon: {
    padding: theme.spacing.xs,
  },
  deleteIconText: {
    fontSize: 24,
  },
  pillsRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  pillBox: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginRight: theme.spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.subtle,
  },
  pillLabel: {
    ...theme.typography.h3,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  pillValue: {
    ...theme.typography.body,
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xl,
  },
  addServiceBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.pill,
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  addServiceBtnText: {
    ...theme.typography.body,
    fontWeight: 'bold',
  },
  uploadV5Btn: {
    flex: 1,
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  uploadV5BtnText: {
    ...theme.typography.body,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  sectionHeader: {
    ...theme.typography.h2,
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  emptyHistory: {
    ...theme.typography.bodySecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: theme.spacing.xl,
  },
  historyCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    ...theme.shadows.subtle,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  historyTypeBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.glass,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  historyTypeIcon: {
    fontSize: 20,
  },
  historyTitleContainer: {
    flex: 1,
  },
  historyDate: {
    ...theme.typography.caption,
    marginBottom: 2,
  },
  historyTitle: {
    ...theme.typography.body,
    fontWeight: 'bold',
  },
  editBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  editBtnText: {
    ...theme.typography.caption,
    color: '#fff',
    fontWeight: 'bold',
  },
  historyWorkRow: {
    marginTop: theme.spacing.xs,
  },
  historyWorkText: {
    ...theme.typography.bodySecondary,
    fontStyle: 'italic',
  },
  historyImageGrid: {
    flexDirection: 'row',
    marginTop: theme.spacing.sm,
  },
  historyImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: theme.spacing.sm,
  }
});
