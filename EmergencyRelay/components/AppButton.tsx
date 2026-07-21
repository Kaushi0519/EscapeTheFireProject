import React from 'react';
import { Pressable, Text, StyleSheet, Platform, ActivityIndicator, View } from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'outline';
type Size = 'default' | 'small';

interface AppButtonProps {
    title: string;
    onPress: () => void;
    variant?: Variant;
    size?: Size;
    disabled?: boolean;
    loading?: boolean;
    style?: any;
}

const VARIANT_STYLES: Record<Variant, { bg: string; text: string; border?: string }> = {
    primary: { bg: COLORS.primary, text: COLORS.textOnColor },
    secondary: { bg: COLORS.secondarySoft, text: COLORS.textPrimary },
    danger: { bg: COLORS.danger, text: COLORS.textOnColor },
    outline: { bg: 'transparent', text: COLORS.primary, border: COLORS.primary },
};

export default function AppButton({ title, onPress, variant = 'primary', size = 'default', disabled = false, loading = false, style }: AppButtonProps) {
    const v = VARIANT_STYLES[variant];
    const isSmall = size === 'small';
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled || loading}
            style={({ pressed }) => [
                styles.button,
                isSmall && styles.buttonSmall,
                { backgroundColor: v.bg, borderColor: v.border || 'transparent', borderWidth: v.border ? 1.5 : 0 },
                (disabled || loading) && styles.disabled,
                pressed && !disabled && !loading && styles.pressed,
                Platform.OS === 'web' && ({ cursor: disabled || loading ? 'default' : 'pointer' } as any),
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator size="small" color={v.text} />
            ) : (
                <Text style={[styles.text, isSmall && styles.textSmall, { color: v.text }]}>{title}</Text>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        borderRadius: RADIUS.sm,
        paddingVertical: 12,
        paddingHorizontal: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonSmall: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: RADIUS.sm - 2,
    },
    pressed: {
        opacity: 0.8,
    },
    disabled: {
        opacity: 0.5,
    },
    text: {
        fontSize: 15,
        fontWeight: '700',
    },
    textSmall: {
        fontSize: 13,
        fontWeight: '600',
    },
});
