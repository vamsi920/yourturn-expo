import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/hoooks/useAuth'; // Assuming you use AuthContext
import { useNavigation } from 'expo-router';

export default function LoadingScreen() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const navigation = useNavigation();

    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading) return; // If still loading, do nothing

            // Navigate to the next page based on user presence
            if (user) {
                router.replace('/home');
            } else {
                router.replace('/auth/SignInScreen');
            }
        }, 1500); // 1.5 seconds delay

        return () => clearTimeout(timer); // Cleanup the timer
    }, [router, user, loading]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#007bff" />
            <Text style={styles.title}>Your Turn</Text>
            <Text style={styles.subtitle}>Loading...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff', // White background
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333', // Dark gray for the title
        marginTop: 20,
    },
    subtitle: {
        fontSize: 18,
        color: '#777', // Lighter gray for "Loading..."
        marginTop: 10,
    },
});
