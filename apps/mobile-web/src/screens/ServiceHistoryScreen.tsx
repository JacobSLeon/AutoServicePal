import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image } from 'react-native';
import { useGetServiceHistoryQuery } from '../store/api/apiSlice';
import Card from '../components/Card';
import Button from '../components/Button';
import { theme } from '../utils/theme';
export default function ServiceHistoryScreen({ route, navigation }: any) {
  const { vehicleId } = route.params;
  const { data, isLoading, error } = useGetServiceHistoryQuery(vehicleId);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !data?.data?.history) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Could not load service history.</Text>
      </View>
    );
  }

  const history = data.data.history;

  if (history.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No service history recorded for this vehicle.</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: any }) => {
    return (
      <Card style={{ marginBottom: theme.spacing.md }}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{item.record_name}</Text>
          <Text style={styles.date}>{new Date(item.service_date).toLocaleDateString()}</Text>
        </View>
        <Text style={styles.type}>Performed by: {item.service_type}</Text>

        <Text style={styles.sectionTitle}>Work Items:</Text>
        {item.work_items?.map((wi: any) => (
          <View key={wi.id} style={styles.workItemRow}>
            <Text style={styles.workItemText}>• {wi.item_key.replace(/_/g, ' ').toUpperCase()}</Text>
            {wi.custom_description ? (
              <Text style={styles.workItemDesc}> - {wi.custom_description}</Text>
            ) : null}
            {wi.is_verified ? (
              <Text style={styles.verifiedBadge}> ✅ Verified</Text>
            ) : null}
          </View>
        ))}

        {item.proofs && item.proofs.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Proofs attached: {item.proofs.length}</Text>
            <View style={styles.imageGrid}>
              {item.proofs.map((proof: any) => (
                <Image 
                  key={proof.id} 
                  source={{ uri: proof.image_url }} 
                  style={styles.proofImage} 
                />
              ))}
            </View>
          </View>
        )}
        
        {item.admin_note && (
          <View style={styles.adminNote}>
            <Text style={styles.adminNoteTitle}>Admin Note:</Text>
            <Text>{item.admin_note}</Text>
          </View>
        )}

        <View style={{ marginTop: theme.spacing.md }}>
          <Button 
            title="Edit Service" 
            variant="outline"
            onPress={() => navigation.navigate('AddService', { vehicleId, editMode: true, existingRecord: item })}
          />
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.error,
  },
  emptyText: {
    ...theme.typography.bodySecondary,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  title: {
    ...theme.typography.h3,
  },
  date: {
    ...theme.typography.bodySecondary,
  },
  type: {
    ...theme.typography.bodySecondary,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.primaryLight,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  workItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  workItemText: {
    ...theme.typography.body,
  },
  workItemDesc: {
    ...theme.typography.bodySecondary,
  },
  verifiedBadge: {
    ...theme.typography.caption,
    color: theme.colors.secondary,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.sm,
  },
  proofImage: {
    width: 60,
    height: 60,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  adminNote: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.plateYellow,
  },
  adminNoteTitle: {
    ...theme.typography.body,
    fontWeight: 'bold',
    color: theme.colors.plateYellow,
    marginBottom: 4,
  }
});
