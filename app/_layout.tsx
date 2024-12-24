import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { Text, View } from 'react-native';


const Footer = () => (
  <View>
    <Text>Footer</Text>
  </View>
);

export default function Layout() {
  return (
    <AuthProvider>
      <View style={{
        height: 44,
        backgroundColor: 'lightblue',
      }} />
      
      <Stack screenOptions={{ headerShown: false }}/>
      {/* <Footer /> */}
    </AuthProvider>
  );
}