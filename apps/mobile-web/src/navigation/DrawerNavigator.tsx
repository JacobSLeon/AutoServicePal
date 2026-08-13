import React from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { logout } from '../store/slices/authSlice';
import { useDeleteAccountMutation } from '../store/api/apiSlice';
import RootNavigator from './RootNavigator';
import { theme } from '../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { crossPlatformAlert } from '../utils/alert';

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props: any) {
  const dispatch = useDispatch();
  const auth = useSelector((state: RootState) => state.auth);
  const [deleteAccount] = useDeleteAccountMutation();

  const handleLogout = () => {
    dispatch(logout());
    props.navigation.closeDrawer();
  };

  const handleDeleteAccount = () => {
    crossPlatformAlert('Delete Account', 'Are you sure you want to permanently delete your account?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAccount().unwrap();
            dispatch(logout());
            props.navigation.closeDrawer();
          } catch (e: any) {
            crossPlatformAlert('Error', e?.data?.message || 'Failed to delete account');
          }
        }
      }
    ]);
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContent}>
      <View style={styles.header}>
        <Ionicons name="person-circle-outline" size={64} color={theme.colors.primary} />
        <Text style={styles.headerText}>
          {auth.isAuthenticated ? auth.user?.email : 'Guest User'}
        </Text>
      </View>
      
      <View style={styles.itemsContainer}>
        {/* We can put other navigation items here if needed, 
            but for now we just want actions. */}
      </View>

      <View style={styles.footer}>
        {auth.isAuthenticated ? (
          <>
            <TouchableOpacity style={styles.footerBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color={theme.colors.text} />
              <Text style={styles.footerBtnText}>Log Out</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.footerBtn, styles.deleteBtn]} onPress={handleDeleteAccount}>
              <Ionicons name="trash-outline" size={24} color={theme.colors.error} />
              <Text style={[styles.footerBtnText, { color: theme.colors.error }]}>Delete Account</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.footerBtn} onPress={() => props.navigation.navigate('Login')}>
            <Ionicons name="log-in-outline" size={24} color={theme.colors.text} />
            <Text style={styles.footerBtnText}>Log In</Text>
          </TouchableOpacity>
        )}
      </View>
    </DrawerContentScrollView>
  );
}

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator 
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerPosition: 'right', // Standard for hamburger on right
        drawerStyle: {
          backgroundColor: theme.colors.card,
        }
      }}
    >
      <Drawer.Screen name="AppRoot" component={RootNavigator} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
  },
  header: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    alignItems: 'center',
  },
  headerText: {
    ...theme.typography.h3,
    marginTop: theme.spacing.sm,
  },
  itemsContainer: {
    flex: 1,
    paddingTop: theme.spacing.md,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  footerBtnText: {
    ...theme.typography.body,
    marginLeft: theme.spacing.md,
    fontWeight: 'bold',
  },
  deleteBtn: {
    marginTop: theme.spacing.sm,
  }
});
