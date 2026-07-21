// Shared design tokens for the modernized UI. Keeping these in one place means every
// screen's cards/buttons/text pick up the same palette instead of hardcoding hex values.
export const COLORS = {
    background: '#F5F7FA',
    surface: '#FFFFFF',
    border: '#EEEEEE',
    primary: '#1976D2',
    primaryDark: '#0D3C74',
    primarySoft: '#EAF2FE',
    secondary: '#546E7A',
    secondarySoft: '#F5F5F7',
    danger: '#D32F2F',
    dangerSoft: '#FDECEC',
    dangerDark: '#7A1212',
    success: '#4CAF50',
    warning: '#FFC107',
    textPrimary: '#1A1A1A',
    textSecondary: '#757575',
    textOnColor: '#FFFFFF',
};

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
};

export const RADIUS = {
    sm: 8,
    md: 12,
    lg: 16,
};

export const CARD_SHADOW = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
};
