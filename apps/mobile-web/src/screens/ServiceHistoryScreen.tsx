import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image } from 'react-native';
import { useGetServiceHistoryQuery } from '../store/api/apiSlice';

export default function ServiceHistoryScreen({ route }: any) {
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
      <View style={styles.card}>
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
      </View>
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
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 14,
    color: '#888',
  },
  type: {
    fontSize: 14,
    color: '#444',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  workItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  workItemText: {
    fontSize: 14,
  },
  workItemDesc: {
    fontSize: 14,
    color: '#555',
  },
  verifiedBadge: {
    fontSize: 12,
    color: 'green',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  proofImage: {
    width: 60,
    height: 60,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 4,
    backgroundColor: '#eee',
  },
  adminNote: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#fff3cd',
    borderRadius: 4,
  },
  adminNoteTitle: {
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 4,
  }
});
