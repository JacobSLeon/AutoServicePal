import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Button, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { 
  useGetPendingReviewsQuery, 
  useReviewV5Mutation, 
  useVerifyWorkItemMutation 
} from '../store/api/apiSlice';
import { crossPlatformAlert } from '../utils/alert';

export default function AdminScreen() {
  const { data, isLoading, refetch } = useGetPendingReviewsQuery();
  const [reviewV5, { isLoading: isReviewingV5 }] = useReviewV5Mutation();
  const [verifyWorkItem, { isLoading: isVerifyingWorkItem }] = useVerifyWorkItemMutation();

  const [activeTab, setActiveTab] = useState<'V5' | 'WorkItems'>('V5');
  const [rejectionReasons, setRejectionReasons] = useState<{ [key: string]: string }>({});
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const pendingV5s = data?.data?.pendingV5s || [];
  const pendingWorkItems = data?.data?.pendingWorkItems || [];

  const handleReviewV5 = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const reason = rejectionReasons[id];
    if (status === 'REJECTED' && (!reason || reason.trim() === '')) {
      crossPlatformAlert('Error', 'Please provide a rejection reason.');
      return;
    }

    try {
      await reviewV5({ id, status, rejection_reason: status === 'REJECTED' ? reason : undefined }).unwrap();
      crossPlatformAlert('Success', `V5 ${status}`);
      refetch();
    } catch (err: any) {
      crossPlatformAlert('Error', err?.data?.message || 'Failed to review V5');
    }
  };

  const handleVerifyWorkItem = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const note = adminNotes[id];
    
    try {
      await verifyWorkItem({ id, status, admin_note: note || undefined }).unwrap();
      crossPlatformAlert('Success', `Work item ${status}`);
      refetch();
    } catch (err: any) {
      crossPlatformAlert('Error', err?.data?.message || 'Failed to verify work item');
    }
  };

  const renderV5Item = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.registration_number}</Text>
      <Text style={styles.subText}>{item.make} {item.model}</Text>
      <Text style={styles.subText}>User: {item.email}</Text>
      
      <Image source={{ uri: item.v5_image_url }} style={styles.proofImageLarge} resizeMode="contain" />
      
      <TextInput
        style={styles.input}
        placeholder="Rejection reason (if rejecting)..."
        value={rejectionReasons[item.v5_id] || ''}
        onChangeText={(text) => setRejectionReasons(prev => ({ ...prev, [item.v5_id]: text }))}
      />
      
      <View style={styles.buttonRow}>
        <View style={styles.btnWrapper}>
          <Button title="Approve" color="#4caf50" onPress={() => handleReviewV5(item.v5_id, 'APPROVED')} disabled={isReviewingV5} />
        </View>
        <View style={styles.btnWrapper}>
          <Button title="Reject" color="#f44336" onPress={() => handleReviewV5(item.v5_id, 'REJECTED')} disabled={isReviewingV5} />
        </View>
      </View>
    </View>
  );

  const renderWorkItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.record_name} - {item.registration_number}</Text>
      <Text style={styles.subText}>Item: {item.item_key.replace(/_/g, ' ').toUpperCase()}</Text>
      {item.custom_description && <Text style={styles.subText}>Desc: {item.custom_description}</Text>}
      <Text style={styles.subText}>User: {item.email}</Text>

      {item.proofs && item.proofs.length > 0 && (
        <ScrollView horizontal style={styles.imageScroll}>
          {item.proofs.map((proof: any) => (
            <Image key={proof.id} source={{ uri: proof.image_url }} style={styles.proofImageSmall} />
          ))}
        </ScrollView>
      )}

      <TextInput
        style={styles.input}
        placeholder="Admin note (optional)..."
        value={adminNotes[item.work_item_id] || ''}
        onChangeText={(text) => setAdminNotes(prev => ({ ...prev, [item.work_item_id]: text }))}
      />

      <View style={styles.buttonRow}>
        <View style={styles.btnWrapper}>
          <Button title="Approve" color="#4caf50" onPress={() => handleVerifyWorkItem(item.work_item_id, 'APPROVED')} disabled={isVerifyingWorkItem} />
        </View>
        <View style={styles.btnWrapper}>
          <Button title="Reject" color="#f44336" onPress={() => handleVerifyWorkItem(item.work_item_id, 'REJECTED')} disabled={isVerifyingWorkItem} />
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <Button 
          title={`V5 Reviews (${pendingV5s.length})`} 
          color={activeTab === 'V5' ? '#007bff' : '#aaa'} 
          onPress={() => setActiveTab('V5')} 
        />
        <Button 
          title={`Work Items (${pendingWorkItems.length})`} 
          color={activeTab === 'WorkItems' ? '#007bff' : '#aaa'} 
          onPress={() => setActiveTab('WorkItems')} 
        />
      </View>

      {activeTab === 'V5' ? (
        pendingV5s.length > 0 ? (
          <FlatList
            data={pendingV5s}
            keyExtractor={item => item.v5_id}
            renderItem={renderV5Item}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        ) : (
          <View style={styles.center}><Text>No pending V5 reviews.</Text></View>
        )
      ) : (
        pendingWorkItems.length > 0 ? (
          <FlatList
            data={pendingWorkItems}
            keyExtractor={item => item.work_item_id}
            renderItem={renderWorkItem}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        ) : (
          <View style={styles.center}><Text>No pending work items.</Text></View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subText: {
    color: '#555',
    marginBottom: 4,
  },
  proofImageLarge: {
    width: '100%',
    height: 200,
    backgroundColor: '#eee',
    borderRadius: 8,
    marginVertical: 12,
  },
  proofImageSmall: {
    width: 100,
    height: 100,
    backgroundColor: '#eee',
    borderRadius: 8,
    marginRight: 8,
  },
  imageScroll: {
    flexDirection: 'row',
    marginVertical: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  btnWrapper: {
    flex: 1,
    marginHorizontal: 4,
  }
});
