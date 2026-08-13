import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../utils/theme';

interface UKNumberPlateProps {
  registrationNumber: string;
  size?: 'small' | 'large';
  style?: ViewStyle;
}

export default function UKNumberPlate({ registrationNumber, size = 'small', style }: UKNumberPlateProps) {
  const isLarge = size === 'large';
  
  return (
    <View style={[styles.plateContainer, style]}>
      <View style={[styles.blueBand, isLarge && styles.blueBandLarge]}>
        <Text style={[styles.gbText, isLarge && styles.gbTextLarge]}>GB</Text>
      </View>
      <Text style={[styles.regText, isLarge && styles.regTextLarge]}>
        {registrationNumber?.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  plateContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.plateYellow,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#000',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  blueBand: {
    backgroundColor: '#003399',
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  blueBandLarge: {
    paddingHorizontal: 12,
  },
  gbText: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 12,
  },
  gbTextLarge: {
    fontSize: 16,
  },
  regText: {
    ...theme.typography.plate,
    fontSize: 20,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
    textAlign: 'center',
  },
  regTextLarge: {
    fontSize: 32,
    paddingVertical: theme.spacing.sm,
  },
});
