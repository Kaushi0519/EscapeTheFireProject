import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, CARD_SHADOW } from '../constants/theme';

interface CardProps {
    title?: string;
    caption?: string;
    children: React.ReactNode;
    style?: any;
}

export default function Card({ title, caption, children, style }: CardProps) {
    return (
        <View style={[styles.card, style]}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {caption ? <Text style={styles.caption}>{caption}</Text> : null}
            {(title || caption) ? <View style={styles.divider} /> : null}
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: 18,
        marginBottom: 16,
        ...CARD_SHADOW,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    caption: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 12,
    },
});
