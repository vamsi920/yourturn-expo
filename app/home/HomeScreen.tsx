import React from 'react';
import { View, Text, Button } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../src/hoooks/useAuth';
import { auth } from '../../src/lib/firebase';
import { useRouter } from 'expo-router';

const HomeScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
    const router = useRouter();
  const handleSignOut = () => {
    auth.signOut().then(() => {
    //   console.log('User signed out!');
        router.replace('/auth/SignInScreen');
    //   navigation.replace('auth/SignInScreen');
    }).catch((error) => {
      console.error('Sign out error', error);
    });
  };

  return (
    <View style={{padding:20}}>
      <Text>Welcome, {user?.email}</Text>
      <Button title="Sign Out" onPress={handleSignOut} />
    </View>
  );
}

export default HomeScreen;