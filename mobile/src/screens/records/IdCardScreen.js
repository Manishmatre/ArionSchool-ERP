import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Share,
  Linking,
  Modal,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, shadows } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import api, { getHostUrl } from '../../config/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MAX_WIDTH = Math.min(SCREEN_WIDTH - 32, 380);
const CARD_HEIGHT = Math.round(CARD_MAX_WIDTH * (760 / 540)); // 1.407 ratio

export default function IdCardScreen({ navigation }) {
  const { user, student, token, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [idCard, setIdCard] = useState(null);
  const [activeSide, setActiveSide] = useState('front'); // 'front' | 'back' | 'official'
  const [previewModal, setPreviewModal] = useState({
    visible: false,
    previewUrl: '',
    downloadUrl: '',
  });
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const loadIdCard = useCallback(async () => {
    try {
      const res = await api.get('/id-cards/my');
      if (res.data?.success && res.data?.data) {
        setIdCard(res.data.data);
      }
    } catch (err) {
      console.log('Error fetching student ID card:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadIdCard();
  }, [loadIdCard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshProfile?.(), loadIdCard()]);
    setRefreshing(false);
  }, [refreshProfile, loadIdCard]);

  const getProfileImage = () => {
    const photo = student?.personalInfo?.photo || user?.profilePicture;
    if (!photo) return null;
    return photo.startsWith('http') ? photo : `${getHostUrl()}${photo.startsWith('/') ? '' : '/'}${photo}`;
  };

  const photoUri = getProfileImage();

  const studentName = (
    user?.name ||
    student?.personalInfo?.name ||
    (student?.personalInfo?.firstName
      ? `${student.personalInfo.firstName} ${student.personalInfo.lastName || ''}`.trim()
      : 'STUDENT NAME')
  ).toUpperCase();

  const studentIdVal =
    student?.studentId ||
    user?.studentDetails?.studentId ||
    student?.idCardNumber ||
    (student?._id ? `SES-STU-${student._id.slice(-6).toUpperCase()}` : 'SES-STU-2026-0001');

  const className = [
    student?.schoolClass?.name || student?.class?.name || student?.className,
    student?.section?.name || student?.sectionName
  ].filter(Boolean).join(' - ') || 'SCHOOL STUDENT';

  const schoolName = (student?.school?.name || student?.campus?.name || student?.franchise?.name || user?.school?.name || user?.campus?.name || user?.franchise?.name || 'SES Educare').trim();
  const studyCenter = schoolName;

  const phone = student?.contactInfo?.mobile || user?.mobile || student?.personalInfo?.phone || '+91 91651 79272';
  const fatherName = (student?.personalInfo?.fatherName || user?.studentDetails?.fatherName || '—').toUpperCase();

  const getDob = () => {
    const raw = student?.personalInfo?.dateOfBirth || user?.studentDetails?.dateOfBirth;
    if (!raw) return '—';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  };

  const dob = getDob();

  const session =
    student?.academicSession?.name || student?.session || user?.studentDetails?.session || 'CURRENT SESSION';

  const getAddress = () => {
    const addr = student?.contactInfo?.address || user?.address;
    if (!addr) return 'SCHOOL CAMPUS, INDIA';
    if (typeof addr === 'string') {
      return addr.replace(/[\r\n]+/g, ', ').replace(/\s+/g, ' ').trim().toUpperCase();
    }
    return [addr.street || addr.addressLine1, addr.city, addr.state, addr.pincode]
      .filter(Boolean)
      .join(', ')
      .replace(/[\r\n]+/g, ', ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase() || 'SCHOOL CAMPUS, INDIA';
  };

  const address = getAddress();

  const getDownloadUrl = () => {
    if (!idCard) return '';
    if (idCard.fileUrl && typeof idCard.fileUrl === 'string' && idCard.fileUrl.startsWith('http')) {
      return idCard.fileUrl;
    }
    const id = idCard._id || idCard.id;
    const base = getHostUrl();
    const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${base}/api/id-cards/download/${id}${tokenQuery}`;
  };

  const getPreviewUrl = () => {
    if (!idCard) return '';
    if (idCard.fileUrl && typeof idCard.fileUrl === 'string' && idCard.fileUrl.startsWith('http')) {
      return idCard.fileUrl;
    }
    const id = idCard._id || idCard.id;
    const base = getHostUrl();
    const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${base}/api/id-cards/preview/${id}${tokenQuery}`;
  };

  const verifyUrl = `https://myapp.seseducare.com/verify/id-card/${studentIdVal}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(verifyUrl)}`;

  const handleDownloadIdCard = () => {
    const url = getDownloadUrl();
    if (url) {
      Linking.openURL(url).catch((err) => console.warn('Cannot download ID card:', err));
    } else {
      loadIdCard();
    }
  };

  const handleOpenPreview = () => {
    const previewUrl = getPreviewUrl();
    const downloadUrl = getDownloadUrl();
    setImageLoading(true);
    setImageError(false);
    setPreviewModal({
      visible: true,
      previewUrl,
      downloadUrl,
    });
  };

  const handleShareIdCard = async () => {
    try {
      const downloadLink = getPreviewUrl() || getDownloadUrl() || verifyUrl;
      await Share.share({
        message: `SES EDUCARE - Student Identity Card\nStudent Name: ${studentName}\nStudent ID: ${studentIdVal}\nClass & Section: ${className}\nSchool: ${studyCenter}\nAcademic Session: ${session}\nVerify Credentials: ${downloadLink}`,
      });
    } catch (e) {
      // Ignored
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {/* Header Banner */}
      <LinearGradient colors={['#1e3a8a', '#2563eb']} style={styles.banner}>
        <View style={styles.bannerIconWrap}>
          <Ionicons name="card" size={24} color="#ffffff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Student Identity Card (Two-Sided)</Text>
          <Text style={styles.bannerSub}>
            Official dual-sided credential for class attendance & examination verification
          </Text>
        </View>
      </LinearGradient>

      {/* Switcher Tabs (Front Side | Back Side | Dual View) */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeSide === 'front' && styles.tabBtnActive]}
          onPress={() => setActiveSide('front')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="id-card-outline"
            size={16}
            color={activeSide === 'front' ? '#ffffff' : colors.textSecondary}
          />
          <Text style={[styles.tabBtnText, activeSide === 'front' && styles.tabBtnTextActive]}>
            Front Side
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeSide === 'back' && styles.tabBtnActive]}
          onPress={() => setActiveSide('back')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="document-text-outline"
            size={16}
            color={activeSide === 'back' ? '#ffffff' : colors.textSecondary}
          />
          <Text style={[styles.tabBtnText, activeSide === 'back' && styles.tabBtnTextActive]}>
            Back Side
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeSide === 'official' && styles.tabBtnActive]}
          onPress={() => setActiveSide('official')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="images-outline"
            size={16}
            color={activeSide === 'official' ? '#ffffff' : colors.textSecondary}
          />
          <Text style={[styles.tabBtnText, activeSide === 'official' && styles.tabBtnTextActive]}>
            Dual View
          </Text>
        </TouchableOpacity>
      </View>

      {/* =========================================================================
         1. FRONT SIDE VIEW (In Old Format with Big Text & Geometric Corners)
         ========================================================================= */}
      {activeSide === 'front' && (
        <View style={styles.cardCenterWrap}>
          <View style={[styles.idCardBox, { width: CARD_MAX_WIDTH, height: CARD_HEIGHT }]}>
            {/* Geometric Corners */}
            {/* Top-Right Blue Corner Bar */}
            <View style={styles.geomTopRightH} />
            <View style={styles.geomTopRightV} />

            {/* Bottom-Left Red Corner Bar */}
            <View style={styles.geomBottomLeftH} />
            <View style={styles.geomBottomLeftV} />

            {/* Red Framing Border */}
            <View style={styles.innerRedFrame} pointerEvents="none" />

            <View style={styles.cardContentPadding}>
              {/* Header: Logo ONLY (No unwanted duplicate heading) */}
              <View style={styles.frontHeaderArea}>
                <Image
                  source={require('../../../assets/logo.png')}
                  style={styles.logoImg}
                  resizeMode="contain"
                />

                <Text style={styles.schoolNameText} numberOfLines={1}>{schoolName.toUpperCase()}</Text>

                {/* Ribbon Tag: STUDENT IDENTITY CARD */}
                <View style={styles.ribbonTag}>
                  <Text style={styles.ribbonTagText}>STUDENT IDENTITY CARD</Text>
                </View>
              </View>

              {/* Student Photo */}
              <View style={styles.photoContainer}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.studentPhoto} resizeMode="cover" />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="person" size={44} color="#94a3b8" />
                  </View>
                )}
              </View>

              {/* Student Name (Big, bold text!) */}
              <Text style={styles.studentFullName} numberOfLines={1}>
                {studentName}
              </Text>

              {/* Class and Section */}
              <Text style={styles.courseTitleText} numberOfLines={2}>
                {className.toUpperCase()}
              </Text>

              {/* Student ID Badge Pill */}
              <View style={styles.idPill}>
                <Text style={styles.idPillText}>ID NO. : {studentIdVal}</Text>
              </View>

              {/* Details Table (Big text properly completing space of template!) */}
              <View style={styles.infoTable}>
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Father's Name</Text>
                  <Text style={styles.tableColon}>:</Text>
                  <Text style={styles.tableVal} numberOfLines={1}>{fatherName}</Text>
                </View>

                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Date of Birth</Text>
                  <Text style={styles.tableColon}>:</Text>
                  <Text style={styles.tableVal}>{dob}</Text>
                </View>

                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Mobile No.</Text>
                  <Text style={styles.tableColon}>:</Text>
                  <Text style={styles.tableVal}>{phone}</Text>
                </View>

                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Session</Text>
                  <Text style={styles.tableColon}>:</Text>
                  <Text style={styles.tableVal}>{session}</Text>
                </View>

                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>School</Text>
                  <Text style={styles.tableColon}>:</Text>
                  <Text style={styles.tableVal} numberOfLines={2}>{studyCenter}</Text>
                </View>

                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Address</Text>
                  <Text style={styles.tableColon}>:</Text>
                  <Text style={styles.tableVal} numberOfLines={2}>{address}</Text>
                </View>
              </View>

              {/* Bottom Row: Official Seal & Authorised Signature */}
              <View style={styles.bottomSignRow}>
                {/* Official Seal Stamp */}
                <View style={styles.sealBox}>
                  <Ionicons name="shield-checkmark" size={16} color="#1e3a8a" />
                  <Text style={styles.sealText}>★ OFFICIAL SEAL ★</Text>
                </View>

                {/* Signature */}
                <View style={styles.sigCol}>
                  <Text style={styles.sigName}>Principal</Text>
                  <View style={styles.sigUnderline} />
                  <Text style={styles.sigRole}>Authorised Signatory</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* =========================================================================
         2. BACK SIDE VIEW (EXACT SAME BORDER AS FRONT CARD!)
         ========================================================================= */}
      {activeSide === 'back' && (
        <View style={styles.cardCenterWrap}>
          <View style={[styles.idCardBox, { width: CARD_MAX_WIDTH, height: CARD_HEIGHT }]}>
            {/* Exact Same Geometric Corners as Front Card */}
            <View style={styles.geomTopRightH} />
            <View style={styles.geomTopRightV} />
            <View style={styles.geomBottomLeftH} />
            <View style={styles.geomBottomLeftV} />

            {/* Red Framing Border */}
            <View style={styles.innerRedFrame} pointerEvents="none" />

            <View style={styles.cardContentPadding}>
              {/* Header: Logo ONLY (No unwanted heading) */}
              <View style={styles.backHeaderArea}>
                <Image
                  source={require('../../../assets/logo.png')}
                  style={styles.logoImg}
                  resizeMode="contain"
                />
                <Text style={styles.termsHeading}>TERMS & CONDITIONS</Text>
              </View>

              {/* Terms & Conditions Bullet Points (Clear, readable text) */}
              <View style={styles.termsList}>
                {[
                  'Carry this ID card during school hours and official activities.',
                  'Show this ID card when requested by authorised school staff.',
                  'The ID Card is non-transferable and must not be used by others.',
                  'Report a lost or damaged ID card to the school office.',
                ].map((term, index) => (
                  <View key={index} style={styles.termRow}>
                    <Text style={styles.termBullet}>•</Text>
                    <Text style={styles.termText}>{term}</Text>
                  </View>
                ))}
              </View>

              {/* Middle Section: Dynamic QR Verification & Credential Shield */}
              <View style={styles.backQrSection}>
                <View style={styles.qrCol}>
                  <Image source={{ uri: qrCodeUrl }} style={styles.qrImage} resizeMode="contain" />
                  <Text style={styles.qrSubText}>Scan to Verify Card</Text>
                </View>

                <View style={styles.credDetailsCol}>
                  <View style={styles.credBadgeRow}>
                    <Ionicons name="checkmark-circle" size={14} color="#15803d" />
                    <Text style={styles.credBadgeTitle}>VERIFIED STUDENT</Text>
                  </View>
                  <Text style={styles.credSubTitle}>Official Digital Credential</Text>
                  <Text style={styles.credSessionText}>Valid Session: {session}</Text>
                  <Text style={styles.credIsoText}>Govt. Recognized • ISO 9001:2015</Text>
                </View>
              </View>

              {/* Lower Section: Campus Address & Big Contact Phone */}
              <View style={styles.campusSection}>
                <Text style={styles.campusTypeTitle}>
                  SCHOOL CAMPUS
                </Text>
                <Text style={styles.campusAddressLine1} numberOfLines={1}>
                  First Floor, Gariyaband Road, Near SBI Bank
                </Text>
                <Text style={styles.campusAddressLine2} numberOfLines={1}>
                  Rajim, District Gariyaband, Chhattisgarh - 493885
                </Text>

                <View style={styles.contactPhoneBox}>
                  <Text style={styles.supportLabel}>HELPLINE & SUPPORT</Text>
                  <Text style={styles.phoneBigText}>+91 91651 79272</Text>
                  <Text style={styles.webText}>www.seseducare.com</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* =========================================================================
         3. DUAL VIEW (Official Side-by-Side Server-Rendered Document)
         ========================================================================= */}
      {activeSide === 'official' && (
        <View style={styles.renderedCardWrap}>
          {getPreviewUrl() ? (
            <View style={styles.renderedImgBox}>
              <Image
                source={{
                  uri: getPreviewUrl(),
                  headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                }}
                style={[styles.renderedDualImage, { width: CARD_MAX_WIDTH, height: Math.round(CARD_MAX_WIDTH * (820 / 1180)) }]}
                resizeMode="contain"
              />
              <Text style={styles.dualHintText}>
                * Official High-Definition Two-Sided Document (Front & Back)
              </Text>
            </View>
          ) : (
            <View style={[styles.emptyCardBox, { width: CARD_MAX_WIDTH, height: 260 }]}>
              <ActivityIndicator size="large" color="#1e3a8a" />
              <Text style={styles.loadingCardText}>Loading official ID card...</Text>
            </View>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsBox}>
        {/* Download Official ID Card */}
        <TouchableOpacity
          style={styles.downloadBtn}
          onPress={handleDownloadIdCard}
          activeOpacity={0.85}
        >
          <Ionicons name="cloud-download-outline" size={20} color="#ffffff" />
          <Text style={styles.downloadBtnText}>Download Official ID Card</Text>
        </TouchableOpacity>

        <View style={styles.secondaryActionsRow}>
          {/* Preview Full Resolution Modal */}
          <TouchableOpacity
            style={styles.previewBtn}
            onPress={handleOpenPreview}
            activeOpacity={0.8}
          >
            <Ionicons name="eye-outline" size={18} color="#1e3a8a" />
            <Text style={styles.previewBtnText}>Full Preview</Text>
          </TouchableOpacity>

          {/* Share ID Card */}
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShareIdCard}
            activeOpacity={0.8}
          >
            <Ionicons name="share-social-outline" size={18} color="#1e3a8a" />
            <Text style={styles.shareBtnText}>Share ID Card</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.hintNotice}>
        * This official digital student credential is authorized by SES Educare Academic Council for class attendance and institutional verification.
      </Text>

      {/* Full-Screen Preview Modal */}
      <Modal
        visible={previewModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setPreviewModal((prev) => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  Two-Sided Student ID Card
                </Text>
                <Text style={styles.modalSub}>
                  Record ID: {studentIdVal}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setPreviewModal((prev) => ({ ...prev, visible: false }))}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {/* Modal Preview Body */}
            <View style={styles.modalBody}>
              {imageLoading && (
                <View style={styles.modalLoadingBox}>
                  <ActivityIndicator size="large" color="#1e3a8a" />
                  <Text style={styles.modalLoadingText}>Loading Official ID Card...</Text>
                </View>
              )}

              {previewModal.previewUrl ? (
                <Image
                  source={{
                    uri: previewModal.previewUrl,
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                  }}
                  style={styles.modalPreviewImage}
                  resizeMode="contain"
                  onLoadStart={() => setImageLoading(true)}
                  onLoadEnd={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false);
                    setImageError(true);
                  }}
                />
              ) : null}

              {imageError && (
                <View style={styles.modalErrorBox}>
                  <Ionicons name="card-outline" size={48} color="#94a3b8" />
                  <Text style={styles.modalErrorTitle}>Preview Unavailable</Text>
                  <Text style={styles.modalErrorSub}>
                    Tap below to download the high-resolution official document directly.
                  </Text>
                </View>
              )}
            </View>

            {/* Modal Actions Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setPreviewModal((prev) => ({ ...prev, visible: false }))}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalDownloadBtn}
                onPress={() => {
                  if (previewModal.downloadUrl) {
                    Linking.openURL(previewModal.downloadUrl).catch((err) =>
                      console.warn('Cannot open download:', err)
                    );
                  }
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="cloud-download-outline" size={17} color="#ffffff" />
                <Text style={styles.modalDownloadText}>Download Card</Text>
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 16,
    marginBottom: spacing.md,
    gap: 12,
    ...shadows.sm,
  },
  bannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  bannerSub: {
    fontSize: 11.5,
    color: '#dbeafe',
    marginTop: 2,
    lineHeight: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 3,
    marginBottom: spacing.md,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 5,
  },
  tabBtnActive: {
    backgroundColor: '#1e3a8a',
    ...shadows.sm,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },
  cardCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  idCardBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
    ...shadows.lg,
  },
  // Geometric corner bars (Front Card)
  geomTopRightH: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 85,
    height: 15,
    backgroundColor: '#25438d',
    zIndex: 1,
  },
  geomTopRightV: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 15,
    height: 120,
    backgroundColor: '#25438d',
    zIndex: 1,
  },
  geomBottomLeftH: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 85,
    height: 15,
    backgroundColor: '#e04f47',
    zIndex: 1,
  },
  geomBottomLeftV: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 15,
    height: 120,
    backgroundColor: '#e04f47',
    zIndex: 1,
  },
  innerRedFrame: {
    position: 'absolute',
    top: 15,
    left: 15,
    right: 15,
    bottom: 15,
    borderWidth: 1.5,
    borderColor: '#e04f47',
    zIndex: 1,
  },
  cardContentPadding: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  frontHeaderArea: {
    alignItems: 'center',
    width: '100%',
  },
  logoImg: {
    width: 115,
    height: 50,
    marginBottom: 6,
  },
  schoolNameText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1e3a8a',
    marginBottom: 4,
  },
  ribbonTag: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 2,
  },
  ribbonTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.6,
  },
  photoContainer: {
    width: 88,
    height: 102,
    borderWidth: 2,
    borderColor: '#25438d',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    marginVertical: 4,
  },
  studentPhoto: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  studentFullName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    marginTop: 2,
  },
  courseTitleText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1e3a8a',
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: 10,
  },
  idPill: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 3,
    marginTop: 5,
  },
  idPillText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '800',
    color: '#1d4ed8',
  },
  infoTable: {
    width: '100%',
    marginTop: 6,
    gap: 4,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tableLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1e293b',
    width: 95,
  },
  tableColon: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748b',
    width: 10,
  },
  tableVal: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 16,
  },
  bottomSignRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
  },
  sealBox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#1e3a8a',
    borderRadius: 22,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sealText: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#1e3a8a',
    marginTop: 1,
  },
  sigCol: {
    alignItems: 'center',
    width: 110,
  },
  sigName: {
    fontSize: 11,
    fontWeight: '800',
    fontStyle: 'italic',
    color: '#0f172a',
  },
  sigUnderline: {
    width: 80,
    height: 1,
    backgroundColor: '#94a3b8',
    marginVertical: 2,
  },
  sigRole: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#64748b',
  },
  // Back card specific styles
  backHeaderArea: {
    alignItems: 'center',
    width: '100%',
  },
  termsHeading: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1e3a8a',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  termsList: {
    width: '100%',
    marginVertical: 6,
    gap: 4,
  },
  termRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  termBullet: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e3a8a',
    lineHeight: 15,
  },
  termText: {
    flex: 1,
    fontSize: 9.5,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 14,
  },
  backQrSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  qrCol: {
    alignItems: 'center',
  },
  qrImage: {
    width: 58,
    height: 58,
    borderRadius: 4,
  },
  qrSubText: {
    fontSize: 7.5,
    color: '#64748b',
    marginTop: 2,
  },
  credDetailsCol: {
    flex: 1,
    gap: 2,
  },
  credBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  credBadgeTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#15803d',
  },
  credSubTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0f172a',
  },
  credSessionText: {
    fontSize: 8.5,
    color: '#475569',
  },
  credIsoText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#1e3a8a',
  },
  campusSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 2,
  },
  campusTypeTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#1e3a8a',
  },
  campusAddressLine1: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 1,
  },
  campusAddressLine2: {
    fontSize: 9,
    color: '#475569',
    marginTop: 1,
  },
  contactPhoneBox: {
    alignItems: 'center',
    marginTop: 6,
  },
  supportLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#dc2626',
    letterSpacing: 0.5,
  },
  phoneBigText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 1,
  },
  webText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#1e3a8a',
    marginTop: 1,
  },
  // Rendered dual image
  renderedCardWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  renderedImgBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    ...shadows.lg,
  },
  renderedDualImage: {
    borderRadius: 16,
  },
  dualHintText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginVertical: 8,
    textAlign: 'center',
  },
  emptyCardBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingCardText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 10,
  },
  actionsBox: {
    gap: 10,
    marginTop: 4,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e3a8a',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    ...shadows.md,
  },
  downloadBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  previewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#1e3a8a',
    borderRadius: 12,
    paddingVertical: 11,
    gap: 6,
  },
  previewBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    paddingVertical: 11,
    gap: 6,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  hintNotice: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 16,
    paddingHorizontal: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '92%',
    backgroundColor: '#ffffff',
    borderRadius: 22,
    overflow: 'hidden',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSub: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    minHeight: 460,
    maxHeight: 520,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  modalLoadingBox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  modalLoadingText: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalPreviewImage: {
    width: '100%',
    height: '100%',
  },
  modalErrorBox: {
    alignItems: 'center',
    padding: 24,
  },
  modalErrorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 10,
  },
  modalErrorSub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  modalDownloadBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1e3a8a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalDownloadText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ffffff',
  },
});
