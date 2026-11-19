import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, shadows } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import api, { getHostUrl } from '../../config/api';
import { formatDate } from '../../utils/format';
import { CURRENT_APP_VERSION, CURRENT_APP_BUILD } from '../../config/version';
import { checkAppUpdateManually } from '../../components/UpdatePromptModal';

export default function ProfileScreen({ navigation }) {
  const { user, student, logout, refreshProfile } = useAuth();

  // Pull to refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const handleManualCheckUpdate = () => {
    setCheckingUpdate(true);
    checkAppUpdateManually((res) => {
      setCheckingUpdate(false);
      if (!res?.hasUpdate) {
        Alert.alert(
          'App Up to Date',
          `You are using the latest version of SES Educare (v${CURRENT_APP_VERSION} #${CURRENT_APP_BUILD}). No updates required.`,
          [{ text: 'OK' }]
        );
      }
    });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
    } catch (e) {
      console.warn('Failed to refresh profile:', e?.message);
    } finally {
      setRefreshing(false);
    }
  }, [refreshProfile]);

  const getProfileImage = () => {
    const photo = user?.profilePicture || student?.personalInfo?.photo;
    if (!photo) return null;
    return photo.startsWith('http') ? photo : `${getHostUrl()}${photo.startsWith('/') ? '' : '/'}${photo}`;
  };

  const photoUri = getProfileImage();

  const studentName = user?.name || student?.personalInfo?.name || 'Student Name';
  const studentIdVal =
    student?.studentId ||
    user?.studentDetails?.studentId ||
    student?.idCardNumber ||
    (student?._id ? `SES-STU-${student._id.slice(-6).toUpperCase()}` : 'SES-STU-2026');
  const enrollmentNo =
    student?.enrollmentNumber ||
    student?.enrollmentNo ||
    student?.academicInfo?.enrollmentNumber ||
    student?.academicInfo?.enrollmentNo ||
    user?.studentDetails?.enrollmentNumber ||
    user?.studentDetails?.enrollmentNo ||
    user?.enrollmentNumber ||
    user?.enrollmentNo ||
    (studentIdVal?.startsWith('SES-STU-')
      ? studentIdVal.replace('SES-STU-', 'SES-ENR-')
      : (student?._id ? `SES-ENR-2026-${String(student._id).slice(-4).toUpperCase()}` : '—'));
  const courseTitle =
    student?.schoolClass?.name ||
    student?.course?.title ||
    student?.academicInfo?.course?.title ||
    'Class & Academic Section';
  const studyCenter =
    user?.franchise?.name ||
    student?.franchise?.name ||
    'SES Educare School Campus';
  const batchName =
    student?.batch?.name ||
    student?.academicInfo?.batch?.name ||
    'Regular Academic Batch';
  const email = user?.email || student?.personalInfo?.email || 'student@domain.com';
  const mobile = user?.mobile || student?.personalInfo?.phone || '—';
  const guardian = student?.personalInfo?.fatherName || student?.fatherName || user?.fatherName || 'Guardian / Parent';
  const rawDob =
    student?.personalInfo?.dateOfBirth ||
    student?.personalInfo?.dob ||
    student?.dateOfBirth ||
    student?.dob ||
    user?.personalInfo?.dateOfBirth ||
    user?.personalInfo?.dob ||
    user?.dateOfBirth ||
    user?.dob ||
    user?.studentDetails?.personalInfo?.dateOfBirth;
  const dob = rawDob ? formatDate(rawDob) : 'N/A';
  const gender = student?.personalInfo?.gender || user?.personalInfo?.gender || user?.gender || 'Not Specified';

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of your student account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleChangePassword = async () => {
    if (!newPassword) {
      Alert.alert('Validation Error', 'Please enter your new password.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New password and confirm password do not match.');
      return;
    }

    setChangingPass(true);
    try {
      const res = await api.put('/users/change-password', {
        newPassword,
      });

      if (res.data?.success) {
        setShowPasswordModal(false);
        setNewPassword('');
        setConfirmPassword('');
        Alert.alert('Success', 'Your password has been changed successfully.');
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to update password.');
      }
    } catch (e) {
      Alert.alert('Failed', e.response?.data?.message || 'Failed to update password. Please try again.');
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      {/* Premium Hero Profile Card */}
      <LinearGradient
        colors={['#0f172a', '#1e3a8a', '#2563eb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.avatarWrap}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person" size={44} color="#ffffff" />
              </View>
            )}
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-sharp" size={12} color="#ffffff" />
            </View>
          </View>

          <View style={styles.heroInfo}>
            <View style={styles.statusPill}>
              <View style={styles.pulseDot} />
              <Text style={styles.statusPillText}>VERIFIED STUDENT</Text>
            </View>
            <Text style={styles.heroName} numberOfLines={1}>{studentName}</Text>
            <Text style={styles.heroCourse} numberOfLines={2}>{courseTitle}</Text>
          </View>
        </View>

        {/* Identification Badges: Student ID & Enrollment ID (NO Roll Number) */}
        <View style={styles.idBadgesContainer}>
          <View style={styles.idPill}>
            <Ionicons name="finger-print-outline" size={14} color="#93c5fd" />
            <Text style={styles.idLabel}>Student ID:</Text>
            <Text style={styles.idVal}>{studentIdVal}</Text>
          </View>

          <View style={styles.idPill}>
            <Ionicons name="card-outline" size={14} color="#86efac" />
            <Text style={[styles.idLabel, { color: '#bbf7d0' }]}>Enrollment ID:</Text>
            <Text style={[styles.idVal, { color: '#ffffff' }]}>{enrollmentNo}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Security & Password Card (Prominent & Fixes Missing Change Password Option) */}
      <View style={[styles.card, styles.securityCard]}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.headerIconBox}>
            <Ionicons name="shield-checkmark" size={18} color="#2563eb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardHeaderTitle}>Account & Password Security</Text>
            <Text style={styles.cardHeaderSub}>Manage and update your login access</Text>
          </View>
        </View>

        {/* Change Password Action Button */}
        <TouchableOpacity
          style={styles.changePasswordBtn}
          onPress={() => {
            setNewPassword('');
            setConfirmPassword('');
            setShowPasswordModal(true);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.passIconWrap}>
            <Ionicons name="key" size={20} color="#2563eb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.changePassTitle}>Change Password</Text>
            <Text style={styles.changePassSub}>Set a new secure password for your portal</Text>
          </View>
          <View style={styles.actionChip}>
            <Text style={styles.actionChipText}>Update</Text>
            <Ionicons name="chevron-forward" size={14} color="#ffffff" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Academic Credentials Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.headerIconBox, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="school" size={18} color="#2563eb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardHeaderTitle}>Academic Information</Text>
            <Text style={styles.cardHeaderSub}>Authorized institutional enrollment record</Text>
          </View>
          <View style={styles.sessionBadge}>
            <Text style={styles.sessionBadgeText}>2026-2027</Text>
          </View>
        </View>

        <View style={styles.grid2Col}>
          <View style={styles.gridTile}>
            <View style={styles.gridTileHeader}>
              <Ionicons name="book-outline" size={15} color="#2563eb" />
              <Text style={styles.gridTileLabel}>Class & Program</Text>
            </View>
            <Text style={styles.gridTileVal} numberOfLines={2}>{courseTitle}</Text>
          </View>

          <View style={styles.gridTile}>
            <View style={styles.gridTileHeader}>
              <Ionicons name="business-outline" size={15} color="#7c3aed" />
              <Text style={styles.gridTileLabel}>School Campus</Text>
            </View>
            <Text style={styles.gridTileVal} numberOfLines={2}>{studyCenter}</Text>
          </View>

          <View style={styles.gridTile}>
            <View style={styles.gridTileHeader}>
              <Ionicons name="card-outline" size={15} color="#059669" />
              <Text style={styles.gridTileLabel}>Enrollment ID</Text>
            </View>
            <Text style={styles.gridTileVal}>{enrollmentNo}</Text>
          </View>

          <View style={styles.gridTile}>
            <View style={styles.gridTileHeader}>
              <Ionicons name="time-outline" size={15} color="#d97706" />
              <Text style={styles.gridTileLabel}>Section & Shift</Text>
            </View>
            <Text style={styles.gridTileVal}>{batchName}</Text>
          </View>
        </View>

        {/* Quick Link to Digital ID Card */}
        <TouchableOpacity
          style={styles.cardFooterLink}
          onPress={() => navigation.navigate('IdCard')}
          activeOpacity={0.75}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="id-card-outline" size={16} color={colors.primary} />
            <Text style={styles.cardFooterLinkText}>View Official Digital Student ID Card</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Personal & Contact Details Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.headerIconBox, { backgroundColor: '#fdf2f8' }]}>
            <Ionicons name="person" size={18} color="#db2777" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardHeaderTitle}>Personal Profile & Contact</Text>
            <Text style={styles.cardHeaderSub}>Registered student contact details</Text>
          </View>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.profileRowIcon}>
            <Ionicons name="mail-outline" size={16} color="#64748b" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileRowLabel}>Email Address</Text>
            <Text style={styles.profileRowVal}>{email}</Text>
          </View>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.profileRowIcon}>
            <Ionicons name="call-outline" size={16} color="#64748b" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileRowLabel}>Registered Mobile</Text>
            <Text style={styles.profileRowVal}>{mobile}</Text>
          </View>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.profileRowIcon}>
            <Ionicons name="people-outline" size={16} color="#64748b" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileRowLabel}>Parent / Guardian Name</Text>
            <Text style={styles.profileRowVal}>{guardian}</Text>
          </View>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.profileRowIcon}>
            <Ionicons name="calendar-outline" size={16} color="#64748b" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileRowLabel}>Date of Birth</Text>
            <Text style={styles.profileRowVal}>{dob}</Text>
          </View>
        </View>

        <View style={[styles.profileRow, { borderBottomWidth: 0 }]}>
          <View style={styles.profileRowIcon}>
            <Ionicons name="male-female-outline" size={16} color="#64748b" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileRowLabel}>Gender</Text>
            <Text style={styles.profileRowVal}>{gender}</Text>
          </View>
        </View>
      </View>

      {/* App & Server Setup Card */}
      {/* App & Platform Details Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.headerIconBox, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardHeaderTitle}>SES Educare Platform</Text>
            <Text style={styles.cardHeaderSub}>Official Student Mobile Portal</Text>
          </View>
        </View>

        <View style={styles.appVersionRow}>
          <Text style={styles.appVersionLabel}>Application Version</Text>
          <Text style={styles.appVersionVal}>v{CURRENT_APP_VERSION} (Build #{CURRENT_APP_BUILD})</Text>
        </View>

        <TouchableOpacity
          style={styles.checkUpdateBtn}
          onPress={handleManualCheckUpdate}
          disabled={checkingUpdate}
          activeOpacity={0.8}
        >
          {checkingUpdate ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="cloud-download-outline" size={16} color={colors.primary} />
          )}
          <Text style={styles.checkUpdateBtnText}>
            {checkingUpdate ? 'Checking for Updates...' : 'Check for Latest App Update'}
          </Text>
        </TouchableOpacity>

        <View style={[styles.appVersionRow, { borderBottomWidth: 0, paddingTop: 8 }]}>
          <Text style={styles.appVersionLabel}>System Status</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' }} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#059669' }}>Online & Synchronized</Text>
          </View>
        </View>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={20} color="#dc2626" />
        <Text style={styles.logoutBtnText}>Sign Out of Student Account</Text>
      </TouchableOpacity>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.passIconWrap, { width: 36, height: 36 }]}>
                  <Ionicons name="key" size={18} color="#2563eb" />
                </View>
                <Text style={styles.modalTitle}>Change Password</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close-circle" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Create a new secure password for your student portal. You will use this password to sign in next time.
            </Text>

            <Text style={styles.inputLabel}>New Password (min 6 characters)</Text>
            <View style={styles.passInputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.modalInput}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPass}
                placeholder="Enter new password"
                placeholderTextColor="#94a3b8"
              />
              <TouchableOpacity onPress={() => setShowNewPass(!showNewPass)}>
                <Ionicons name={showNewPass ? 'eye-off' : 'eye'} size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <View style={styles.passInputWrapper}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.modalInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPass}
                placeholder="Re-enter new password"
                placeholderTextColor="#94a3b8"
              />
              <TouchableOpacity onPress={() => setShowConfirmPass(!showConfirmPass)}>
                <Ionicons name={showConfirmPass ? 'eye-off' : 'eye'} size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleChangePassword}
                disabled={changingPass}
              >
                {changingPass ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSaveText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  heroCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: spacing.md,
    ...shadows.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  avatarFallback: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  heroInfo: {
    flex: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 6,
    marginBottom: 6,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  heroCourse: {
    fontSize: 12,
    color: '#bfdbfe',
    marginTop: 2,
    lineHeight: 16,
  },
  idBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  idPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 5,
  },
  idLabel: {
    fontSize: 11,
    color: '#93c5fd',
    fontWeight: '600',
  },
  idVal: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  securityCard: {
    borderColor: '#bfdbfe',
    backgroundColor: '#ffffff',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  cardHeaderSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  sessionBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sessionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  changePasswordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  passIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePassTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  changePassSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 2,
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  grid2Col: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridTile: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  gridTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  gridTileLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  gridTileVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  cardFooterLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  cardFooterLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  profileRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileRowLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  profileRowVal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginTop: 1,
  },
  appVersionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  appVersionLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  appVersionVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
    marginBottom: spacing.xl,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: spacing.lg,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    marginTop: 6,
  },
  passInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 10,
  },
  modalInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.text,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: spacing.md,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalSaveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
    minWidth: 110,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  checkUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginVertical: 10,
  },
  checkUpdateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});
