import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../utils/theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  premium?: boolean;
}

export default function Card({ children, style, premium = false, ...props }: CardProps) {
  if (premium) {
    return (
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, styles.premiumCard, style]}
        {...props as any}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.glass,
  },
  premiumCard: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.1)',
  }
});
