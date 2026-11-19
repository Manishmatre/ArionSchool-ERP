import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Dimensions,
  TextInput,
  Animated,
  ScrollView,
  Easing
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, shadows } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/api';
import { notifyAttendanceMarked } from '../../services/notificationService';

const { width, height } = Dimensions.get('window');
// Size of the scanning square: 68% of screen width, max 260, mathematically centered
const SCAN_SIZE = Math.round(Math.min(width * 0.68, height * 0.35, 260));
// Header height approx (status bar + nav header)
const HEADER_H = Platform.OS === 'ios' ? 90 : 70;

export default function ScanPunchScreen({ navigation }) {
  const isFocused = useIsFocused();
  const { user, student, logout } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [punching, setPunching] = useState(false);
  const [punchResult, setPunchResult] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [torch, setTorch] = useState(false);
  const [facing, setFacing] = useState('back');
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [todayStatus, setTodayStatus] = useState(null);
  const [isAlreadyPunched, setIsAlreadyPunched] = useState(false);
  const [forceScan, setForceScan] = useState(false);
  const [checkingToday, setCheckingToday] = useState(false);

  // Animated laser line & breathing corners
  const scanAnim = useRef(new Animated.Value(2)).current;
  const bracketPulse = useRef(new Animated.Value(0.85)).current;

  const studentId = student?._id || user?.studentDetails?._id || user?.id;

  // Request camera permission
  useEffect(() => {
    let isMounted = true;
    if (isFocused && (!isAlreadyPunched || forceScan)) {
      (async () => {
        try {
          if (!permission || !permission.granted) {
            await requestPermission();
          }
        } catch (err) {
          console.warn('Camera request error:', err);
        }
      })();
    }
    return () => {
      isMounted = false;
    };
  }, [isFocused, permission, requestPermission, isAlreadyPunched, forceScan]);

  // Proper high-tech laser scan loop with smooth easing + corner pulse
  useEffect(() => {
    const laserLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: SCAN_SIZE - 40,
          duration: 2100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 2,
          duration: 2100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    laserLoop.start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bracketPulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bracketPulse, {
          toValue: 0.72,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => {
      laserLoop.stop();
      pulseLoop.stop();
    };
  }, [scanAnim, bracketPulse]);

  // Check today's punch status every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      checkTodayStatus();
    }, [studentId])
  );

  const checkTodayStatus = async () => {
    setCheckingToday(true);
    try {
      // 1. Primary: dedicated endpoint
      const res = await api.get('/attendance/today');
      if (res.data?.success && (res.data.punched || res.data.attendance)) {
        setTodayStatus(res.data.attendance);
        setIsAlreadyPunched(true);
        setCheckingToday(false);
        return;
      }
    } catch (e) {
      console.warn('Attendance today check notice:', e?.message);
    }

    // 2. Fallback: check student records for today's date / recent punch
    if (studentId) {
      try {
        const res = await api.get(`/attendance/student/${studentId}`);
        if (res.data?.success) {
          const raw = res.data.data;
          const records = Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.records)
            ? raw.records
            : [];

          const now = new Date();
          const twentyHoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000);

          const match = records.find((r) => {
            if (r.status !== 'present') return false;
            const rd = r.date ? new Date(r.date) : null;
            const rt = r.checkInTime ? new Date(r.checkInTime) : null;
            const rc = r.createdAt ? new Date(r.createdAt) : null;

            const isSameDay =
              (rd && rd.getFullYear() === now.getFullYear() && rd.getMonth() === now.getMonth() && rd.getDate() === now.getDate()) ||
              (rt && rt.getFullYear() === now.getFullYear() && rt.getMonth() === now.getMonth() && rt.getDate() === now.getDate());

            const isRecent =
              (rt && rt >= twentyHoursAgo) ||
              (rc && rc >= twentyHoursAgo);

            return isSameDay || isRecent;
          });

          if (match) {
            setTodayStatus(match);
            setIsAlreadyPunched(true);
            setCheckingToday(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Fallback attendance check error:', err?.message);
      }
    }

    setTodayStatus(null);
    setIsAlreadyPunched(false);
    setCheckingToday(false);
  };

  const handleBarcodeScanned = async ({ data }) => {
    if (scanned || punching) return;
    setScanned(true);
    await processPunch(data);
  };

  const processPunch = async (qrString) => {
    setPunching(true);
    try {
      let qrPayload = qrString;
      try {
        qrPayload = typeof qrString === 'string' ? JSON.parse(qrString) : qrString;
      } catch (e) {
        // raw string fallback
      }

      const res = await api.post('/attendance/qr/punch', {
        qrData: qrPayload,
        session: 'full_day'
      });

      if (res.data?.success) {
        setPunchResult(res.data);
        setModalVisible(true);
        setIsAlreadyPunched(true);
        if (res.data.data) {
          setTodayStatus(res.data.data);
        }
        checkTodayStatus();

        // Trigger phone notification banner
        try {
          notifyAttendanceMarked({
            studentName: res.data?.studentName || user?.name || student?.personalInfo?.name,
            checkInTime: res.data?.checkInTime || new Date(),
            centerName: res.data?.centerName || todayStatus?.franchise?.name || 'SES Educare School Campus',
          });
        } catch (notifErr) {
          console.log('Punch notification trigger note:', notifErr?.message);
        }
      } else {
        Alert.alert(
          'Verification Failed',
          res.data?.message || 'Could not verify attendance QR. Please scan the official poster at your institute.',
          [{ text: 'Scan Again', onPress: () => setScanned(false) }]
        );
      }
    } catch (err) {
      console.error('Punch error:', err);
      if (err.response?.status === 401) {
        Alert.alert(
          'Session Expired',
          'Please sign in again before scanning the attendance QR code.',
          [{ text: 'Sign In', onPress: logout }]
        );
        return;
      }
      const msg = err.response?.data?.message || 'Invalid QR code. Please scan the official attendance QR at your institute.';
      Alert.alert('Attendance Alert', msg, [{ text: 'Try Again', onPress: () => setScanned(false) }]);
    } finally {
      setPunching(false);
    }
  };

  const handleManualPunch = async () => {
    if (!manualCode.trim()) {
      Alert.alert('Required', 'Please enter your institute center code or attendance token.');
      return;
    }

    setShowManualModal(false);
    setScanned(true);

    const manualPayload = {
      type: 'SES_ATTENDANCE_QR',
      franchiseId: student?.franchise?._id || user?.franchise?._id || manualCode.trim(),
      code: manualCode.trim().toUpperCase(),
      date: new Date().toISOString().split('T')[0],
      session: 'full_day'
    };

    await processPunch(manualPayload);
    setManualCode('');
  };

  const resetScanner = () => {
    setModalVisible(false);
    setPunchResult(null);
    setScanned(false);
    setForceScan(false);
    setIsAlreadyPunched(true);
  };

  const getPunchTimeString = () => {
    const timeVal =
      todayStatus?.checkInTime ||
      todayStatus?.date ||
      punchResult?.checkInTime ||
      new Date();
    try {
      return new Date(timeVal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Marked Present';
    }
  };

  const getTodayDateString = () => {
    return new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <View style={styles.container}>
      {/* 1. STATE: Already Punched Today Confirmation View */}
      {isAlreadyPunched && !forceScan ? (
        <ScrollView contentContainerStyle={styles.punchedContent} showsVerticalScrollIndicator={false}>
          {/* Header Verified Gradient Banner */}
          <LinearGradient
            colors={['#065f46', '#047857', '#059669']}
            style={styles.punchedBanner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.punchedIconCircle}>
              <Ionicons name="checkmark-done" size={44} color="#059669" />
            </View>
            <Text style={styles.punchedBannerTitle}>Attendance Marked For Today!</Text>
            <Text style={styles.punchedBannerSub}>
              You are officially registered PRESENT in your institute
            </Text>

            <View style={styles.punchTimePill}>
              <Ionicons name="time" size={16} color="#ffffff" />
              <Text style={styles.punchTimePillText}>
                Check-In: {getPunchTimeString()}
              </Text>
            </View>
          </LinearGradient>

          {/* Details Card */}
          <View style={styles.punchedDetailsCard}>
            <View style={styles.detailsHeaderRow}>
              <Ionicons name="shield-checkmark" size={18} color="#059669" />
              <Text style={styles.detailsHeaderTitle}>VERIFIED ATTENDANCE RECORD</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Student Name</Text>
              <Text style={styles.detailVal}>{user?.name || student?.personalInfo?.name || 'Student'}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>School Campus</Text>
              <Text style={styles.detailVal}>
                {todayStatus?.franchise?.name || student?.franchise?.name || 'SES Educare School Campus'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailVal}>{getTodayDateString()}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Punch Time</Text>
              <Text style={[styles.detailVal, { color: '#059669', fontWeight: '800' }]}>
                {getPunchTimeString()}
              </Text>
            </View>

            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.detailLabel}>Attendance Status</Text>
              <View style={styles.badgeSuccess}>
                <Ionicons name="checkmark-circle" size={13} color="#15803d" style={{ marginRight: 4 }} />
                <Text style={styles.badgeSuccessText}>PRESENT</Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.punchedActions}>
            <TouchableOpacity
              style={styles.historyBtn}
              onPress={() => navigation.navigate('Attendance')}
              activeOpacity={0.85}
            >
              <Ionicons name="calendar-outline" size={18} color="#ffffff" />
              <Text style={styles.historyBtnText}>View Full Attendance History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reScanBtn}
              onPress={() => {
                setForceScan(true);
                setScanned(false);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
              <Text style={styles.reScanBtnText}>Scan Again / Another Session</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        /* 2. STATE: Full Camera View with MATHEMATICALLY CENTERED scanner target */
        <View style={styles.cameraContainer}>
          {!isFocused ? (
            <View style={styles.permissionBox}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : !permission || !permission.granted ? (
            <View style={styles.permissionBox}>
              <View style={styles.permIconCircle}>
                <Ionicons name="camera-outline" size={44} color="#38bdf8" />
              </View>
              <Text style={styles.permTitle}>Camera Access Required</Text>
              <Text style={styles.permDesc}>
                Please grant camera access to scan your institute attendance QR poster and mark your punch.
              </Text>
              <TouchableOpacity style={styles.grantBtn} onPress={() => requestPermission()} activeOpacity={0.85}>
                <Ionicons name="scan" size={18} color="#ffffff" />
                <Text style={styles.grantBtnText}>Enable Camera Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.grantBtn, { backgroundColor: '#1e293b', marginTop: 12, borderWidth: 1, borderColor: '#334155' }]}
                onPress={() => setShowManualModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="keypad-outline" size={16} color="#94a3b8" />
                <Text style={[styles.grantBtnText, { color: '#e2e8f0' }]}>Enter Center Code Manually</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cameraPreviewWrapper}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing={facing}
                enableTorch={torch}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={scanned || punching ? undefined : handleBarcodeScanned}
              />

              {/* 4-PIECE EXACT MASK CUTOUT: Dead-centered square cutout */}
              <View style={styles.maskTop} pointerEvents="none" />
              <View style={styles.maskBottom} pointerEvents="none" />
              <View style={styles.maskLeft} pointerEvents="none" />
              <View style={styles.maskRight} pointerEvents="none" />

              {/* TOP ACTION BAR: Torch & Camera Switch - Clear, Solid, Spaced Above Viewport */}
              <View style={styles.topActionsContainer} pointerEvents="box-none">
                <TouchableOpacity
                  style={[styles.actionBtn, torch ? styles.actionBtnTorchActive : styles.actionBtnDefault]}
                  onPress={() => setTorch((prev) => !prev)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={torch ? 'flash' : 'flash-outline'}
                    size={19}
                    color={torch ? '#000000' : '#facc15'}
                  />
                  <Text style={[styles.actionBtnText, torch ? styles.actionBtnTextDark : styles.actionBtnTextLight]}>
                    {torch ? 'Torch: ON' : 'Torch: OFF'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnDefault]}
                  onPress={() => setFacing((prev) => (prev === 'back' ? 'front' : 'back'))}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="camera-reverse-outline"
                    size={19}
                    color="#38bdf8"
                  />
                  <Text style={[styles.actionBtnText, styles.actionBtnTextLight]}>
                    {facing === 'back' ? 'Rear Cam' : 'Front Cam'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* DEAD-CENTER SCANNER VIEWPORT: 100% Mathematically centered horizontally & vertically */}
              <View style={styles.scannerViewport} pointerEvents="none">
                {/* Glowing Corner Brackets */}
                <Animated.View style={[styles.corner, styles.topLeft, { opacity: bracketPulse }]} />
                <Animated.View style={[styles.corner, styles.topRight, { opacity: bracketPulse }]} />
                <Animated.View style={[styles.corner, styles.bottomLeft, { opacity: bracketPulse }]} />
                <Animated.View style={[styles.corner, styles.bottomRight, { opacity: bracketPulse }]} />

                {/* Center Crosshair Reticle */}
                <View style={styles.aimReticle}>
                  <View style={styles.aimDot} />
                </View>

                {/* Laser Sweep Beam */}
                {!punching && (
                  <Animated.View
                    style={[
                      styles.laserContainer,
                      { transform: [{ translateY: scanAnim }] },
                    ]}
                  >
                    <LinearGradient
                      colors={['transparent', 'rgba(56, 189, 248, 0.08)', 'rgba(56, 189, 248, 0.35)', '#38bdf8']}
                      style={styles.laserGradient}
                    />
                    <View style={styles.laserBeamBar} />
                  </Animated.View>
                )}

                {punching && (
                  <View style={styles.punchingLoader}>
                    <ActivityIndicator size="large" color="#38bdf8" />
                    <Text style={styles.punchingText}>Verifying Attendance...</Text>
                  </View>
                )}
              </View>

              {/* INSTRUCTION & MANUAL PUNCH: Positioned safely below the viewport without shifting it */}
              <View style={styles.viewportHintsContainer} pointerEvents="box-none">
                <View style={styles.instructionBadge}>
                  <Ionicons name="scan-outline" size={16} color="#38bdf8" />
                  <Text style={styles.instructionBadgeText}>Center institute QR poster inside frame</Text>
                </View>

                <TouchableOpacity
                  style={styles.manualPunchBtn}
                  onPress={() => setShowManualModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="keypad-outline" size={15} color="#cbd5e1" />
                  <Text style={styles.manualPunchBtnText}>Enter Center Code Manually</Text>
                </TouchableOpacity>
              </View>

              {/* BOTTOM ATTENDANCE STATUS CARD: Pinned to bottom of the screen */}
              <View style={styles.bottomStatusCard} pointerEvents="box-none">
                <View style={styles.statusInnerCard}>
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusIconCircle,
                        isAlreadyPunched ? styles.statusIconCirclePresent : styles.statusIconCirclePending,
                      ]}
                    >
                      <Ionicons
                        name={isAlreadyPunched ? 'checkmark-circle' : 'time'}
                        size={22}
                        color={isAlreadyPunched ? '#16a34a' : '#d97706'}
                      />
                    </View>

                    <View style={styles.statusTextCol}>
                      <Text style={styles.statusHeading} numberOfLines={1}>
                        {isAlreadyPunched ? "Today's Status: PRESENT" : "Today: Not Punched Yet"}
                      </Text>
                      <Text style={styles.statusSubtitle} numberOfLines={1}>
                        {isAlreadyPunched
                          ? `Punch verified at ${getPunchTimeString()}`
                          : 'Scan official QR poster at your institute'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.statusRefreshBtn}
                      onPress={() => {
                        setScanned(false);
                        checkTodayStatus();
                      }}
                      disabled={checkingToday}
                      activeOpacity={0.7}
                    >
                      {checkingToday ? (
                        <ActivityIndicator size="small" color="#1e3a8a" />
                      ) : (
                        <Ionicons name="refresh" size={18} color="#1e3a8a" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Punch Success / Already Punched Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.successCard}>
            <LinearGradient
              colors={punchResult?.alreadyPunched ? ['#1e3a8a', '#2563eb'] : ['#059669', '#10b981']}
              style={styles.modalHeader}
            >
              <View style={styles.checkCircle}>
                <Ionicons
                  name={punchResult?.alreadyPunched ? 'information-circle' : 'checkmark-done'}
                  size={36}
                  color={punchResult?.alreadyPunched ? '#2563eb' : '#059669'}
                />
              </View>
              <Text style={styles.modalTitle}>
                {punchResult?.alreadyPunched ? 'Attendance Verified' : 'Punch Successful!'}
              </Text>
              <Text style={styles.modalSub}>
                {punchResult?.alreadyPunched ? 'Already recorded for today' : 'Marked as Present in Institute Register'}
              </Text>
            </LinearGradient>

            <View style={styles.modalBody}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Student Name</Text>
                <Text style={styles.detailVal}>{punchResult?.studentName || user?.name || 'Student'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Study Center</Text>
                <Text style={styles.detailVal}>{punchResult?.centerName || 'SES Educare'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Check-In Time</Text>
                <Text style={styles.detailVal}>
                  {punchResult?.checkInTime
                    ? new Date(punchResult.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailVal}>{new Date().toLocaleDateString('en-GB')}</Text>
              </View>
              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.detailLabel}>Status</Text>
                <View style={styles.badgeSuccess}>
                  <Text style={styles.badgeSuccessText}>PRESENT</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.doneBtn} onPress={resetScanner} activeOpacity={0.85}>
                <Text style={styles.doneBtnText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manual Code Modal */}
      <Modal visible={showManualModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.manualCard}>
            <View style={styles.manualHeader}>
              <Text style={styles.manualTitle}>Manual Center Punch</Text>
              <TouchableOpacity onPress={() => setShowManualModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.manualDesc}>
              Enter your Center Code (e.g., SES-DL-01) if camera scanning is not available.
            </Text>
            <TextInput
              style={styles.manualInput}
              placeholder="Enter Center / Institute Code"
              placeholderTextColor={colors.textMuted}
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.punchCodeBtn} onPress={handleManualPunch}>
              <Text style={styles.punchCodeBtnText}>Punch Attendance Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
  },
  cameraPreviewWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
  },
  maskTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: '50%',
    marginBottom: SCAN_SIZE / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    zIndex: 10,
  },
  maskBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: '50%',
    marginTop: SCAN_SIZE / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    zIndex: 10,
  },
  maskLeft: {
    position: 'absolute',
    left: 0,
    right: '50%',
    marginRight: SCAN_SIZE / 2,
    top: '50%',
    marginTop: -SCAN_SIZE / 2,
    height: SCAN_SIZE,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    zIndex: 10,
  },
  maskRight: {
    position: 'absolute',
    right: 0,
    left: '50%',
    marginLeft: SCAN_SIZE / 2,
    top: '50%',
    marginTop: -SCAN_SIZE / 2,
    height: SCAN_SIZE,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    zIndex: 10,
  },
  topActionsContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 18 : 16,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 30,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    minHeight: 42,
    ...shadows.sm,
  },
  actionBtnDefault: {
    backgroundColor: '#0f172a',
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  actionBtnTorchActive: {
    backgroundColor: '#facc15',
    borderColor: '#fef08a',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  actionBtnTextLight: {
    color: '#ffffff',
  },
  actionBtnTextDark: {
    color: '#0f172a',
  },
  scannerViewport: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    marginTop: -SCAN_SIZE / 2,
    marginLeft: -SCAN_SIZE / 2,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.55)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  corner: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: '#38bdf8',
    zIndex: 10,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderTopLeftRadius: 18,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderTopRightRadius: 18,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderBottomLeftRadius: 18,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderBottomRightRadius: 18,
  },
  aimReticle: {
    position: 'absolute',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aimDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(56, 189, 248, 0.75)',
  },
  laserContainer: {
    position: 'absolute',
    top: 0,
    left: 2,
    right: 2,
    height: 38,
    zIndex: 5,
  },
  laserGradient: {
    height: 34,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  laserBeamBar: {
    height: 3.5,
    backgroundColor: '#38bdf8',
    borderRadius: 2,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8,
  },
  punchingLoader: {
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    zIndex: 30,
  },
  punchingText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  viewportHintsContainer: {
    position: 'absolute',
    top: '50%',
    marginTop: (SCAN_SIZE / 2) + 14,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 25,
  },
  instructionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.45)',
    marginBottom: 8,
    ...shadows.sm,
  },
  instructionBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  manualPunchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.90)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  manualPunchBtnText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
  },
  bottomStatusCard: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 20 : 14,
    left: 16,
    right: 16,
    zIndex: 35,
  },
  statusInnerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    ...shadows.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  statusIconCirclePresent: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  statusIconCirclePending: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  statusTextCol: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  statusHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  statusSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 2,
  },
  statusRefreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#0f172a',
  },
  permTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 16,
  },
  permIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  permDesc: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  grantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  grantBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  punchedContent: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#0f172a',
    flexGrow: 1,
  },
  punchedBanner: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    ...shadows.lg,
  },
  punchedIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...shadows.md,
  },
  punchedBannerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  punchedBannerSub: {
    fontSize: 13,
    color: '#d1fae5',
    textAlign: 'center',
    marginTop: 6,
  },
  punchTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 16,
  },
  punchTimePillText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  punchedDetailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    marginTop: 16,
    ...shadows.md,
  },
  detailsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 6,
  },
  detailsHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  punchedActions: {
    marginTop: 20,
    gap: 12,
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    ...shadows.md,
  },
  historyBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  reScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...shadows.sm,
  },
  reScanBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    ...shadows.lg,
  },
  modalHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...shadows.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalSub: {
    fontSize: 12,
    color: '#e0e7ff',
    marginTop: 4,
  },
  modalBody: {
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  badgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeSuccessText: {
    color: '#15803d',
    fontSize: 11,
    fontWeight: '800',
  },
  doneBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  manualCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    ...shadows.lg,
  },
  manualHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  manualTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  manualDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 17,
  },
  manualInput: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    backgroundColor: '#f8fafc',
    marginBottom: 16,
  },
  punchCodeBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  punchCodeBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
