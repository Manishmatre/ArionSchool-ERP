import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { colors, spacing, shadows } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/api';

// Required for expo-auth-session to handle redirects properly on Android
WebBrowser.maybeCompleteAuthSession();

// ─── Google OAuth Client IDs ───────────────────────────────────────────────────
const GOOGLE_WEB_CLIENT_ID = '207858797235-1i5rnv0kehqaf34a3cj04el6r4i5rvng.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = '207858797235-2fmsp14eku50mbnuo80529sugtaks6sg.apps.googleusercontent.com';

export default function LoginScreen() {
  const { login, googleLogin } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotInput, setForgotInput] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // ─── Direct Google OAuth hook ─────────────────────────────────────────────
  // Directly opens native Google account selector with 'select_account'
  const redirectUri = Platform.select({
    // Google rejects the short "seseducare" callback scheme on Android.
    // Match the registered Android package using a reverse-domain callback.
    android: AuthSession.makeRedirectUri({
      native: 'com.seseducare.lms:///oauthredirect',
    }),
    default: AuthSession.makeRedirectUri({ scheme: 'seseducare' }),
  });

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
    extraParams: {
      prompt: 'select_account',
    },
  });

  // Handle Google OAuth response when user selects an account
  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.authentication?.idToken || response.params?.id_token;
      const accessToken = response.authentication?.accessToken || response.params?.access_token;
      const token = idToken || accessToken;

      if (token) {
        handleGoogleAuthSuccess(token);
      } else {
        setGoogleLoading(false);
        setErrorMsg('Could not retrieve token from Google. Please try again.');
      }
    } else if (response?.type === 'error') {
      setGoogleLoading(false);
      setErrorMsg('Google Sign-In failed or was cancelled.');
    } else if (response?.type === 'cancel' || response?.type === 'dismiss') {
      setGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleAuthSuccess = async (token) => {
    setGoogleLoading(true);
    setErrorMsg('');
    try {
      const res = await googleLogin(token);
      if (!res.success) {
        setErrorMsg(res.message || 'Google Sign-In failed. Please check your student credentials.');
      }
    } catch (err) {
      console.error('Google auth error:', err);
      setErrorMsg(err.message || 'Authentication error. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setGoogleLoading(true);
    try {
      if (promptAsync) {
        await promptAsync({ showInRecents: true });
      } else {
        setGoogleLoading(false);
        setErrorMsg('Google Sign-In is initializing. Please tap again in a moment.');
      }
    } catch (err) {
      console.warn('Google prompt error:', err);
      setGoogleLoading(false);
      setErrorMsg('Could not open Google account picker.');
    }
  };

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      setErrorMsg('Please enter your Student ID / Email and Password.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const result = await login(identifier.trim(), password);
      if (!result.success) {
        setErrorMsg(result.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotInput.trim()) {
      Alert.alert('Required', 'Please enter your registered Email or Mobile number.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', {
        email: forgotInput.trim(),
        identifier: forgotInput.trim()
      });

      Alert.alert(
        'Request Submitted',
        res.data?.message || 'If an account exists with this credential, password reset instructions have been dispatched. You can also contact your school campus administrative office for instant offline reset.',
        [{ text: 'OK', onPress: () => setShowForgotModal(false) }]
      );
      setForgotInput('');
    } catch (e) {
      Alert.alert(
        'Notice',
        e.response?.data?.message || 'Password reset request sent. Please contact your school campus office if you need immediate assistance.'
      );
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0f172a', '#1e3a8a', '#172554']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Official Branding */}
          <View style={styles.brandContainer}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.officialLogo}
              resizeMode="contain"
            />
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#ffffff', letterSpacing: 0.5, marginTop: 4 }}>The Vits School</Text>
            <Text style={styles.brandTagline}>Official Student & Parent Portal • Jabalpur (M.P.)</Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Student & Parent Login</Text>
            <Text style={styles.cardSubtitle}>
              Sign in with your Email, Roll Number or Mobile
            </Text>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Input Identifier */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Student ID / Mobile / Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. student@thevitsschool.edu.in or 9893012345"
                  placeholderTextColor={colors.textMuted}
                  value={identifier}
                  onChangeText={(val) => {
                    setIdentifier(val);
                    if (errorMsg) setErrorMsg('');
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Input Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (errorMsg) setErrorMsg('');
                  }}
                  secureTextEntry={secureText}
                />
                <TouchableOpacity
                  onPress={() => setSecureText(!secureText)}
                  style={styles.eyeBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={secureText ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password Link */}
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => {
                setForgotInput(identifier.trim());
                setShowForgotModal(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotBtnText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#2563eb', '#1d4ed8']}
                style={styles.btnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Text style={styles.loginBtnText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 8 }} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign-In Button — opens native account picker directly */}
            <TouchableOpacity
              style={[styles.googleBtn, (loading || googleLoading || !request) && styles.googleBtnDisabled]}
              onPress={handleGoogleSignIn}
              disabled={loading || googleLoading || !request}
              activeOpacity={0.85}
            >
              {googleLoading ? (
                <View style={styles.googleBtnContent}>
                  <ActivityIndicator size="small" color="#2563eb" />
                  <Text style={[styles.googleBtnText, { marginLeft: 10 }]}>Authenticating with Google...</Text>
                </View>
              ) : (
                <View style={styles.googleBtnContent}>
                  {/* Google G logo using colored squares */}
                  <View style={styles.googleIconBadge}>
                    <Ionicons name="logo-google" size={20} color="#ea4335" />
                  </View>
                  <Text style={styles.googleBtnText}>Sign in with Google</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.googleHint}>
              Tap above to pick your Google account directly
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="key-outline" size={22} color={colors.primary} />
                <Text style={styles.modalTitle}>Reset Password</Text>
              </View>
              <TouchableOpacity onPress={() => setShowForgotModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Enter your registered student email or mobile number to receive reset instructions:
            </Text>

            <TextInput
              style={styles.modalInput}
              value={forgotInput}
              onChangeText={setForgotInput}
              placeholder="e.g. student@domain.com or Mobile"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.helpBox}>
              <Ionicons name="information-circle-outline" size={18} color="#0284c7" />
              <Text style={styles.helpText}>
                You can also visit your school administrative office for an instant offline password reset.
              </Text>
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#f1f5f9' }]}
                onPress={() => setShowForgotModal(false)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleForgotPassword}
                disabled={forgotLoading}
              >
                {forgotLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Send Reset</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  officialLogo: {
    width: 260,
    height: 100,
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: 14,
    color: '#bfdbfe',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: spacing.lg,
    ...shadows.lg,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    padding: 10,
    borderRadius: 10,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  eyeBtn: {
    padding: 6,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
    marginTop: -4,
  },
  forgotBtnText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  loginBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    ...shadows.md,
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
    textTransform: 'lowercase',
  },
  googleBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#dadce0',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  googleBtnDisabled: {
    opacity: 0.6,
  },
  googleBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  googleHint: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: '#f8fafc',
    marginBottom: 14,
  },
  helpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  helpText: {
    flex: 1,
    fontSize: 12,
    color: '#0369a1',
    lineHeight: 16,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
});
