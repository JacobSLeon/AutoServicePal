import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, FlatList, TextInput, Alert, Modal } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { reorderVehicles, removeVehicle } from '../store/slices/vehicleSlice';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import InputField from '../components/InputField';
import UKNumberPlate from '../components/UKNumberPlate';
import Button from '../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';

export default function HomeScreen({ navigation }: any) {
  const vehicles = useSelector((state: RootState) => state.vehicles.vehicles);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [newReg, setNewReg] = useState('');
  
  // For the edit modal
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

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

  const handleAddVehicle = () => {
    if (!newReg.trim()) return;
    navigation.navigate('AddVehicle', { initialReg: newReg.toUpperCase() });
    setNewReg('');
  };

  const handleRemoveVehicle = () => {
    if (!selectedVehicle) return;
    Alert.alert(
      'Remove Vehicle',
      'Are you sure you want to remove this vehicle? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            dispatch(removeVehicle(selectedVehicle.id));
            setSelectedVehicle(null);
          }
        }
      ]
    );
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
        <View style={styles.cardTopRow}>
          <UKNumberPlate registrationNumber={item.registrationNumber} size="large" style={{flex: 1}} />
          
          <View style={styles.cardTopActions}>
            <TouchableOpacity 
              style={styles.pencilBtn} 
              onPress={() => setSelectedVehicle(item)}
            >
              <Ionicons name="pencil" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            {item.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={28} color={theme.colors.secondary} />
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardBottomRow}>
           <View style={{flex: 1}}>
             <Text style={styles.vehicleName}>{item.make} {item.model}</Text>
             {item.isGuest ? (
               <Text style={styles.guestBadge}>● Guest Data (Not Synced)</Text>
             ) : (
               <Text style={styles.syncedBadge}>● Synced to Cloud</Text>
             )}
           </View>
           
           <TouchableOpacity 
             style={styles.arrowBtn}
             onPress={() => navigation.navigate('VehicleDetails', { vehicleId: item.id })}
           >
             <Ionicons name="arrow-forward" size={24} color="#FFF" />
           </TouchableOpacity>
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
      {/* Red Header Banner */}
      <View style={styles.redBanner}>
        <Text style={styles.bannerTitle}>ADD VEHICLE</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.regInput}
            placeholder="ENTER REG"
            placeholderTextColor="#999"
            value={newReg}
            onChangeText={setNewReg}
            autoCapitalize="characters"
          />
          <Button title="GO" onPress={handleAddVehicle} style={{marginLeft: 8, paddingVertical: 12, backgroundColor: '#FFF'}} variant="outline" />
        </View>
        
        {!isAuthenticated && (
          <TouchableOpacity 
            style={styles.authPill} 
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.authPillText}>SIGN IN / REGISTER</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Bar (only if > 10 vehicles) */}
      {vehicles.length > 10 && (
        <View style={{ padding: theme.spacing.md, paddingBottom: 0 }}>
          <InputField
            placeholder="Search your garage..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      {/* Vehicle List */}
      {vehicles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="car-outline" size={80} color={theme.colors.textSecondary} style={{marginBottom: 16}} />
          <Text style={styles.emptyText}>Your garage is empty.</Text>
          <Text style={styles.subText}>Enter a registration above to add a vehicle.</Text>
        </View>
      ) : (
        <View style={{ flex: 1, padding: theme.spacing.md }}>
          {Platform.OS === 'web' ? (
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
      )}

      {/* Edit / Remove Modal */}
      <Modal
        visible={!!selectedVehicle}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedVehicle(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manage Vehicle</Text>
            <Text style={styles.modalSub}>{selectedVehicle?.registrationNumber}</Text>
            
            <Button 
              title="Remove Vehicle" 
              variant="danger" 
              onPress={handleRemoveVehicle}
              style={{ width: '100%', marginBottom: 16 }}
            />
            
            <Button 
              title="Cancel" 
              variant="outline"
              onPress={() => setSelectedVehicle(null)}
              style={{ width: '100%' }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  redBanner: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl + 20, // Account for safe area roughly
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...theme.shadows.glass,
    zIndex: 10,
  },
  bannerTitle: {
    ...theme.typography.h2,
    color: '#FFF',
    marginBottom: theme.spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 400,
    marginBottom: theme.spacing.md,
  },
  regInput: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: theme.borderRadius.pill,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
    textAlign: 'center',
  },
  authPill: {
    backgroundColor: '#FFF',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.pill,
    marginTop: theme.spacing.sm,
  },
  authPillText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    ...theme.typography.h2,
    textAlign: 'center',
    color: theme.colors.text,
  },
  subText: {
    ...theme.typography.bodySecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.xl,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    ...theme.shadows.subtle,
  },
  cardActive: {
    borderColor: theme.colors.primary,
    transform: [{ scale: 1.02 }],
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  cardTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pencilBtn: {
    padding: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 20,
    marginLeft: 8,
  },
  verifiedBadge: {
    marginLeft: 8,
  },
  cardBottomRow: {
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  arrowBtn: {
    backgroundColor: theme.colors.primary,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.subtle,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.xl,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: 'center',
  },
  modalTitle: {
    ...theme.typography.h2,
    marginBottom: theme.spacing.xs,
  },
  modalSub: {
    ...theme.typography.bodySecondary,
    marginBottom: theme.spacing.xl,
  },
});
