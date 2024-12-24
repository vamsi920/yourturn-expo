import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import FooterNavigation from './FooterNavigation'; // Import your custom footer navigation component
import { useAuth } from '../../src/hoooks/useAuth';
import { auth } from '../../src/lib/firebase';
import { useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/Ionicons';

const Header = ({ style }: { style?: object }) => {
    const { user } = useAuth();
    const router = useRouter();

    const handleSignOut = () => {
        auth.signOut().then(() => {
            router.replace('/auth/SignInScreen');
        }).catch((error) => {
            console.error('Sign out error', error);
        });
    };

    return (
        <View style={[styles.header, style]}>
            <Text>Header</Text>
            <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton}>
                <Icon name="log-out-outline" size={24} color="black" />
            </TouchableOpacity>
        </View>
    );
};

export default function HomeLayout() {
    return (
        <View style={styles.container}>
            {/* Render nested routes */}
            <Header style={{
                padding: 10,
                backgroundColor: 'lightblue',
            }}/>
            <View style={styles.content}>
                <Stack 
                        screenOptions={{ headerShown: false }}
                />
            </View>
            {/* Shared Footer Navigation */}
            <FooterNavigation />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    logoutButton: {
        padding: 10,
    },
});