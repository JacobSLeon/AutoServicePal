import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { logout } from '../store/slices/authSlice';
import HomeScreen from '../screens/HomeScreen';
import AddVehicleScreen from '../screens/AddVehicleScreen';
import AdminScreen from '../screens/AdminScreen';
import { theme } from '../utils/theme';

const Tab = createBottomTabNavigator();

function ProfileScreen({ navigation }: any) {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  const renderMenuItem = (title: string, onPress: () => void, isDestructive = false) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text style={[styles.menuItemText, isDestructive && { color: theme.colors.error }]}>{title}</Text>
      <Text style={styles.menuItemArrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.profileContainer}>
      <View style={styles.profileHeader}>
        {isAuthenticated ? (
          <>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{user?.email?.charAt(0).toUpperCase() || 'U'}</Text>
            </View>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user?.role}</Text>
            </View>
          </>
        ) : (
          <>
            <View style={[styles.avatarCircle, { backgroundColor: theme.colors.border }]}>
              <Text style={styles.avatarText}>G</Text>
            </View>
            <Text style={styles.profileEmail}>Guest User</Text>
            <Text style={styles.guestSubtext}>Log in to sync your garage to the cloud</Text>
            <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginBtnText}>Log In or Register</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Account</Text>
        {renderMenuItem('Messages', () => {})}
        {renderMenuItem('Manage Vehicles', () => navigation.navigate('Garage'))}
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Support & About</Text>
        {renderMenuItem('FAQs', () => {})}
        {renderMenuItem('Contact Us', () => {})}
        {renderMenuItem('Terms of Service', () => {})}
        {renderMenuItem('Privacy Policy', () => {})}
      </View>

      {isAuthenticated && (
        <View style={styles.menuSection}>
          {renderMenuItem('Log Out', () => dispatch(logout()), true)}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profileContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.glass,
  },
  avatarText: {
    ...theme.typography.h1,
    color: '#fff',
  },
  profileEmail: {
    ...theme.typography.h2,
    marginBottom: theme.spacing.xs,
  },
  roleBadge: {
    backgroundColor: theme.colors.glass,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  roleText: {
    ...theme.typography.caption,
    fontWeight: 'bold',
  },
  guestSubtext: {
    ...theme.typography.bodySecondary,
    marginBottom: theme.spacing.md,
  },
  loginBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  loginBtnText: {
    ...theme.typography.body,
    fontWeight: 'bold',
  },
  menuSection: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.caption,
    textTransform: 'uppercase',
    marginLeft: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    color: theme.colors.textSecondary,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuItemText: {
    ...theme.typography.body,
  },
  menuItemArrow: {
    ...theme.typography.h3,
    color: theme.colors.textSecondary,
  }
});

export default function TabNavigator() {
  const user = useSelector((state: RootState) => state.auth.user);

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.background,
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0
        },
        headerTintColor: theme.colors.text,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
      }}
    >
      <Tab.Screen name="Garage" component={HomeScreen} options={{ title: 'My Garage' }} />
      <Tab.Screen name="AddVehicle" component={AddVehicleScreen} options={{ title: 'Add Vehicle' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      {user?.role === 'ADMIN' && (
        <Tab.Screen name="Admin" component={AdminScreen} options={{ title: 'Admin' }} />
      )}
    </Tab.Navigator>
  );
}
