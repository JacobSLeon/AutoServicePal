import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import VehicleDetailsScreen from '../screens/VehicleDetailsScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ServiceHistoryScreen from '../screens/ServiceHistoryScreen';
import AddServiceScreen from '../screens/AddServiceScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="MainTabs" 
        component={TabNavigator} 
      />
      <Stack.Screen 
        name="VehicleDetails" 
        component={VehicleDetailsScreen} 
        options={{ headerShown: true, title: 'Vehicle Details' }}
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
        name="ForgotPassword" 
        component={ForgotPasswordScreen} 
        options={{ title: 'Forgot Password' }}
      />
      <Stack.Screen 
        name="ServiceHistory" 
        component={ServiceHistoryScreen} 
        options={{ headerShown: true, title: 'Service History' }}
      />
      <Stack.Screen 
        name="AddService" 
        component={AddServiceScreen} 
        options={{ headerShown: true, title: 'Add Service Record' }}
      />
    </Stack.Navigator>
  );
}
