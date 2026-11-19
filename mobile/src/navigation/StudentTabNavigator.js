import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../config/theme';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import MyCoursesScreen from '../screens/courses/MyCoursesScreen';
import ScanPunchScreen from '../screens/attendance/ScanPunchScreen';
import IdCardScreen from '../screens/records/IdCardScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function StudentTabNavigator() {
  const insets = useSafeAreaInsets();
  // Safe clearance above Android 3-button navigation bar / iOS home indicator
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 28);
  const tabHeight = 60 + bottomInset;

  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'CoursesTab') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'ScanPunchTab') {
            iconName = focused ? 'qr-code' : 'qr-code-outline';
          } else if (route.name === 'IdCardTab') {
            iconName = focused ? 'card' : 'card-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={route.name === 'ScanPunchTab' ? 24 : 22} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomInset,
          paddingTop: 8,
          elevation: 10,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
        },
        tabBarLabelStyle: styles.tabBarLabel,
        headerStyle: {
          backgroundColor: colors.primary,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
        headerLeft: () => {
          if (route.name === 'HomeTab') return null;
          return (
            <TouchableOpacity
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('HomeTab');
                }
              }}
              style={{ marginLeft: 16, padding: 4 }}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
          );
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={DashboardScreen}
        options={{
          headerShown: false,
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="CoursesTab"
        component={MyCoursesScreen}
        options={{
          title: 'My Classes & Subjects',
          tabBarLabel: 'Classes',
        }}
      />
      <Tab.Screen
        name="ScanPunchTab"
        component={ScanPunchScreen}
        options={{
          title: 'QR Attendance',
          tabBarLabel: 'QR Punch',
        }}
      />
      <Tab.Screen
        name="IdCardTab"
        component={IdCardScreen}
        options={{
          title: 'Digital ID Card',
          tabBarLabel: 'ID Card',
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'My Profile',
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
