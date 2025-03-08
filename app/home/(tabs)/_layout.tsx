import { StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import React from 'react';

const TabsLayout = () => {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 60, // Increase height for better spacing
        },
        tabBarLabelStyle: {
          fontSize: 12, // Reduce font size to fit better
        },
      }}
    >
      <Tabs.Screen name="groups/index" options={{ tabBarLabel: 'Groups' }} />
      <Tabs.Screen name="index" options={{ tabBarLabel: 'Home' }} />
      <Tabs.Screen name="user/index" options={{ tabBarLabel: 'User' }} />
    </Tabs>
  );
};

export default TabsLayout;

const styles = StyleSheet.create({});