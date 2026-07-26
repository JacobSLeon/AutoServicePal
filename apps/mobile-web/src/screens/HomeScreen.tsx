import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, FlatList } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { reorderVehicles } from '../store/slices/vehicleSlice';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';

export default function HomeScreen({ navigation }: any) {
  const vehicles = useSelector((state: RootState) => state.vehicles.vehicles);
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVehicles = useMemo(() => {
    if (!searchQuery) return vehicles;
    const lowerQuery = searchQuery.toLowerCase();
    return vehicles.filter(
      (v) => 
        v.registrationNumber.toLowerCase().includes(lowerQuery) ||
        v.make.toLowerCase().includes(lowerQuery) ||
        v.model.toLowerCase().includes(lowerQuery)
    );
  }, [vehicles, searchQuery]);

  const moveVehicle = (index: number, direction: 'up' | 'down') => {
    if (searchQuery) return;
    const newVehicles = [...vehicles];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newVehicles.length) return;
    
    const temp = newVehicles[index];
    newVehicles[index] = newVehicles[targetIndex];
    newVehicles[targetIndex] = temp;
    
    dispatch(reorderVehicles(newVehicles));
  };

  const renderItemContent = (item: any, drag: any, isActive: boolean, getIndex: any) => {
    const index = getIndex ? getIndex() : 0;
    return (
      <TouchableOpacity
        style={[styles.card, isActive && styles.cardActive]}
        onLongPress={drag}
        onPress={() => navigation.navigate('VehicleDetails', { vehicleId: item.id })}
        activeOpacity={0.9}
      >
        <View style={styles.cardHeader}>
          <View style={styles.ukPlate}>
            <View style={styles.ukPlateBlueBand}>
              <Text style={styles.ukPlateGB}>GB</Text>
            </View>
            <Text style={styles.regText}>{item.registrationNumber.toUpperCase()}</Text>
          </View>
          
          <View style={styles.actionsRow}>
            {item.isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedIcon}>✓</Text>
              </View>
            )}
            
            {Platform.OS === 'web' && !searchQuery && (
              <View style={styles.webOrderButtons}>
                <TouchableOpacity onPress={() => moveVehicle(index, 'up')} style={styles.arrowBtn}>
                  <Text style={styles.arrowBtnText}>▲</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveVehicle(index, 'down')} style={styles.arrowBtn}>
                  <Text style={styles.arrowBtnText}>▼</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.vehicleName}>{item.make} {item.model}</Text>
          {item.isGuest ? (
            <Text style={styles.guestBadge}>● Guest Data (Not Synced)</Text>
          ) : (
            <Text style={styles.syncedBadge}>● Synced to Cloud</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item, drag, isActive, getIndex }: any) => {
    if (Platform.OS === 'web') {
      return renderItemContent(item, drag, isActive, getIndex);
    }
    return (
      <ScaleDecorator>
        {renderItemContent(item, drag, isActive, getIndex)}
      </ScaleDecorator>
    );
  };

  return (
    <View style={styles.container}>
      {vehicles.length > 0 && (
        <TextInput
          style={styles.searchInput}
          placeholder="Search your garage..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      )}

      {vehicles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏎️</Text>
          <Text style={styles.emptyText}>Your garage is empty.</Text>
          <Text style={styles.subText}>Add a vehicle to start tracking service history.</Text>
        </View>
      ) : Platform.OS === 'web' ? (
        <FlatList
          data={filteredVehicles}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => renderItem({ item, getIndex: () => index })}
          contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
        />
      ) : (
        <DraggableFlatList
          data={filteredVehicles}
          onDragEnd={({ data }) => {
            if (!searchQuery) {
              dispatch(reorderVehicles(data));
            }
          }}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          containerStyle={{ flex: 1 }}
        />
      )}
    </View>
  );
}

import { theme } from '../utils/theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  searchInput: {
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    ...theme.typography.body,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    ...theme.typography.h2,
    textAlign: 'center',
  },
  subText: {
    ...theme.typography.bodySecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    ...theme.shadows.glass,
  },
  cardActive: {
    borderColor: theme.colors.primary,
    transform: [{ scale: 1.02 }],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  ukPlate: {
    flexDirection: 'row',
    backgroundColor: theme.colors.plateYellow,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    overflow: 'hidden',
  },
  ukPlateBlueBand: {
    backgroundColor: '#003399',
    paddingHorizontal: 6,
    paddingVertical: 4,
    height: '100%',
    justifyContent: 'center',
  },
  ukPlateGB: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 10,
  },
  regText: {
    ...theme.typography.plate,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedBadge: {
    backgroundColor: theme.colors.secondary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
  },
  verifiedIcon: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  webOrderButtons: {
    flexDirection: 'row',
    marginLeft: theme.spacing.md,
  },
  arrowBtn: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
  },
  arrowBtnText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  cardBody: {
    padding: theme.spacing.md,
  },
  vehicleName: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.xs,
  },
  guestBadge: {
    ...theme.typography.caption,
    color: theme.colors.primaryLight,
    fontWeight: '600',
  },
  syncedBadge: {
    ...theme.typography.caption,
    color: theme.colors.secondary,
    fontWeight: '600',
  },
});
