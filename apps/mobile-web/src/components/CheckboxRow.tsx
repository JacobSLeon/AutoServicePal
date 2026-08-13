import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../utils/theme';

interface CheckboxRowProps {
  label: string;
  isSelected: boolean;
  onToggle: () => void;
}

export default function CheckboxRow({ label, isSelected, onToggle }: CheckboxRowProps) {
  return (
    <TouchableOpacity 
      style={[styles.checkboxRow, isSelected && styles.checkboxRowActive]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
        {isSelected && <Text style={styles.checkboxTick}>✓</Text>}
      </View>
      <Text style={[styles.checkboxLabel, isSelected && styles.checkboxLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
  },
  checkboxRowActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 4,
    marginRight: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.glass,
  },
  checkboxActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkboxTick: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  checkboxLabel: {
    ...theme.typography.body,
  },
  checkboxLabelActive: {
    fontWeight: 'bold',
    color: theme.colors.primaryLight,
  },
});
