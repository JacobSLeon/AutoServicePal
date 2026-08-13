import React from 'react';
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps, ActivityIndicator } from 'react-native';
import { theme } from '../utils/theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  isLoading?: boolean;
}

export default function Button({ title, variant = 'primary', isLoading, style, disabled, ...props }: ButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return [styles.secondaryBtn, disabled && styles.disabledBtn];
      case 'danger':
        return [styles.dangerBtn, disabled && styles.disabledBtn];
      case 'outline':
        return [styles.outlineBtn, disabled && styles.disabledBtn];
      case 'primary':
      default:
        return [styles.primaryBtn, disabled && styles.disabledBtn];
    }
  };

  const getVariantTextStyles = () => {
    switch (variant) {
      case 'secondary':
      case 'primary':
        return styles.darkText;
      case 'danger':
        return styles.lightText;
      case 'outline':
        return styles.outlineText;
      default:
        return styles.darkText;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.baseBtn, ...getVariantStyles(), style]}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'outline' ? theme.colors.primary : '#000'} />
      ) : (
        <Text style={[styles.baseText, getVariantTextStyles()]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  baseBtn: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.subtle,
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
  },
  secondaryBtn: {
    backgroundColor: theme.colors.secondary,
  },
  dangerBtn: {
    backgroundColor: theme.colors.error,
  },
  outlineBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  baseText: {
    ...theme.typography.h3,
  },
  darkText: {
    color: '#000',
  },
  lightText: {
    color: '#FFF',
  },
  outlineText: {
    color: theme.colors.primary,
  }
});
