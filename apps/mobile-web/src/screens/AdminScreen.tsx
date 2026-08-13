import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator, ScrollView } from 'react-native';
import { 
  useGetPendingReviewsQuery, 
  useReviewV5Mutation, 
  useVerifyWorkItemMutation,
  useGetDailyReportQuery,
  useGetWeeklyReportQuery
} from '../store/api/apiSlice';
import { crossPlatformAlert } from '../utils/alert';
import Button from '../components/Button';
import Card from '../components/Card';
import InputField from '../components/InputField';
import { theme } from '../utils/theme';

export default function AdminScreen() {
  const { data, isLoading, refetch } = useGetPendingReviewsQuery();
  const [reviewV5, { isLoading: isReviewingV5 }] = useReviewV5Mutation();
  const [verifyWorkItem, { isLoading: isVerifyingWorkItem }] = useVerifyWorkItemMutation();

  const { data: dailyReportData, isLoading: isDailyLoading } = useGetDailyReportQuery();
  const { data: weeklyReportData, isLoading: isWeeklyLoading } = useGetWeeklyReportQuery();

  const [activeTab, setActiveTab] = useState<'V5' | 'WorkItems' | 'Reports'>('V5');
  const [rejectionReasons, setRejectionReasons] = useState<{ [key: string]: string }>({});
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});

  if (isLoading || isDailyLoading || isWeeklyLoading) {
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
    <Card style={styles.cardMargin}>
      <Text style={styles.cardTitle}>{item.registration_number}</Text>
      <Text style={styles.subText}>{item.make} {item.model}</Text>
      <Text style={styles.subText}>User: {item.email}</Text>
      
      <Image source={{ uri: item.v5_image_url }} style={styles.proofImageLarge} resizeMode="contain" />
      
      <InputField
        placeholder="Rejection reason (if rejecting)..."
        value={rejectionReasons[item.v5_id] || ''}
        onChangeText={(text) => setRejectionReasons(prev => ({ ...prev, [item.v5_id]: text }))}
      />
      
      <View style={styles.buttonRow}>
        <View style={styles.btnWrapper}>
          <Button title="Approve" variant="secondary" onPress={() => handleReviewV5(item.v5_id, 'APPROVED')} disabled={isReviewingV5} />
        </View>
        <View style={styles.btnWrapper}>
          <Button title="Reject" variant="danger" onPress={() => handleReviewV5(item.v5_id, 'REJECTED')} disabled={isReviewingV5} />
        </View>
      </View>
    </Card>
  );

  const renderWorkItem = ({ item }: { item: any }) => (
    <Card style={styles.cardMargin}>
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

      <InputField
        placeholder="Admin note (optional)..."
        value={adminNotes[item.work_item_id] || ''}
        onChangeText={(text) => setAdminNotes(prev => ({ ...prev, [item.work_item_id]: text }))}
      />

      <View style={styles.buttonRow}>
        <View style={styles.btnWrapper}>
          <Button title="Approve" variant="secondary" onPress={() => handleVerifyWorkItem(item.work_item_id, 'APPROVED')} disabled={isVerifyingWorkItem} />
        </View>
        <View style={styles.btnWrapper}>
          <Button title="Reject" variant="danger" onPress={() => handleVerifyWorkItem(item.work_item_id, 'REJECTED')} disabled={isVerifyingWorkItem} />
        </View>
      </View>
    </Card>
  );

  const renderReports = () => {
    const daily = dailyReportData?.data?.report;
    const weekly = weeklyReportData?.data?.report;

    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {daily && (
          <Card style={styles.cardMargin}>
            <Text style={styles.cardTitle}>Daily Operational Report</Text>
            <Text style={styles.subText}>Date: {new Date(daily.date).toLocaleDateString()}</Text>
            <Text style={styles.subText}>New Registrations (24h): {daily.newRegistrations24h}</Text>
            <Text style={styles.subText}>Account Deletions: {daily.accountDeletions}</Text>
            {daily.multiAccountFlags?.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.subText}>Multi-Account Flags:</Text>
                {daily.multiAccountFlags.map((flag: any, index: number) => (
                  <Text key={index} style={styles.subText}>
                    - {flag.full_name_v5} ({flag.count} accounts)
                  </Text>
                ))}
              </View>
            )}
          </Card>
        )}

        {weekly && (
          <Card style={styles.cardMargin}>
            <Text style={styles.cardTitle}>Weekly Operational Report</Text>
            <Text style={styles.subText}>Date: {new Date(weekly.date).toLocaleDateString()}</Text>
            <Text style={styles.subText}>Active Users (7d): {weekly.activeUsers7d}</Text>
            <Text style={styles.subText}>Inactive Users (30d): {weekly.inactiveUsers30d}</Text>
            <Text style={styles.subText}>New Service Records (7d): {weekly.newServiceRecords7d}</Text>
            <Text style={styles.subText}>Total Pending V5s: {weekly.pendingV5Verifications}</Text>
          </Card>
        )}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <View style={styles.tabBtnWrapper}>
          <Button 
            title={`V5 Reviews (${pendingV5s.length})`} 
            variant={activeTab === 'V5' ? 'primary' : 'outline'} 
            onPress={() => setActiveTab('V5')} 
          />
        </View>
        <View style={styles.tabBtnWrapper}>
          <Button 
            title={`Work Items (${pendingWorkItems.length})`} 
            variant={activeTab === 'WorkItems' ? 'primary' : 'outline'} 
            onPress={() => setActiveTab('WorkItems')} 
          />
        </View>
        <View style={styles.tabBtnWrapper}>
          <Button 
            title="Reports" 
            variant={activeTab === 'Reports' ? 'primary' : 'outline'} 
            onPress={() => setActiveTab('Reports')} 
          />
        </View>
      </View>

      {activeTab === 'Reports' ? (
        renderReports()
      ) : activeTab === 'V5' ? (
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
    backgroundColor: theme.colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabBtnWrapper: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
  },
  cardMargin: {
    margin: theme.spacing.md,
    marginBottom: 0,
  },
  cardTitle: {
    ...theme.typography.h3,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  subText: {
    ...theme.typography.bodySecondary,
    marginBottom: theme.spacing.xs,
  },
  proofImageLarge: {
    width: '100%',
    height: 200,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: theme.borderRadius.md,
    marginVertical: theme.spacing.sm,
  },
  proofImageSmall: {
    width: 100,
    height: 100,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.sm,
  },
  imageScroll: {
    flexDirection: 'row',
    marginVertical: theme.spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
  btnWrapper: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
  }
});
