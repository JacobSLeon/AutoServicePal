import React, { useRef } from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../utils/theme';

interface ButtonProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  isLoading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: any;
  textStyle?: any;
}

export default function Button({ title, variant = 'primary', isLoading, style, textStyle, disabled, onPress, ...props }: ButtonProps) {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled || isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || isLoading) return;
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      bounciness: 10,
    }).start();
  };

  const getVariantTextStyles = () => {
    switch (variant) {
      case 'secondary':
        return styles.darkText;
      case 'primary':
      case 'danger':
        return styles.lightText;
      case 'outline':
        return styles.outlineText;
      default:
        return styles.lightText;
    }
  };

  const renderContent = () => (
    <>
      {isLoading ? (
        <ActivityIndicator color={variant === 'outline' ? theme.colors.primary : '#FFF'} />
      ) : (
        <Text style={[styles.baseText, getVariantTextStyles(), textStyle]}>{title}</Text>
      )}
    </>
  );

  const buttonStyle = [styles.baseBtn, disabled && styles.disabledBtn, style];

  if (variant === 'primary') {
    return (
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || isLoading}
          {...props}
        >
          <LinearGradient
            colors={['#FF416C', '#FF4B2B']} // Vibrant Red/Orange gradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={buttonStyle}
          >
            {renderContent()}
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  if (variant === 'secondary') {
    return (
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || isLoading}
          {...props}
        >
          <LinearGradient
            colors={['#00E676', '#00C853']} // Vibrant Green gradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={buttonStyle}
          >
            {renderContent()}
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  // Outline or Danger fallbacks
  let fallbackStyle;
  if (variant === 'danger') fallbackStyle = styles.dangerBtn;
  if (variant === 'outline') fallbackStyle = styles.outlineBtn;

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || isLoading}
        style={[styles.baseBtn, fallbackStyle, disabled && styles.disabledBtn, style]}
        {...props}
      >
        {renderContent()}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  baseBtn: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.glass, // Stronger shadow for premium feel
  },
  dangerBtn: {
    backgroundColor: theme.colors.error,
  },
  outlineBtn: {
    backgroundColor: 'transparent',
    borderWidth: 2, // Thicker border for premium look
    borderColor: theme.colors.primary,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  baseText: {
    ...theme.typography.h3,
    textTransform: 'uppercase', // More dynamic look
    letterSpacing: 1,
  },
  darkText: {
    color: '#121212',
    fontWeight: '900',
  },
  lightText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  outlineText: {
    color: theme.colors.primary,
    fontWeight: '900',
  }
});
