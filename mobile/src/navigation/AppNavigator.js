import React from 'react';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/theme';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/auth/LoginScreen';
import StudentTabNavigator from './StudentTabNavigator';
import CourseLearnScreen from '../screens/courses/CourseLearnScreen';
import OnlineClassesScreen from '../screens/live/OnlineClassesScreen';
import StudentReviewsScreen from '../screens/reviews/StudentReviewsScreen';
import NoticesScreen from '../screens/notices/NoticesScreen';

// Dedicated Record Screens
import IdCardScreen from '../screens/records/IdCardScreen';
import AttendanceScreen from '../screens/records/AttendanceScreen';
import FeesScreen from '../screens/records/FeesScreen';
import CertificatesScreen from '../screens/records/CertificatesScreen';
import MarksheetsScreen from '../screens/records/MarksheetsScreen';
import ScanPunchScreen from '../screens/attendance/ScanPunchScreen';
import OnlineExamsScreen from '../screens/exams/OnlineExamsScreen';
import TakeTestScreen from '../screens/exams/TakeTestScreen';
import HomeworkScreen from '../screens/records/HomeworkScreen';
import TimetableScreen from '../screens/records/TimetableScreen';
import BusTrackScreen from '../screens/records/BusTrackScreen';
import EventsCalendarScreen from '../screens/records/EventsCalendarScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('MainApp');
              }
            }}
            style={{ marginRight: 14, padding: 4 }}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
        ),
      })}
    >
      {!token ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="MainApp"
            component={StudentTabNavigator}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="CourseLearn"
            component={CourseLearnScreen}
            options={({ route }) => ({
              title: route.params?.course?.title || 'Course Player',
            })}
          />

          <Stack.Screen
            name="OnlineClasses"
            component={OnlineClassesScreen}
            options={{
              title: 'Live Lectures',
            }}
          />

          <Stack.Screen
            name="StudentReviews"
            component={StudentReviewsScreen}
            options={{
              title: 'Review & Feedback',
            }}
          />

          <Stack.Screen
            name="Notices"
            component={NoticesScreen}
            options={{
              title: 'Notice Board',
            }}
          />

          <Stack.Screen
            name="ScanPunch"
            component={ScanPunchScreen}
            options={{
              title: 'QR Attendance',
            }}
          />

          <Stack.Screen
            name="TakeTest"
            component={TakeTestScreen}
            options={{
              title: 'Practice Tests (Take Test)',
            }}
          />

          <Stack.Screen
            name="OnlineExams"
            component={OnlineExamsScreen}
            options={{
              title: 'Official Online Exams',
            }}
          />

          {/* Separate Individual Record Screens */}
          <Stack.Screen
            name="IdCard"
            component={IdCardScreen}
            options={{
              title: 'Digital ID Card',
            }}
          />

          <Stack.Screen
            name="Attendance"
            component={AttendanceScreen}
            options={{
              title: 'Attendance Register',
            }}
          />

          <Stack.Screen
            name="Fees"
            component={FeesScreen}
            options={{
              title: 'Fee Receipts & Dues',
            }}
          />

          <Stack.Screen
            name="Certificates"
            component={CertificatesScreen}
            options={{
              title: 'Issued Certificates',
            }}
          />

          <Stack.Screen
            name="Marksheets"
            component={MarksheetsScreen}
            options={{
              title: 'Official Marksheets',
            }}
          />

          <Stack.Screen
            name="Homework"
            component={HomeworkScreen}
            options={{
              title: 'Homework & Assignments',
            }}
          />

          <Stack.Screen
            name="Timetable"
            component={TimetableScreen}
            options={{
              title: 'Class Timetable',
            }}
          />

          <Stack.Screen
            name="BusTrack"
            component={BusTrackScreen}
            options={{
              title: 'School Bus & GPS Tracker',
            }}
          />

          <Stack.Screen
            name="EventsCalendar"
            component={EventsCalendarScreen}
            options={{
              title: 'Academic & Holiday Calendar',
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
