import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';

interface TextFieldProps extends TextInputProps {
    label?: string;
    rightAccessory?: React.ReactNode;
}

export default function TextField({ label, rightAccessory, style, ...rest }: TextFieldProps) {
    return (
        <View style={styles.wrapper}>
            {label ? <Text style={styles.label}>{label}</Text> : null}
            <View style={styles.inputRow}>
                <TextInput
                    style={[styles.input, style]}
                    placeholderTextColor="#9E9E9E"
                    {...rest}
                />
                {rightAccessory}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: 12,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 6,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.secondarySoft,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    input: {
        flex: 1,
        height: 46,
        paddingHorizontal: 14,
        fontSize: 15,
        color: COLORS.textPrimary,
    },
});
