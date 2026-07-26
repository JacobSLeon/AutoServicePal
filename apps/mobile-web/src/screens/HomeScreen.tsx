import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
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

  const renderItem = ({ item, drag, isActive }: RenderItemParams<any>) => {
    return (
      <ScaleDecorator>
        <TouchableOpacity
          style={[styles.card, isActive && { backgroundColor: '#e0e0e0' }]}
          onLongPress={drag}
          onPress={() => navigation.navigate('VehicleDetails', { vehicleId: item.id })}
          activeOpacity={1}
        >
          <Text style={styles.regText}>{item.registrationNumber}</Text>
          <Text>{item.make} {item.model}</Text>
          {item.isGuest ? (
            <Text style={styles.guestBadge}>Guest Data (Not Synced)</Text>
          ) : (
            <Text style={styles.syncedBadge}>Synced to Cloud ✅</Text>
          )}
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  return (
    <View style={styles.container}>
      {vehicles.length > 0 && (
        <TextInput
          style={styles.searchInput}
          placeholder="Search garage..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      )}

      {vehicles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Your garage is empty.</Text>
          <Text style={styles.subText}>Add a vehicle to start tracking service history.</Text>
        </View>
      ) : (
        <DraggableFlatList
          data={filteredVehicles}
          onDragEnd={({ data }) => {
            // Only allow reordering if we are not actively filtering
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  searchInput: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subText: {
    marginTop: 8,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  regText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  guestBadge: {
    marginTop: 8,
    color: '#ff9800',
    fontSize: 12,
    fontWeight: '600',
  },
  syncedBadge: {
    marginTop: 8,
    color: '#4caf50',
    fontSize: 12,
    fontWeight: '600',
  },
});
