import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Share,
  Modal,
  Image,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, shadows } from '../../config/theme';
import api, { getHostUrl } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/format';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CertificatesScreen({ navigation }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [certificates, setCertificates] = useState([]);
  const [previewModal, setPreviewModal] = useState({
    visible: false,
    title: '',
    certificateNumber: '',
    previewUrl: '',
    downloadUrl: '',
  });
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const loadCertificates = useCallback(async () => {
    try {
      const res = await api.get('/student-certificates/my');
      if (res.data && res.data.success) {
        const rawCerts = res.data.certificates || res.data.data || [];
        setCertificates(Array.isArray(rawCerts) ? rawCerts : []);
      }
    } catch (e) {
      console.warn('Certificates load error:', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCertificates();
  }, [loadCertificates]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCertificates();
  }, [loadCertificates]);

  const safeCertificates = Array.isArray(certificates) ? certificates : [];

  const getDownloadUrl = (cert) => {
    if (!cert) return '';
    if (cert.fileUrl && typeof cert.fileUrl === 'string' && cert.fileUrl.startsWith('http')) {
      return cert.fileUrl;
    }
    const id = cert._id || cert.id;
    const base = getHostUrl();
    const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${base}/api/student-certificates/download/${id}${tokenQuery}`;
  };

  const getPreviewUrl = (cert) => {
    if (!cert) return '';
    if (cert.fileUrl && typeof cert.fileUrl === 'string' && cert.fileUrl.startsWith('http')) {
      return cert.fileUrl;
    }
    const id = cert._id || cert.id;
    const base = getHostUrl();
    const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${base}/api/student-certificates/preview/${id}${tokenQuery}`;
  };

  const handleOpenPreview = (cert) => {
    const courseTitle = cert.course?.title || cert.courseTitle || 'Course Completion Award';
    const num = cert.certificateNumber || 'SES-CERT';
    setImageLoading(true);
    setImageError(false);
    setPreviewModal({
      visible: true,
      title: courseTitle,
      certificateNumber: num,
      previewUrl: getPreviewUrl(cert),
      downloadUrl: getDownloadUrl(cert),
    });
  };

  const handleDownloadCertificate = (cert) => {
    const url = getDownloadUrl(cert);
    if (!url) return;
    Linking.openURL(url).catch((err) => console.warn('Cannot download certificate:', err));
  };

  const handleShareCertificate = async (cert) => {
    try {
      const certNo = cert.certificateNumber || 'SES-CERT-2026';
      const course = cert.course?.title || cert.courseTitle || 'Certificate of Completion';
      const url = getPreviewUrl(cert);
      await Share.share({
        message: `SES EDUCARE - Verified Certificate of Completion\nCourse: ${course}\nCertificate ID: ${certNo}\nVerified by SES Educare Academic Council.\n${url}`,
      });
    } catch {}
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Banner */}
        <LinearGradient colors={['#7c3aed', '#6366f1']} style={styles.banner}>
          <View style={styles.bannerIconWrap}>
            <Ionicons name="ribbon" size={28} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Verified Credentials</Text>
            <Text style={styles.bannerSub}>
              Digital completion certificates awarded by SES Educare with ISO accreditation.
            </Text>
          </View>
        </LinearGradient>

        {/* List Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Issued Certificates ({safeCertificates.length})</Text>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading certificates...</Text>
          </View>
        ) : safeCertificates.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="ribbon-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Certificates Issued Yet</Text>
            <Text style={styles.emptySub}>
              Complete your enrolled course modules and training requirements. Your official verified certificate will be published here by your institute.
            </Text>
          </View>
        ) : (
          safeCertificates.map((cert, idx) => {
            const certNo = cert.certificateNumber || `SES-CERT-${202600 + idx}`;
            const courseTitle = cert.course?.title || cert.courseTitle || 'Course Completion Award';
            const issueDate = cert.issueDate ? formatDate(cert.issueDate) : 'Session 2026';

            return (
              <View key={cert._id || idx} style={styles.certCard}>
                <View style={styles.certTop}>
                  <View style={styles.certBadgeWrap}>
                    <Ionicons name="ribbon" size={24} color="#7c3aed" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.certTitle}>{courseTitle}</Text>
                    <Text style={styles.certId}>ID: {certNo}</Text>
                  </View>
                  <View style={styles.statusPill}>
                    <Ionicons name="shield-checkmark" size={12} color="#15803d" />
                    <Text style={styles.statusText}>VERIFIED</Text>
                  </View>
                </View>

                <View style={styles.certDivider} />

                <View style={styles.certBottom}>
                  <View>
                    <Text style={styles.dateLabel}>Issue Date</Text>
                    <Text style={styles.dateVal}>{issueDate}</Text>
                  </View>

                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={styles.shareBtn}
                      onPress={() => handleShareCertificate(cert)}
                      activeOpacity={0.7}
                      accessibilityLabel="Share certificate"
                    >
                      <Ionicons name="share-social-outline" size={16} color={colors.primary} />
                    </TouchableOpacity>

                    {/* Preview Button */}
                    <TouchableOpacity
                      style={styles.previewBtn}
                      onPress={() => handleOpenPreview(cert)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="eye-outline" size={15} color="#7c3aed" />
                      <Text style={styles.previewText}>Preview</Text>
                    </TouchableOpacity>

                    {/* Download Button */}
                    <TouchableOpacity
                      style={styles.downloadBtn}
                      onPress={() => handleDownloadCertificate(cert)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="cloud-download-outline" size={15} color="#ffffff" />
                      <Text style={styles.downloadText}>Download</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* High-Fidelity Certificate Preview Modal */}
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
                  {previewModal.title}
                </Text>
                <Text style={styles.modalSub}>
                  Official Certificate ID: {previewModal.certificateNumber}
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
                  <ActivityIndicator size="large" color="#7c3aed" />
                  <Text style={styles.modalLoadingText}>Loading Certificate Preview...</Text>
                </View>
              )}

              {previewModal.previewUrl ? (
                <Image
                  source={{
                    uri: previewModal.previewUrl,
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                  }}
                  style={styles.previewImage}
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
                  <Ionicons name="ribbon-outline" size={48} color="#94a3b8" />
                  <Text style={styles.modalErrorTitle}>Preview Unavailable</Text>
                  <Text style={styles.modalErrorSub}>
                    Tap below to open or download the high-resolution official document.
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
                <Text style={styles.modalDownloadText}>Download Certificate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  },
  bannerIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  bannerSub: {
    fontSize: 12,
    color: '#e0e7ff',
    marginTop: 2,
    lineHeight: 16,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  centerBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  certCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    ...shadows.sm,
  },
  certTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  certBadgeWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  certTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  certId: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803d',
  },
  certDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  certBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  dateVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shareBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },
  previewText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7c3aed',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 5,
  },
  downloadText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },

  /* Preview Modal Styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 520,
    maxHeight: SCREEN_HEIGHT * 0.88,
    backgroundColor: '#ffffff',
    borderRadius: 20,
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
    backgroundColor: '#f8fafc',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  modalSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    height: SCREEN_HEIGHT * 0.52,
    backgroundColor: '#0f172a',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  modalLoadingBox: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalLoadingText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
  },
  modalErrorBox: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 12,
  },
  modalErrorTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  modalErrorSub: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7c3aed',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    ...shadows.sm,
  },
  modalDownloadText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
