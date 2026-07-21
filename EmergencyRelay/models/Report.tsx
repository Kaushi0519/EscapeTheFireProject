import React from "react";
import { View, Text, StyleSheet } from "react-native";
 

export default function Report ({location, staff, type}: {location: string, staff: string, type: string}) {

    return (
    <View style={styles.container}>
        <Text style={styles.title}>Emergency Report</Text>
        <Text style={styles.text}>Location: {location}</Text>
        <Text style={styles.text}>Staff Involved: {staff}</Text>
        <Text style={styles.text}>Type: {type}</Text>
    </View>

    );
}

export function ReportBox({ location, staff, type }: { location: string; staff: string; type: string }) {
    return (
        <View style={styles.boxContainer}>
            <Text style={styles.boxTitle}>Emergency Report</Text>
            <Text style={styles.boxText}>Location: {location}</Text>
            <Text style={styles.boxText}>Staff Involved: {staff}</Text>
            <Text style={styles.boxText}>Type: {type}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: "#fff",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 5,
    },
    text: {
        fontSize: 16,
        marginBottom: 10,
    },
    boxContainer: {
        width: '90%',
        padding: 12,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        borderColor: '#ff6b6b',
        borderWidth: 2,
        marginVertical: 8,
    },
    boxTitle: {
        fontSize: 14,
        fontWeight: "bold",
        marginBottom: 8,
        color: '#ff6b6b',
    },
    boxText: {
        fontSize: 13,
        marginBottom: 6,
        color: '#333',
    }
});