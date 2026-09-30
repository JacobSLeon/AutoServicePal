import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { useGetDriverProfileQuery, useSyncDriverProfileMutation } from '../store/api/apiSlice';
import Button from '../components/Button';
import Card from '../components/Card';
import { theme } from '../utils/theme';
import { crossPlatformAlert } from '../utils/alert';
import { Ionicons } from '@expo/vector-icons';

export default function DriverScreen() {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  
  const { data: driverData, isLoading: isFetching, refetch } = useGetDriverProfileQuery(undefined, {
    skip: !isAuthenticated,
  });
  
  const [syncDriverProfile, { isLoading: isSyncing }] = useSyncDriverProfileMutation();
  const [licenceNumber, setLicenceNumber] = useState('');

  const profile = driverData?.data?.profile;

  if (!isAuthenticated) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="card-outline" size={64} color={theme.colors.border} />
        <Text style={styles.guestText}>Please log in to manage your driver profile.</Text>
      </View>
    );
  }

  const handleSync = async () => {
    if (!licenceNumber || licenceNumber.length !== 16) {
      crossPlatformAlert('Invalid Input', 'Please enter a valid 16-character driving licence number.');
      return;
    }
    
    try {
      await syncDriverProfile({ licence_number: licenceNumber }).unwrap();
      crossPlatformAlert('Success', 'Driver profile fetched and saved!');
      refetch();
    } catch (err: any) {
      crossPlatformAlert('Error', err?.data?.message || 'Failed to fetch driver data.');
    }
  };

  if (isFetching) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Driver Profile</Text>
          <Text style={styles.headerSub}>Connect your UK Driving Licence</Text>
        </View>
        <Card style={styles.card}>
          <Text style={styles.label}>Driving Licence Number</Text>
          <TextInput
            style={styles.input}
            placeholder="SMITH12345678901"
            value={licenceNumber}
            onChangeText={setLicenceNumber}
            autoCapitalize="characters"
            maxLength={16}
          />
          <Button 
            title="Fetch DVLA Data" 
            onPress={handleSync} 
            isLoading={isSyncing}
          />
          <Text style={styles.hint}>
            We securely query the official Government ADD API to retrieve your CPC, points, and licence validity.
          </Text>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Driver Profile</Text>
        <Text style={styles.headerSub}>UK Government ADD Data</Text>
      </View>
      
      {/* Licence Card */}
      <View style={styles.licenceCard}>
        <View style={styles.licenceHeader}>
          <Ionicons name="car-outline" size={24} color="#FFF" />
          <Text style={styles.licenceHeaderTitle}>UK DRIVING LICENCE</Text>
          <Text style={styles.licenceGB}>GB</Text>
        </View>
        
        <View style={styles.licenceBody}>
          <View style={styles.licenceRow}>
            <Text style={styles.licenceLabel}>5. Licence Number</Text>
            <Text style={styles.licenceValueLarge}>{profile.licence_number}</Text>
          </View>
          
          <View style={styles.licenceRow}>
            <Text style={styles.licenceLabel}>4b. Valid To</Text>
            <Text style={styles.licenceValue}>{new Date(profile.valid_to).toLocaleDateString()}</Text>
          </View>
          
          <View style={styles.licenceRow}>
            <Text style={styles.licenceLabel}>Status</Text>
            <Text style={[
              styles.licenceValue, 
              { color: profile.status === 'Valid' ? '#4CAF50' : '#F44336' }
            ]}>
              {profile.status.toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.licenceRow}>
            <Text style={styles.licenceLabel}>Penalty Points</Text>
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsText}>{profile.penalty_points}</Text>
            </View>
          </View>
        </View>
      </View>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>CPC Qualifications</Text>
        {profile.cpc_data && profile.cpc_data.length > 0 ? (
          profile.cpc_data.map((cpc: any, idx: number) => (
            <View key={idx} style={styles.dataRow}>
              <Text style={styles.dataLabel}>{cpc.module}</Text>
              <Text style={styles.dataValue}>{cpc.status} (Exp: {new Date(cpc.expiry).toLocaleDateString()})</Text>
            </View>
          ))
        ) : (
          <Text style={styles.hint}>No CPC data on file.</Text>
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Tachograph Cards</Text>
        {profile.tachograph_data && profile.tachograph_data.length > 0 ? (
          profile.tachograph_data.map((tacho: any, idx: number) => (
            <View key={idx} style={styles.dataRow}>
              <Text style={styles.dataLabel}>{tacho.card_number}</Text>
              <Text style={styles.dataValue}>{tacho.status} (Exp: {new Date(tacho.expiry).toLocaleDateString()})</Text>
            </View>
          ))
        ) : (
          <Text style={styles.hint}>No Tachograph cards on file.</Text>
        )}
      </Card>

      <View style={styles.footer}>
        <Button title="Refresh Data" variant="outline" onPress={() => syncDriverProfile({ licence_number: profile.licence_number })} isLoading={isSyncing} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  guestText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: 50,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...theme.shadows.glass,
  },
  headerTitle: {
    ...theme.typography.h1,
    color: '#FFF',
  },
  headerSub: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  card: {
    margin: theme.spacing.md,
  },
  label: {
    ...theme.typography.bodySecondary,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.typography.body,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
    letterSpacing: 2,
    fontWeight: 'bold',
  },
  hint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  licenceCard: {
    margin: theme.spacing.md,
    backgroundColor: '#ffb6c1', // UK pink licence colour approx
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.glass,
  },
  licenceHeader: {
    backgroundColor: '#003399', // UK blue flag band
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
  },
  licenceHeaderTitle: {
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  licenceGB: {
    color: '#FFD700', // Gold GB
    fontWeight: 'bold',
    fontSize: 16,
  },
  licenceBody: {
    padding: theme.spacing.md,
    backgroundColor: '#FDE1E6', // Lighter pink tint
  },
  licenceRow: {
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  licenceLabel: {
    fontSize: 12,
    color: '#d81b60',
    fontWeight: '600',
    width: 100,
  },
  licenceValue: {
    ...theme.typography.body,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  licenceValueLarge: {
    ...theme.typography.h3,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  pointsBadge: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pointsText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dataLabel: {
    ...theme.typography.body,
    fontWeight: 'bold',
  },
  dataValue: {
    ...theme.typography.bodySecondary,
  },
  footer: {
    padding: theme.spacing.md,
    marginBottom: 40,
  }
});
