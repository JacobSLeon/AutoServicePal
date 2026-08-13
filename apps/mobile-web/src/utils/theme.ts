export const darkTheme = {
  colors: {
    background: '#121212',
    card: '#1E1E1E',
    primary: '#E53935', // Vibrant crimson accent
    primaryLight: '#FF6B6B',
    secondary: '#00E676', // Green for verified ticks/success
    text: '#FFFFFF',
    textSecondary: '#AAAAAA',
    border: '#333333',
    error: '#CF6679',
    glass: 'rgba(255, 255, 255, 0.05)',
    plateYellow: '#FCD729', // UK Reg Plate Yellow
    plateText: '#111111'
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
    xl: 24,
    pill: 9999
  },
  typography: {
    h1: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF' } as const,
    h2: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' } as const,
    h3: { fontSize: 20, fontWeight: '600', color: '#FFFFFF' } as const,
    body: { fontSize: 16, color: '#FFFFFF' } as const,
    bodySecondary: { fontSize: 14, color: '#AAAAAA' } as const,
    caption: { fontSize: 12, color: '#AAAAAA' } as const,
    plate: { fontSize: 28, fontWeight: 'bold', color: '#111111', letterSpacing: 2 } as const
  },
  shadows: {
    glass: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 5,
    },
    subtle: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    }
  }
};

export const lightTheme = {
  colors: {
    ...darkTheme.colors,
    background: '#F0F0F0',
    card: '#FFFFFF',
    text: '#121212',
    textSecondary: '#666666',
    border: '#DDDDDD',
    glass: 'rgba(0, 0, 0, 0.05)',
  },
  spacing: darkTheme.spacing,
  borderRadius: darkTheme.borderRadius,
  typography: {
    ...darkTheme.typography,
    h1: { ...darkTheme.typography.h1, color: '#121212' },
    h2: { ...darkTheme.typography.h2, color: '#121212' },
    h3: { ...darkTheme.typography.h3, color: '#121212' },
    body: { ...darkTheme.typography.body, color: '#121212' },
    bodySecondary: { ...darkTheme.typography.bodySecondary, color: '#666666' },
    caption: { ...darkTheme.typography.caption, color: '#666666' },
  },
  shadows: darkTheme.shadows
};

export const theme = darkTheme; // Default for MVP
