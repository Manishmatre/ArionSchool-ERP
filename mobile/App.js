import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import UpdatePromptModal from './src/components/UpdatePromptModal';
import { initNotifications } from './src/services/notificationService';

export default function App() {
  useEffect(() => {
    initNotifications().catch((e) => console.log('Notification init notice:', e?.message));
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <AppNavigator />
          <UpdatePromptModal />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
