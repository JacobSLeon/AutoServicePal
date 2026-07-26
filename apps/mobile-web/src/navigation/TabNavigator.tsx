import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Button, View, Text, StyleSheet } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { logout } from '../store/slices/authSlice';
import HomeScreen from '../screens/HomeScreen';
import AddVehicleScreen from '../screens/AddVehicleScreen';

const Tab = createBottomTabNavigator();

// Inline simple Profile screen for the tab
function ProfileScreen({ navigation }: any) {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  if (!isAuthenticated) {
    return (
      <View style={styles.center}>
        <Text style={{ marginBottom: 20 }}>You are currently browsing as a Guest.</Text>
        <Button title="Login or Register" onPress={() => navigation.navigate('Login')} />
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <Text style={{ marginBottom: 10, fontSize: 18, fontWeight: 'bold' }}>Logged in as: {user?.email}</Text>
      <Text style={{ marginBottom: 20 }}>Role: {user?.role}</Text>
      <Button title="Logout" color="red" onPress={() => dispatch(logout())} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
});

export default function TabNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen 
        name="Garage" 
        component={HomeScreen} 
        options={{ title: 'My Garage' }} 
      />
      <Tab.Screen 
        name="AddVehicle" 
        component={AddVehicleScreen} 
        options={{ title: 'Add Vehicle' }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'Profile' }} 
      />
    </Tab.Navigator>
  );
}
