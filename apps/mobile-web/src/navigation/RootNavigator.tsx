import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import VehicleDetailsScreen from '../screens/VehicleDetailsScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ServiceHistoryScreen from '../screens/ServiceHistoryScreen';
import AddServiceScreen from '../screens/AddServiceScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MainTabs" 
        component={TabNavigator} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="VehicleDetails" 
        component={VehicleDetailsScreen} 
        options={{ title: 'Vehicle Details' }}
      />
      <Stack.Screen 
        name="Login" 
        component={LoginScreen} 
        options={{ title: 'Login' }}
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen} 
        options={{ title: 'Register' }}
      />
      <Stack.Screen 
        name="ServiceHistory" 
        component={ServiceHistoryScreen} 
        options={{ title: 'Service History' }}
      />
      <Stack.Screen 
        name="AddService" 
        component={AddServiceScreen} 
        options={{ title: 'Add Service Record' }}
      />
    </Stack.Navigator>
  );
}
