import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Initialize Push & Local Notification Channels and Permissions
 */
export async function initNotifications() {
  if (!Device.isDevice) {
    console.log('[NotificationService] Running on simulator/emulator — notifications active in local mode.');
  }

  // 1. Android Notification Channels (Mandatory on Android 8.0+)
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1e3a8a',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
      });

      await Notifications.setNotificationChannelAsync('attendance', {
        name: 'Attendance & QR Punch Alerts',
        description: 'Instant verification alerts when student scans attendance QR',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 150, 100, 200],
        lightColor: '#10b981',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
      });

      await Notifications.setNotificationChannelAsync('academic', {
        name: 'Academics, Notices & Exams',
        description: 'Updates on class schedules, tests and school notices',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 150, 200],
        lightColor: '#2563eb',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
      });
    } catch (channelErr) {
      console.warn('[NotificationService] Error creating notification channels:', channelErr?.message);
    }
  }

  // 2. Request Notification Permission
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[NotificationService] Notification permissions not granted by user.');
      return null;
    }

    // 3. Obtain Expo Push Token for remote triggers
    try {
      const pushTokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
      if (pushTokenData && pushTokenData.data) {
        return pushTokenData.data;
      }
    } catch (tokenErr) {
      // Remote push token might fail in bare without projectId, fallback gracefully
      console.log('[NotificationService] Local notification channels initialized.');
    }
  } catch (err) {
    console.warn('[NotificationService] Init error:', err?.message);
  }

  return null;
}

/**
 * Trigger an immediate high-priority local phone alert
 */
export async function sendLocalAlert({ title, body, data = {}, channelId = 'default' }) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title || 'SES Educare Alert',
        body: body || '',
        data,
        sound: 'default',
        badge: 1,
        color: '#1e3a8a',
      },
      trigger: null, // null means trigger immediately
    });
  } catch (err) {
    console.warn('[NotificationService] Failed to trigger notification:', err?.message);
  }
}

/**
 * Trigger instantaneous Attendance Verification phone notification
 */
export async function notifyAttendanceMarked({ studentName, checkInTime, centerName }) {
  const timeStr = checkInTime
    ? new Date(checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Recorded Just Now';

  await sendLocalAlert({
    title: 'Attendance Verified! Marked PRESENT ✅',
    body: `${studentName || 'Student'}, your attendance has been recorded at ${centerName || 'SES Educare Study Center'} (${timeStr}).`,
    data: { type: 'attendance_punch', timestamp: new Date().toISOString() },
    channelId: 'attendance',
  });
}

/**
 * Trigger school notice phone notification
 */
export async function notifyInstituteNotice({ title, message, noticeId }) {
  await sendLocalAlert({
    title: `📢 ${title || 'School Notice'}`,
    body: message || 'You have a new announcement from The Vits School administration.',
    data: { type: 'school_notice', noticeId },
    channelId: 'academic',
  });
}

