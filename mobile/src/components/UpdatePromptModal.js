import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
  Platform,
  AppState,
  BackHandler,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import api, { LIVE_API_HOST, getHostUrl } from '../config/api';
import { CURRENT_APP_VERSION, CURRENT_APP_BUILD } from '../config/version';
import { colors, spacing, shadows } from '../config/theme';

// Global listener registry so other screens (e.g. ProfileScreen) can trigger manual check
let triggerManualCheck = null;

export const checkAppUpdateManually = (onResult) => {
  if (triggerManualCheck) {
    triggerManualCheck(onResult);
  }
};

// Compare versions: returns true if server version is strictly newer than installed version
export const isNewerVersion = (serverVersion, serverCode, currentVersion, currentCode) => {
  // 1. Compare numeric versionCode / build number
  const sCode = Number(serverCode) || 0;
  const cCode = Number(currentCode) || 0;
  if (sCode > 0 && cCode > 0) {
    if (sCode > cCode) return true;
    if (sCode < cCode) return false;
  }

  // 2. Compare semver string: e.g. "1.0.13" vs "1.0.12"
  if (serverVersion && currentVersion) {
    const sClean = String(serverVersion).replace(/[^0-9.]/g, '');
    const cClean = String(currentVersion).replace(/[^0-9.]/g, '');

    const sParts = sClean.split('.').map((n) => parseInt(n, 10) || 0);
    const cParts = cClean.split('.').map((n) => parseInt(n, 10) || 0);
    const maxLen = Math.max(sParts.length, cParts.length);

    for (let i = 0; i < maxLen; i++) {
      const sVal = sParts[i] || 0;
      const cVal = cParts[i] || 0;
      if (sVal > cVal) return true;
      if (sVal < cVal) return false;
    }
  }

  return false;
};

