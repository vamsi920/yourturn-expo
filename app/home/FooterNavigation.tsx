import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function FooterNavigation() {
  const router = useRouter();


return (
    <View style={styles.footerContainer}>
        <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.replace('/home/groups')}
        >
            <Text style={{ color: 'gray' }}>Groups</Text>
        </TouchableOpacity>
        <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.replace('/home/user')}
        >
            <Text style={{ color: 'gray' }}>User</Text>
        </TouchableOpacity>
    </View>
);
}

const styles = StyleSheet.create({
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  navItem: {
    alignItems: 'center',
  },
});