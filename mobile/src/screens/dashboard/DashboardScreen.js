import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Platform,
  Animated
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, shadows } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import api, { getHostUrl } from '../../config/api';
import { formatTime } from '../../utils/format';

const DAILY_TIPS = [
  'Consistency beats intensity: 30 minutes of daily study and practice builds lifelong mastery.',
  'Solve MCQs right after completing a lesson to double your exam retention score.',
  'Make sure your digital ID card is synced before attending school examinations.',
  'Complete daily homework on time to keep your continuous comprehensive evaluation score high.',
  'Review yesterday’s lecture notes for 5 minutes every morning to stay ahead.',
];

export default function DashboardScreen({ navigation }) {
  const { user, student, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [onlineClasses, setOnlineClasses] = useState([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [attendanceRate, setAttendanceRate] = useState(100);
  const [todayPunch, setTodayPunch] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Random daily tip based on day of month
  const tipOfTheDay = DAILY_TIPS[new Date().getDate() % DAILY_TIPS.length];

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const qrPulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    const qrPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(qrPulseAnim, {
          toValue: 1.08,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(qrPulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    qrPulse.start();

    return () => {
      pulse.stop();
      qrPulse.stop();
    };
  }, [fadeAnim, slideAnim, pulseAnim, qrPulseAnim]);

  const getProfileImage = () => {
    const photo = user?.profilePicture || student?.personalInfo?.photo;
    if (!photo) return null;
    return photo.startsWith('http') ? photo : `${getHostUrl()}${photo.startsWith('/') ? '' : '/'}${photo}`;
  };

  const photoUri = getProfileImage();
  const studentId = student?._id || user?.studentDetails?._id || user?.studentProfile?._id || user?.id;

  const loadData = useCallback(async () => {
    try {
      // 1. Fetch Student Dashboard Stats
      if (studentId) {
        try {
          const res = await api.get(`/students/${studentId}/dashboard`);
          if (res.data && res.data.success) {
            setDashboardData(res.data.data);
          }
        } catch (dashErr) {
          console.warn('Dashboard endpoint error:', dashErr?.message);
        }

        // Attendance Rate
        try {
          const attRes = await api.get(`/attendance/student/${studentId}`);
          if (attRes.data && attRes.data.success) {
            const raw = attRes.data.data || attRes.data.attendance || [];
            if (raw && raw.statistics && raw.statistics.percentage != null) {
              setAttendanceRate(Math.round(Number(raw.statistics.percentage)));
            } else if (Array.isArray(raw) && raw.length > 0) {
              const present = raw.filter((r) => r?.status === 'present').length;
              setAttendanceRate(Math.round((present / raw.length) * 100));
            }
          }
        } catch (attErr) {
          console.warn('Attendance load error:', attErr?.message);
        }
      }

      // 2. Fetch Enrolled Courses
      try {
        const coursesRes = await api.get('/courses/my/enrolled');
        if (coursesRes.data && coursesRes.data.success) {
          const rawCourses = Array.isArray(coursesRes.data.data)
            ? coursesRes.data.data
            : Array.isArray(coursesRes.data.courses)
            ? coursesRes.data.courses
            : [];
          const list = rawCourses
            .map((item) => {
              if (item && item.course && typeof item.course === 'object') {
                return {
                  ...item.course,
                  enrollmentId: item._id,
                  enrolledAt: item.enrolledAt,
                  progressPercentage: item.progress || 0,
                };
              }
              return item;
            })
            .filter(Boolean);
          setEnrolledCourses(list);
        }
      } catch (courseErr) {
        console.warn('Enrolled courses fetch error:', courseErr?.message);
      }

      // 3. Fetch Online Classes
      try {
        const classesRes = await api.get('/online-classes/my');
        if (classesRes.data && classesRes.data.success) {
          const rawClasses = Array.isArray(classesRes.data.data)
            ? classesRes.data.data
            : Array.isArray(classesRes.data.classes)
            ? classesRes.data.classes
            : [];
          setOnlineClasses(rawClasses);
        }
      } catch (classErr) {
        console.warn('Online classes fetch error:', classErr?.message);
      }

      // 4. Fetch Unread Notices Count
      try {
        const notifRes = await api.get('/notifications/unread/count');
        if (notifRes.data && notifRes.data.success) {
          setUnreadNotifs(notifRes.data.count || notifRes.data.unreadCount || 0);
        }
      } catch {}

      // 5. Fetch Today's Attendance Punch Status
      try {
        const punchRes = await api.get('/attendance/today');
        if (punchRes.data?.success && (punchRes.data.punched || punchRes.data.attendance)) {
          setTodayPunch({
            punched: true,
            status: 'present',
            checkInTime: punchRes.data.checkInTime || punchRes.data.attendance?.checkInTime || punchRes.data.attendance?.date,
            attendance: punchRes.data.attendance,
            franchise: punchRes.data.franchiseName || punchRes.data.attendance?.franchise?.name || 'SES Educare School Campus'
          });
        } else {
          // Fallback check from student records for today
          if (studentId) {
            try {
              const recRes = await api.get(`/attendance/student/${studentId}`);
              if (recRes.data?.success) {
                const raw = recRes.data.data;
                const list = Array.isArray(raw) ? raw : Array.isArray(raw?.records) ? raw.records : [];
                const now = new Date();
                const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const found = list.find((item) => {
                  if (!item) return false;
                  const itemDateStr = item.date ? String(item.date).slice(0, 10) : '';
                  const itemCreatedStr = item.createdAt ? String(item.createdAt).slice(0, 10) : '';
                  return (itemDateStr === todayStr || itemCreatedStr === todayStr) && item.status === 'present';
                });
                if (found) {
                  setTodayPunch({
                    punched: true,
                    status: 'present',
                    checkInTime: found.checkInTime || found.date || found.createdAt,
                    attendance: found,
                    franchise: found.franchise?.name || 'SES Educare School Campus'
                  });
                } else {
                  setTodayPunch(null);
                }
              }
            } catch {
              setTodayPunch(null);
            }
          } else {
            setTodayPunch(null);
          }
        }
      } catch {
        setTodayPunch(null);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Re-check attendance whenever student returns to dashboard
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      (async () => {
        try {
          const punchRes = await api.get('/attendance/today');
          if (!isMounted) return;
          if (punchRes.data?.success && (punchRes.data.punched || punchRes.data.attendance)) {
            setTodayPunch({
              punched: true,
              status: 'present',
              checkInTime: punchRes.data.checkInTime || punchRes.data.attendance?.checkInTime || punchRes.data.attendance?.date,
              attendance: punchRes.data.attendance,
              franchise: punchRes.data.franchiseName || punchRes.data.attendance?.franchise?.name || 'SES Educare School Campus'
            });
          }
        } catch {}
      })();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshProfile();
    await loadData();
  }, [loadData, refreshProfile]);

  const progressSummary = dashboardData?.progress || {};
  const latestCourse = enrolledCourses[0] || null;

  const quickActions = [
    {
      title: 'Homework',
      category: 'learning',
      icon: 'document-text',
      color: '#0284c7',
      bgColor: '#f0f9ff',
      tag: 'Daily',
      onPress: () => navigation.navigate('Homework'),
    },
    {
      title: 'Timetable',
      category: 'learning',
      icon: 'time',
      color: '#4f46e5',
      bgColor: '#eef2ff',
      tag: 'Schedule',
      onPress: () => navigation.navigate('Timetable'),
    },
    {
      title: 'School Bus',
      category: 'campus',
      icon: 'bus',
      color: '#10b981',
      bgColor: '#ecfdf5',
      tag: 'Live GPS',
      onPress: () => navigation.navigate('BusTrack'),
    },
    {
      title: 'Calendar',
      category: 'campus',
      icon: 'today',
      color: '#d97706',
      bgColor: '#fffbeb',
      tag: 'Events',
      onPress: () => navigation.navigate('EventsCalendar'),
    },
    {
      title: 'My Classes',
      category: 'learning',
      icon: 'book',
      color: '#2563eb',
      bgColor: '#eff6ff',
      tag: `${enrolledCourses.length}`,
      onPress: () => navigation.navigate('CoursesTab'),
    },
    {
      title: 'QR Punch',
      category: 'learning',
      icon: 'qr-code',
      color: '#0284c7',
      bgColor: '#f0f9ff',
      tag: 'Daily',
      onPress: () => navigation.navigate('ScanPunchTab'),
    },
    {
      title: 'Digital ID',
      category: 'credentials',
      icon: 'card',
      color: '#7c3aed',
      bgColor: '#f5f3ff',
      tag: 'Verified',
      onPress: () => navigation.navigate('IdCard'),
    },
    {
      title: 'Attendance',
      category: 'learning',
      icon: 'calendar',
      color: '#0891b2',
      bgColor: '#ecfeff',
      tag: `${attendanceRate}%`,
      onPress: () => navigation.navigate('Attendance'),
    },
    {
      title: 'Online Exams',
      category: 'assessments',
      icon: 'school',
      color: '#9333ea',
      bgColor: '#faf5ff',
      tag: 'CCE',
      onPress: () => navigation.navigate('OnlineExams'),
    },
    {
      title: 'Take Test',
      category: 'assessments',
      icon: 'create',
      color: '#4f46e5',
      bgColor: '#eef2ff',
      tag: 'MCQs',
      onPress: () => navigation.navigate('TakeTest'),
    },
    {
      title: 'Live Classes',
      category: 'learning',
      icon: 'videocam',
      color: '#d97706',
      bgColor: '#fffbeb',
      tag: onlineClasses.length > 0 ? `${onlineClasses.length} Live` : null,
      onPress: () => navigation.navigate('OnlineClasses'),
    },
    {
      title: 'Fee Status',
      category: 'credentials',
      icon: 'cash',
      color: '#0d9488',
      bgColor: '#f0fdfa',
      onPress: () => navigation.navigate('Fees'),
    },
    {
      title: 'Certificates',
      category: 'credentials',
      icon: 'ribbon',
      color: '#db2777',
      bgColor: '#fdf2f8',
      onPress: () => navigation.navigate('Certificates'),
    },
    {
      title: 'Marksheets',
      category: 'credentials',
      icon: 'document-text',
      color: '#0284c7',
      bgColor: '#f0f9ff',
      onPress: () => navigation.navigate('Marksheets'),
    },
    {
      title: 'Feedback',
      category: 'learning',
      icon: 'star',
      color: '#ca8a04',
      bgColor: '#fefce8',
      onPress: () => navigation.navigate('StudentReviews'),
    },
  ];

  const filteredActions =
    selectedCategory === 'all'
      ? quickActions
      : quickActions.filter((a) => a.category === selectedCategory);

  const studentDisplayId =
    student?.studentId ||
    (student?._id
      ? `SES-${String(student._id).slice(-6).toUpperCase()}`
      : user?.id
      ? `SES-${String(user.id).slice(-6).toUpperCase()}`
      : 'SES-STUDENT');

  const enrollmentDisplay =
    student?.enrollmentNumber ||
    student?.enrollmentNo ||
    student?.academicInfo?.enrollmentNumber ||
    student?.academicInfo?.enrollmentNo ||
    user?.studentDetails?.enrollmentNumber ||
    user?.studentDetails?.enrollmentNo;

  const isTodayPunched = Boolean(todayPunch?.punched || todayPunch?.status === 'present');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Animated Welcome Banner */}
      <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient colors={['#1e3a8a', '#1e40af']} style={styles.banner}>
          <View style={styles.bannerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greetingText}>
                {new Date().getHours() < 12 ? 'Good morning ☀️' : new Date().getHours() < 17 ? 'Good afternoon 🌤️' : 'Good evening 🌙'}
              </Text>
              <Text style={styles.studentName} numberOfLines={1}>
                {user?.name || student?.personalInfo?.name || 'Student'}
              </Text>
              <View style={styles.idChipRow}>
                <View style={styles.idChip}>
                  <Ionicons name="card-outline" size={11} color="#bfdbfe" />
                  <Text style={styles.idChipText}>ID: {studentDisplayId}</Text>
                </View>
                {enrollmentDisplay ? (
                  <View style={styles.idChip}>
                    <Ionicons name="school-outline" size={11} color="#bfdbfe" />
                    <Text style={styles.idChipText}>Enr: {enrollmentDisplay}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {/* Notice Bell */}
              <TouchableOpacity
                style={styles.bellBtn}
                onPress={() => navigation.navigate('Notices')}
                activeOpacity={0.8}
              >
                <Ionicons name="notifications" size={22} color="#ffffff" />
                {unreadNotifs > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>{unreadNotifs > 9 ? '9+' : unreadNotifs}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.profileBadge}
                onPress={() => navigation.navigate('ProfileTab')}
                activeOpacity={0.8}
              >
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.profileAvatarImg} />
                ) : (
                  <Ionicons name="person-circle" size={44} color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.bannerStatsRow}>
            <View style={styles.bannerStat}>
              <Text style={styles.bannerStatVal}>{progressSummary.overallProgress || 0}%</Text>
              <Text style={styles.bannerStatLabel}>Syllabus Done</Text>
            </View>
            <View style={styles.bannerStatDivider} />
            <View style={styles.bannerStat}>
              <Text style={styles.bannerStatVal}>{enrolledCourses.length}</Text>
              <Text style={styles.bannerStatLabel}>Active Courses</Text>
            </View>
            <View style={styles.bannerStatDivider} />
            <View style={styles.bannerStat}>
              <Text style={styles.bannerStatVal}>{attendanceRate}%</Text>
              <Text style={styles.bannerStatLabel}>Attendance</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Attendance Widget: Conditionally render Scan QR OR Verified Present Record */}
      <View style={styles.section}>
        {isTodayPunched ? (
          /* When Attendance is already marked: Show Scan Time & Present Verification */
          <TouchableOpacity
            style={styles.punchedVerifiedCard}
            onPress={() => navigation.navigate('Attendance')}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['#f0fdf4', '#dcfce7']}
              style={styles.punchedVerifiedGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.punchedVerifiedLeft}>
                <View style={styles.punchedVerifiedIconCircle}>
                  <Ionicons name="checkmark-done-circle" size={28} color="#16a34a" />
                </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 }}>
                    <Text style={styles.punchedVerifiedTitle} numberOfLines={2}>Today's Attendance:</Text>
                    <Text style={styles.punchedVerifiedStatus}>PRESENT</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <View style={styles.badgeSuccessPill}>
                      <Text style={styles.badgeSuccessPillText}>✓ Verified</Text>
                    </View>
                  </View>

                  <View style={styles.punchMetaRow}>
                    <Ionicons name="time" size={13} color="#15803d" />
                    <Text style={styles.punchTimeText}>
                      Scan Time: {todayPunch?.checkInTime ? formatTime(todayPunch.checkInTime) : 'Recorded Today'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.punchedActionPill}>
                <Text style={styles.punchedActionPillText}>View Register</Text>
                <Ionicons name="chevron-forward" size={13} color="#15803d" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          /* When Attendance is NOT marked: Show interactive "Scan QR to Mark Attendance" Card */
          <TouchableOpacity
            style={styles.punchActionCard}
            onPress={() => navigation.navigate('ScanPunchTab')}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['#eff6ff', '#dbeafe']}
              style={styles.punchActionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.punchActionLeft}>
                <Animated.View
                  style={[
                    styles.punchIconCircle,
                    { backgroundColor: '#2563eb', transform: [{ scale: qrPulseAnim }] },
                  ]}
                >
                  <Ionicons name="qr-code" size={24} color="#ffffff" />
                </Animated.View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.punchActionTitle}>Scan QR to Mark Attendance</Text>
                    <View style={styles.livePulseDotSmall} />
                  </View>

                  <Text style={styles.punchActionSub}>
                    Tap to open camera and scan your school attendance QR poster
                  </Text>
                </View>
              </View>

              <View style={[styles.punchActionBtnPill, { backgroundColor: '#2563eb' }]}>
                <Text style={styles.punchActionBtnText}>Scan Now</Text>
                <Ionicons name="chevron-forward" size={14} color="#ffffff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {/* Daily Motivation & Learning Byte */}
      <View style={styles.section}>
        <View style={styles.tipCard}>
          <View style={styles.tipIconWrap}>
            <Ionicons name="bulb" size={20} color="#f59e0b" />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.tipTitle}>Daily Study Tip</Text>
            <Text style={styles.tipBody}>{tipOfTheDay}</Text>
          </View>
        </View>
      </View>

      {/* Continue Learning Card */}
      {latestCourse ? (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Continue Learning</Text>
            <TouchableOpacity onPress={() => navigation.navigate('CoursesTab')}>
              <Text style={styles.seeAllText}>All courses</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.continueCard}
            onPress={() => navigation.navigate('CourseLearn', { course: latestCourse })}
            activeOpacity={0.85}
          >
            <View style={styles.continueCardContent}>
              <View style={styles.courseIconBox}>
                <Ionicons name="play" size={22} color="#ffffff" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.courseTitle} numberOfLines={1}>
                  {latestCourse.title || latestCourse.name}
                </Text>
                <Text style={styles.courseSub}>
                  {latestCourse.courseCode || latestCourse.category || 'Enrolled Course'}
                </Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressBar,
                      { width: `${Math.min(progressSummary.overallProgress || 35, 100)}%` },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.resumePill}>
                <Text style={styles.resumePillText}>Resume</Text>
                <Ionicons name="play-forward" size={12} color="#2563eb" />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Academic Services & Portal Grid with Filter Pills */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Academic Services</Text>
          <View style={styles.servicesCountBadge}>
            <Text style={styles.servicesCountText}>{quickActions.length} Modules</Text>
          </View>
        </View>

        {/* Category Filter Chips */}
        <View style={styles.categoryChipsRow}>
          {[
            { id: 'all', label: 'All' },
            { id: 'learning', label: 'Learning' },
            { id: 'campus', label: 'School & Fleet' },
            { id: 'assessments', label: 'Exams & MCQs' },
            { id: 'credentials', label: 'Credentials' },
          ].map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategory === cat.id && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat.id && styles.categoryChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.grid}>
          {filteredActions.map((action, i) => (
            <TouchableOpacity
              key={i}
              style={styles.gridItem}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.gridIconWrap, { backgroundColor: action.bgColor }]}>
                <Ionicons name={action.icon} size={24} color={action.color} />
                {action.tag && (
                  <View style={styles.gridTag}>
                    <Text style={styles.gridTagText}>{action.tag}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.gridLabel} numberOfLines={1}>
                {action.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Live Online Classes Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.sectionTitle}>Live Interactive Classes</Text>
            {onlineClasses.length > 0 && (
              <Animated.View style={[styles.livePulseDot, { transform: [{ scale: pulseAnim }] }]} />
            )}
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('OnlineClasses')}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        {onlineClasses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="videocam-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Live Classes Scheduled Right Now</Text>
            <Text style={styles.emptySub}>Upcoming instructor lectures will appear here.</Text>
          </View>
        ) : (
          onlineClasses.slice(0, 2).map((item) => (
            <View key={item._id} style={styles.classCard}>
              <View style={styles.classCardLeft}>
                <View style={styles.liveIndicator}>
                  <Ionicons name="radio" size={14} color="#ffffff" />
                  <Text style={styles.liveText}>Live</Text>
                </View>
                <Text style={styles.classTitle} numberOfLines={1}>
                  {item.topic || item.title || 'Online Lecture'}
                </Text>
                <Text style={styles.classDetails}>
                  {item.teacher || 'Faculty'} · {item.startTime ? formatTime(item.startTime) : 'Today'}
                </Text>
              </View>

              {item.meetingLink || item.joinUrl ? (
                <TouchableOpacity
                  style={styles.joinBtn}
                  onPress={() => Linking.openURL(item.meetingLink || item.joinUrl)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.joinBtnText}>Join</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  banner: {
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 56 : 46,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...shadows.md,
  },
  bannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingText: {
    fontSize: 13,
    color: '#93c5fd',
    fontWeight: '600',
  },
  studentName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  idChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  idChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  idChipText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '700',
  },
  livePulseDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  livePulseDotSmall: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  servicesCountBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  servicesCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#1e3a8a',
  },
  bellBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  profileBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  bannerStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  bannerStat: {
    alignItems: 'center',
    flex: 1,
  },
  bannerStatVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  bannerStatLabel: {
    fontSize: 11,
    color: '#bfdbfe',
    marginTop: 2,
  },
  bannerStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  section: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  seeAllText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },

  // Verified Present Card
  punchedVerifiedCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    ...shadows.sm,
  },
  punchedVerifiedGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  punchedVerifiedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  punchedVerifiedIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.xs,
  },
  punchedVerifiedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
    flexShrink: 1,
  },
  punchedVerifiedStatus: {
    fontSize: 13,
    fontWeight: '900',
    color: '#15803d',
    letterSpacing: 0.5,
  },
  badgeSuccessPill: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  badgeSuccessPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16a34a',
  },
  punchMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  punchTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
  punchedActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  punchedActionPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },

  // QR Punch Action Card
  punchActionCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...shadows.sm,
  },
  punchActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  punchActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  punchIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  punchActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  punchActionSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  punchActionBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  punchActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Daily Tip
  tipCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fef3c7',
    backgroundColor: '#fffbeb',
  },
  tipIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tipBody: {
    fontSize: 12,
    color: '#78350f',
    marginTop: 1,
    lineHeight: 16,
  },

  // Continue Card
  continueCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...shadows.sm,
  },
  continueCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  courseSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  progressTrack: {
    height: 5,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 3,
  },
  resumePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 8,
  },
  resumePillText: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '700',
  },

  // Category Chips
  categoryChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  categoryChipActive: {
    backgroundColor: '#2563eb',
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },

  // Quick Actions Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '30.5%',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    position: 'relative',
    ...shadows.sm,
  },
  gridTag: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  gridTagText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '800',
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
  },

  // Class Cards
  classCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...shadows.sm,
  },
  classCardLeft: {
    flex: 1,
    marginRight: 10,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 4,
  },
  liveText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  classTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  classDetails: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  joinBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  joinBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...shadows.sm,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'center',
  },
});
