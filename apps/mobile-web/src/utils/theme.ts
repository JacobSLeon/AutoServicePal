export const theme = {
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
