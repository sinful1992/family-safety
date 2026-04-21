/**
 * Nightwatch Theme — Family Safety App
 * Dark base with emerald green safety accents
 */

export const COLORS = {
  background: {
    primary: '#0D1117',
    secondary: '#161B22',
    tertiary: '#21262D',
  },

  glass: {
    subtle: 'rgba(255, 255, 255, 0.03)',
    medium: 'rgba(255, 255, 255, 0.05)',
    elevated: 'rgba(255, 255, 255, 0.08)',
    strong: 'rgba(255, 255, 255, 0.12)',
  },

  accent: {
    green: '#00D9A0',
    greenLight: 'rgba(0, 217, 160, 0.8)',
    greenDim: 'rgba(0, 217, 160, 0.3)',
    greenSubtle: 'rgba(0, 217, 160, 0.12)',
    amber: '#FFB340',
    amberDim: 'rgba(255, 179, 64, 0.3)',
    amberSubtle: 'rgba(255, 179, 64, 0.12)',
    red: '#FF453A',
    redDim: 'rgba(255, 69, 58, 0.3)',
    redSubtle: 'rgba(255, 69, 58, 0.12)',
    blue: '#58A6FF',
    blueDim: 'rgba(88, 166, 255, 0.3)',
  },

  status: {
    okay: '#00D9A0',
    okayDim: 'rgba(0, 217, 160, 0.3)',
    pending: '#FFB340',
    pendingDim: 'rgba(255, 179, 64, 0.3)',
    needHelp: '#FF453A',
    needHelpDim: 'rgba(255, 69, 58, 0.3)',
    unknown: 'rgba(255, 255, 255, 0.2)',
  },

  text: {
    primary: '#F0F6FC',
    secondary: 'rgba(240, 246, 252, 0.7)',
    tertiary: 'rgba(240, 246, 252, 0.4)',
    dim: 'rgba(240, 246, 252, 0.2)',
  },

  border: {
    subtle: 'rgba(255, 255, 255, 0.05)',
    medium: 'rgba(255, 255, 255, 0.08)',
    strong: 'rgba(255, 255, 255, 0.12)',
  },

  overlay: {
    dark: 'rgba(0, 0, 0, 0.6)',
    darker: 'rgba(0, 0, 0, 0.75)',
    darkest: 'rgba(0, 0, 0, 0.88)',
  },

  gradient: {
    buttonStart: '#00D9A0',
    buttonEnd: '#00A87A',
    dangerStart: '#FF453A',
    dangerEnd: '#C0392B',
  },
} as const;

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  green: {
    shadowColor: '#00D9A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 5,
  },
  red: {
    shadowColor: '#FF453A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 5,
  },
  amber: {
    shadowColor: '#FFB340',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
} as const;

export const RADIUS = {
  small: 8,
  medium: 12,
  large: 14,
  xlarge: 16,
  xxlarge: 20,
  modal: 24,
  pill: 50,
  circle: 999,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const TYPOGRAPHY = {
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
    display: 32,
    huge: 42,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    black: '900' as const,
  },
} as const;

export const COMMON_STYLES = {
  glassCard: {
    backgroundColor: COLORS.glass.subtle,
    borderRadius: RADIUS.xlarge,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  glassCardElevated: {
    backgroundColor: COLORS.glass.elevated,
    borderRadius: RADIUS.xlarge,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  input: {
    backgroundColor: COLORS.glass.subtle,
    borderWidth: 1.5,
    borderColor: COLORS.border.medium,
    borderRadius: RADIUS.large,
    color: COLORS.text.primary,
    padding: 14,
    fontSize: TYPOGRAPHY.fontSize.lg,
  },

  modal: {
    backgroundColor: COLORS.background.secondary,
    borderTopLeftRadius: RADIUS.modal,
    borderTopRightRadius: RADIUS.modal,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 16,
  },

  label: {
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.2,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.sm,
  },
};

export const ANIMATION = {
  fast: 200,
  normal: 300,
  slow: 500,
  pulse: 1400,
} as const;

export default {
  COLORS,
  SHADOWS,
  RADIUS,
  SPACING,
  TYPOGRAPHY,
  COMMON_STYLES,
  ANIMATION,
};
