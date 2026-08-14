import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, FlatList, ActivityIndicator, Image } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { removeVehicle, updateVehicle } from '../store/slices/vehicleSlice';
import * as ImagePicker from 'expo-image-picker';
import { useUploadV5Mutation, useGetServiceHistoryQuery } from '../store/api/apiSlice';
import { crossPlatformAlert } from '../utils/alert';
import { theme } from '../utils/theme';
import UKNumberPlate from '../components/UKNumberPlate';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';

export default function VehicleDetailsScreen({ route, navigation }: any) {
  const { vehicleId } = route.params;
  const dispatch = useDispatch();
  
  const vehicle = useSelector((state: RootState) => 
    state.vehicles.vehicles.find(v => v.id === vehicleId)
  );

  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

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

  const handleUploadV5 = async () => {
    if (vehicle.isGuest || !isAuthenticated) {
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
      quality: 0.8,
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
        dispatch(updateVehicle({ id: vehicle.id, changes: { v5_status: 'PENDING' } }));
        crossPlatformAlert('Success', 'V5 document uploaded and is awaiting verification.');
      } catch (err) {
        crossPlatformAlert('Upload Failed', 'There was an error uploading your document.');
      }
    }
  };

  const renderHistoryItem = ({ item }: { item: any }) => {
    const summary = item.work_items?.length 
      ? item.work_items.map((wi: any) => wi.item_key.replace(/_/g, ' ')).join(', ') 
      : 'No specific work logged';

    return (
      <View style={styles.historyCard}>
        <View style={styles.historyCardLeft}>
          <View style={styles.historyTypeBadge}>
            <Ionicons 
              name={item.service_type === 'Dealer' ? 'business' : 'build'} 
              size={24} 
              color={theme.colors.primary} 
            />
          </View>
        </View>
        <View style={styles.historyCardCenter}>
          <Text style={styles.historyDate}>{new Date(item.service_date).toLocaleDateString()}</Text>
          <Text style={styles.historyTitle}>{item.service_type} Service</Text>
          <Text style={styles.historyWorkText} numberOfLines={2}>{summary}</Text>
        </View>
        <View style={styles.historyCardRight}>
          <Button 
            title="View Details" 
            variant="danger"
            onPress={() => navigation.navigate('ServiceHistory', { vehicleId: vehicle.id })}
            style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
          />
        </View>
      </View>
    );
  };

  const canAddService = isAuthenticated && !vehicle.isGuest;

  return (
    <View style={styles.container}>
      {/* Red Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="home" size={28} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => (navigation as any).openDrawer?.()}>
            <Ionicons name="menu" size={32} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerCenter}>
          <UKNumberPlate registrationNumber={vehicle.registrationNumber} size="large" />
        </View>

        <View style={styles.headerPillsRow}>
          <View style={styles.whitePill}>
            <Text style={styles.pillLabel}>MOT</Text>
            <Text style={styles.pillValue}>{vehicle.motDueDate || 'Unknown'}</Text>
          </View>
          <View style={styles.whitePill}>
            <Text style={styles.pillLabel}>TAX</Text>
            <Text style={styles.pillValue}>{vehicle.taxDueDate || 'Unknown'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Permission / Action Banner */}
        {(!isAuthenticated || !vehicle.isVerified) && (
          <View style={styles.warningBanner}>
            {!isAuthenticated ? (
              <Text style={styles.warningBannerText}>Log in to access service record</Text>
            ) : (
              <Text style={styles.warningBannerText}>{vehicle.v5_status === 'PENDING' ? "V5 Pending Verification" : "V5 Verification Required"}</Text>
            )}
            {!isAuthenticated ? (
              <Button title="Login" variant="outline" style={{marginTop: 8, borderColor: '#FFF'}} onPress={() => navigation.navigate('Login')} />
            ) : (
              <Button title={vehicle.v5_status === 'PENDING' ? "Pending Review" : (isUploading ? "Uploading..." : "Upload V5")} variant="outline" style={{marginTop: 8, borderColor: '#FFF'}} onPress={handleUploadV5} disabled={isUploading || vehicle.v5_status === 'PENDING'} />
            )}
          </View>
        )}

        {canAddService && (
          <View style={{ padding: theme.spacing.md }}>
            <Button 
              title="Add Service" 
              variant="primary" 
              onPress={() => navigation.navigate('AddService', { vehicleId: vehicle.id })}
            />
          </View>
        )}

        <Text style={styles.sectionHeader}>SERVICE HISTORY</Text>
        
        {isLoadingHistory ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{marginTop: 20}}/>
        ) : (
          <FlatList
            data={historyData?.data?.history || []}
            keyExtractor={(item) => item.id}
            renderItem={renderHistoryItem}
            contentContainerStyle={{ paddingBottom: theme.spacing.xl, paddingHorizontal: theme.spacing.md }}
            ListEmptyComponent={
              <Text style={styles.emptyHistory}>No service history recorded for this vehicle.</Text>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerCard: {
    backgroundColor: theme.colors.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 30, // Safe area approx
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...theme.shadows.glass,
    zIndex: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  headerCenter: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  headerPillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  whitePill: {
    backgroundColor: '#FFF',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.pill,
    alignItems: 'center',
    minWidth: 140,
    ...theme.shadows.subtle,
  },
  pillLabel: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  pillValue: {
    ...theme.typography.body,
    color: '#111',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  warningBanner: {
    backgroundColor: theme.colors.error,
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    ...theme.shadows.subtle,
  },
  warningBannerText: {
    ...theme.typography.h3,
    color: '#FFF',
    textAlign: 'center',
  },
  sectionHeader: {
    ...theme.typography.h3,
    color: theme.colors.textSecondary,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  emptyHistory: {
    ...theme.typography.bodySecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: theme.spacing.xl,
  },
  historyCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.xl,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.subtle,
  },
  historyCardLeft: {
    marginRight: theme.spacing.md,
  },
  historyTypeBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyCardCenter: {
    flex: 1,
  },
  historyDate: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  historyTitle: {
    ...theme.typography.body,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 2,
  },
  historyWorkText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  historyCardRight: {
    marginLeft: theme.spacing.sm,
  }
});