export default function UpdatePromptModal() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [visible, setVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const checkForAppUpdate = useCallback(async (isManual = false, onResult = null) => {
    try {
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      let latest = null;

      // 1. Try primary configured API host
      try {
        const response = await api.get(`/app-version/latest?platform=${platform}`);
        if (response.data?.success && response.data?.data) {
          latest = response.data.data;
        }
      } catch (primaryErr) {
        // 2. Direct fallback to official live VPS server if custom/local host is offline
        try {
          const fallbackUrl = `${LIVE_API_HOST}/api/app-version/latest?platform=${platform}`;
          const fbRes = await axios.get(fallbackUrl, { timeout: 10000 });
          if (fbRes.data?.success && fbRes.data?.data) {
            latest = fbRes.data.data;
          }
        } catch (fbErr) {
          console.warn('Update check fallback skipped:', fbErr?.message);
        }
      }

      if (latest) {
        const hasNewer = isNewerVersion(
          latest.versionName,
          latest.versionCode,
          CURRENT_APP_VERSION,
          CURRENT_APP_BUILD
        );

        if (hasNewer) {
          // Always enforce mandatory update so all students stay synchronized with the latest platform version
          const enrichedInfo = {
            ...latest,
            isMandatory: latest.isMandatory !== false
          };
          setUpdateInfo(enrichedInfo);
          setVisible(true);
          if (onResult) onResult({ hasUpdate: true, latest: enrichedInfo });
          return;
        }
      }

      if (onResult) {
        onResult({ hasUpdate: false, currentVersion: CURRENT_APP_VERSION });
      }
    } catch (err) {
      console.log('App update check skipped:', err?.message);
      if (onResult) onResult({ hasUpdate: false, error: err?.message });
    }
  }, []);

  // Register manual trigger
  useEffect(() => {
    triggerManualCheck = (onResult) => checkForAppUpdate(true, onResult);
    return () => {
      triggerManualCheck = null;
    };
  }, [checkForAppUpdate]);

  // Initial check on mount + AppState listener on foreground resume + periodic polling
  useEffect(() => {
    checkForAppUpdate();

    // Re-check whenever student brings the app back to foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkForAppUpdate();
      }
    });

    // Background safety interval: re-check every 15 minutes
    const interval = setInterval(() => {
      checkForAppUpdate();
    }, 15 * 60 * 1000);

    return () => {
      subscription?.remove?.();
      clearInterval(interval);
    };
  }, [checkForAppUpdate]);

  // Handle Android hardware back button
  useEffect(() => {
    if (!visible) return undefined;

    const onBackPress = () => {
      // If mandatory, lock app from dismissing update screen
      if (updateInfo?.isMandatory !== false) {
        return true; // Block back button
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [visible, updateInfo]);

  if (!visible || !updateInfo) return null;

  const isMandatory = updateInfo.isMandatory !== false;

  const handleUpdateNow = async () => {
    try {
      setDownloading(true);
      const isIos = Platform.OS === 'ios';
      const host = getHostUrl() || LIVE_API_HOST;

      let downloadUrl = '';

      if (updateInfo.directDownloadUrl) {
        downloadUrl = `${host}${updateInfo.directDownloadUrl.startsWith('/') ? '' : '/'}${updateInfo.directDownloadUrl}`;
      } else if (updateInfo.apkUrl) {
        downloadUrl = updateInfo.apkUrl.startsWith('http')
          ? updateInfo.apkUrl
          : `${host}${updateInfo.apkUrl.startsWith('/') ? '' : '/'}${updateInfo.apkUrl}`;
      } else {
        downloadUrl = `${host}/api/app-version/download/${isIos ? 'ios' : 'android'}`;
      }

      if (isIos && updateInfo.iosUrl && updateInfo.iosUrl.startsWith('http') && !updateInfo.iosUrl.includes('/seseducare')) {
        downloadUrl = updateInfo.iosUrl;
      }

      await Linking.openURL(downloadUrl);
    } catch (error) {
      console.warn('Could not open update URL:', error);
      const host = getHostUrl() || LIVE_API_HOST;
      Linking.openURL(`${host}/api/app-version/download/${Platform.OS === 'ios' ? 'ios' : 'android'}`).catch(() => {});
    } finally {
      setTimeout(() => setDownloading(false), 3000);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (!isMandatory) setVisible(false);
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header Gradient */}
          <LinearGradient
            colors={isMandatory ? ['#b91c1c', '#991b1b'] : [colors.primary, colors.primaryDark || '#1e3a8a']}
            style={styles.header}
          >
            <View style={styles.iconCircle}>
              <Ionicons
                name={isMandatory ? 'shield-checkmark' : 'rocket-outline'}
                size={32}
                color={isMandatory ? '#b91c1c' : colors.primary}
              />
            </View>

            <View style={styles.mandatoryBadge}>
              <Ionicons name="alert-circle" size={13} color="#ffffff" />
              <Text style={styles.mandatoryBadgeText}>
                {isMandatory ? 'MANDATORY UPDATE REQUIRED' : 'NEW UPDATE AVAILABLE'}
              </Text>
            </View>

            <Text style={styles.headerTitle}>Update to Latest Version</Text>
            <Text style={styles.headerSubtitle}>
              {isMandatory
                ? 'To continue using SES Educare, please install the latest version now.'
                : 'A newer and improved version of SES Educare is available.'}
            </Text>
          </LinearGradient>

          {/* Body */}
          <View style={styles.body}>
            {/* Version comparison row */}
            <View style={styles.versionRow}>
              <View style={styles.versionBadge}>
                <Text style={styles.versionBadgeLabel}>Installed</Text>
                <Text style={styles.versionBadgeValue}>
                  v{CURRENT_APP_VERSION} (#{CURRENT_APP_BUILD})
                </Text>
              </View>

              <Ionicons name="arrow-forward" size={18} color="#94a3b8" />

              <View style={[styles.versionBadge, styles.versionBadgeNew]}>
                <Text style={[styles.versionBadgeLabel, { color: '#047857' }]}>Latest Live</Text>
                <Text style={[styles.versionBadgeValue, { color: '#065f46', fontWeight: 'bold' }]}>
                  v{updateInfo.versionName} (#{updateInfo.versionCode})
                </Text>
              </View>
            </View>

            {/* Release Notes */}
            <View style={styles.notesContainer}>
              <View style={styles.notesHeader}>
                <Ionicons name="sparkles" size={14} color="#2563eb" />
                <Text style={styles.notesTitle}>What's New in this Update:</Text>
              </View>
              <ScrollView style={styles.notesScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.notesText}>
                  {updateInfo.releaseNotes ||
                    'Includes major examination enhancements, instant QR attendance sync, live digital marksheets, and stability optimizations.'}
                </Text>
              </ScrollView>
              {updateInfo.fileSize && (
                <Text style={styles.sizeText}>Package Size: {updateInfo.fileSize}</Text>
              )}
            </View>

            {/* Instructions Banner */}
            <View style={styles.instructionBox}>
              <Ionicons name="information-circle-outline" size={15} color="#0369a1" style={{ marginTop: 1 }} />
              <Text style={styles.instructionText}>
                Tap below to download. Once downloaded, tap the notification or open your Downloads folder to install.
              </Text>
            </View>

            {/* Update Now Button */}
            <TouchableOpacity
              style={styles.btnUpdate}
              activeOpacity={0.85}
              onPress={handleUpdateNow}
              disabled={downloading}
            >
              <LinearGradient
                colors={isMandatory ? ['#dc2626', '#b91c1c'] : ['#10b981', '#059669']}
                style={styles.btnGradient}
              >
                {downloading ? (
                  <>
                    <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.btnUpdateText}>Starting Download...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="cloud-download-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.btnUpdateText}>Download & Install Update</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {!isMandatory && (
              <TouchableOpacity
                style={styles.btnLater}
                onPress={() => setVisible(false)}
              >
                <Text style={styles.btnLaterText}>Remind Me Later</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    ...shadows.lg,
  },
  header: {
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  iconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    ...shadows.md,
  },
  mandatoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: 8,
  },
  mandatoryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 10,
  },
  body: {
    padding: 18,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  versionBadge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    minWidth: 110,
  },
  versionBadgeNew: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1.5,
    borderColor: '#6ee7b7',
  },
  versionBadgeLabel: {
    fontSize: 10,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 2,
  },
  versionBadgeValue: {
    fontSize: 12,
    color: '#334155',
  },
  notesContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 12,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  notesScroll: {
    maxHeight: 80,
  },
  notesText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  sizeText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 6,
    fontWeight: '600',
  },
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  instructionText: {
    flex: 1,
    fontSize: 11,
    color: '#0369a1',
    lineHeight: 16,
    fontWeight: '500',
  },
  btnUpdate: {
    borderRadius: 14,
    overflow: 'hidden',
    ...shadows.md,
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  btnUpdateText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  btnLater: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 8,
  },
  btnLaterText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
});
