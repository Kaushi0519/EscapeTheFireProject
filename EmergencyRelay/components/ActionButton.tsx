import React from 'react';
import { Pressable, Text, View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Variant = 'primary' | 'secondary' | 'danger';

interface ActionButtonProps {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    variant?: Variant;
}

const VARIANT_COLORS: Record<Variant, { bg: string; iconBg: string; text: string; icon: string }> = {
    primary: { bg: '#EAF2FE', iconBg: '#1976D2', text: '#0D3C74', icon: '#FFFFFF' },
    secondary: { bg: '#F5F5F7', iconBg: '#546E7A', text: '#37474F', icon: '#FFFFFF' },
    danger: { bg: '#FDECEC', iconBg: '#D32F2F', text: '#7A1212', icon: '#FFFFFF' },
};

export default function ActionButton({ title, icon, onPress, variant = 'primary' }: ActionButtonProps) {
    const colors = VARIANT_COLORS[variant];
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.bg },
                pressed && styles.buttonPressed,
                Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
            ]}
        >
            <View style={[styles.iconBadge, { backgroundColor: colors.iconBg }]}>
                <Ionicons name={icon} size={18} color={colors.icon} />
            </View>
            <Text style={[styles.label, { color: colors.text }]}>{title}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text} style={{ opacity: 0.5 }} />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginBottom: 10,
    },
    buttonPressed: {
        opacity: 0.7,
    },
    iconBadge: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    label: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
    },
});
