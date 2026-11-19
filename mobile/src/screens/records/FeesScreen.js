import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, shadows } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/api';
import { formatDate, formatCurrency } from '../../utils/format';

export default function FeesScreen({ navigation }) {
  const { user, student } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [obligations, setObligations] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const studentId = student?._id || user?.studentDetails?._id || user?._id || user?.id;

  const loadFeesAndTransactions = useCallback(async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    try {
      const [feeRes, txnRes] = await Promise.allSettled([
        api.get(`/fee-obligations/student/${studentId}`),
        api.get(`/transactions/unified?student=${studentId}`)
      ]);

      if (feeRes.status === 'fulfilled' && feeRes.value?.data?.success) {
        setSummary(feeRes.value.data.summary || null);
        const rawObs = feeRes.value.data.data || [];
        setObligations(Array.isArray(rawObs) ? rawObs : []);
      }

      if (txnRes.status === 'fulfilled' && txnRes.value?.data?.success) {
        const rawTx = txnRes.value.data.data || txnRes.value.data.transactions || [];
        setTransactions(Array.isArray(rawTx) ? rawTx : []);
      }
    } catch (e) {
      console.warn('Fee load error:', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadFeesAndTransactions();
  }, [loadFeesAndTransactions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFeesAndTransactions();
  }, [loadFeesAndTransactions]);

  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  // Completed payments only
  const completedTransactions = safeTransactions.filter(
    (t) => (t.status || t.paymentStatus) === 'completed'
  );
  // Pending payments awaiting admin approval
  const pendingTransactions = safeTransactions.filter(
    (t) => (t.status || t.paymentStatus) === 'pending'
  );

  // Real Database Calculations (No Hardcoded Fallbacks)
  const totalFees = Number(
    summary?.totalDue ??
    (obligations.length > 0
      ? obligations.reduce((sum, o) => sum + (Number(o.amountDue) || 0), 0)
      : (student?.fees?.totalFees ?? 0))
  );

  const paidFees = Number(
    summary?.totalPaid ??
    (completedTransactions.length > 0
      ? completedTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
      : (student?.fees?.paidAmount ?? 0))
  );

  const dueBalance = Number(
    summary?.totalPending ??
    Math.max(totalFees - paidFees, 0)
  );

  const paidPercentage =
    totalFees > 0
      ? Math.min(Math.round((paidFees / totalFees) * 100), 100)
      : (totalFees === 0 && paidFees === 0 ? 100 : 0);

  const courseTitle =
    obligations[0]?.course?.title ||
    student?.course?.title ||
    student?.academicInfo?.course?.title ||
    'Academic Course';

  const handleShareReceipt = async (tx) => {
    try {
      const studentName = user?.name || student?.personalInfo?.name || 'Student';
      const receiptNo =
        tx.receiptNumber ||
        tx.transactionNumber ||
        tx.receiptNo ||
        tx.transactionId ||
        (tx._id ? `SES-TXN-${tx._id.slice(-6).toUpperCase()}` : 'Payment');
      const amount = tx.amount ? `₹${formatCurrency(tx.amount)}` : 'N/A';
      const date = tx.paidAt || tx.paymentDate || tx.createdAt ? formatDate(tx.paidAt || tx.paymentDate || tx.createdAt, true) : 'Recent';
      const status = (tx.status || tx.paymentStatus || 'pending').toUpperCase();

      await Share.share({
        message: `SES EDUCARE - Official Payment Record\nReceipt / Txn ID: ${receiptNo}\nStudent: ${studentName}\nAmount: ${amount}\nDate: ${date}\nPayment Method: ${(tx.paymentMethod || 'Cash').toUpperCase()}\nStatus: ${status}`,
      });
    } catch {}
  };

  const getStatusBadge = (tx) => {
    const status = (tx.status || tx.paymentStatus || 'pending').toLowerCase();
    if (status === 'completed') {
      return (
        <View style={[styles.statusBadge, { backgroundColor: '#dcfce7' }]}>
          <Ionicons name="checkmark-done" size={12} color="#15803d" />
          <Text style={[styles.statusBadgeText, { color: '#15803d' }]}>COMPLETED</Text>
        </View>
      );
    }
    if (status === 'pending') {
      return (
        <View style={[styles.statusBadge, { backgroundColor: '#fef3c7' }]}>
          <Ionicons name="time-outline" size={12} color="#b45309" />
          <Text style={[styles.statusBadgeText, { color: '#b45309' }]}>PENDING</Text>
        </View>
      );
    }
    if (status === 'failed') {
      return (
        <View style={[styles.statusBadge, { backgroundColor: '#fee2e2' }]}>
          <Ionicons name="close-circle-outline" size={12} color="#b91c1c" />
          <Text style={[styles.statusBadgeText, { color: '#b91c1c' }]}>FAILED</Text>
        </View>
      );
    }
    return (
      <View style={[styles.statusBadge, { backgroundColor: '#f1f5f9' }]}>
        <Ionicons name="information-circle-outline" size={12} color="#475569" />
        <Text style={[styles.statusBadgeText, { color: '#475569' }]}>{status.toUpperCase()}</Text>
      </View>
    );
  };

  const formatPaymentType = (type) => {
    if (!type) return 'Course Fee';
    return type
      .replace(/^student_/, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {/* Fee Summary Card */}
      <View style={styles.summaryCard}>
        <LinearGradient
          colors={dueBalance === 0 && totalFees > 0 ? ['#065f46', '#059669'] : ['#1e3a8a', '#2563eb']}
          style={styles.gradientHeader}
        >
          <View style={styles.headerRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.headerLabel}>Course Fee Account</Text>
              <Text style={styles.headerCourse} numberOfLines={2}>
                {courseTitle}
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {dueBalance === 0 && totalFees > 0 ? 'FULLY PAID' : `${paidPercentage}% PAID`}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${paidPercentage}%` }]} />
          </View>
        </LinearGradient>

        <View style={styles.feeBreakdown}>
          <View style={styles.feeCol}>
            <Text style={styles.feeLabel}>Total Fee</Text>
            <Text style={styles.feeVal}>₹{formatCurrency(totalFees)}</Text>
          </View>
          <View style={[styles.feeCol, styles.feeColBorder]}>
            <Text style={styles.feeLabel}>Total Paid</Text>
            <Text style={[styles.feeVal, { color: paidFees > 0 ? '#16a34a' : colors.textSecondary }]}>
              ₹{formatCurrency(paidFees)}
            </Text>
          </View>
          <View style={styles.feeCol}>
            <Text style={styles.feeLabel}>Due Balance</Text>
            <Text style={[styles.feeVal, { color: dueBalance > 0 ? '#dc2626' : '#16a34a' }]}>
              ₹{formatCurrency(dueBalance)}
            </Text>
          </View>
        </View>
      </View>

      {/* Pending Cash / Payment Verification Alert */}
      {pendingTransactions.length > 0 && (
        <View style={styles.pendingAlert}>
          <View style={styles.pendingAlertHeader}>
            <Ionicons name="time" size={18} color="#b45309" />
            <Text style={styles.pendingAlertTitle}>Payment Verification in Progress</Text>
          </View>
          <Text style={styles.pendingAlertBody}>
            A payment of ₹{formatCurrency(pendingTransactions[0]?.amount)} via {(pendingTransactions[0]?.paymentMethod || 'Cash').toUpperCase()} was recorded on {formatDate(pendingTransactions[0]?.paidAt || pendingTransactions[0]?.paymentDate || pendingTransactions[0]?.createdAt)} and is currently pending verification by your study center admin. Once verified, your Net Paid balance will update automatically.
          </Text>
        </View>
      )}

      {/* Due Status Notice */}
      {dueBalance > 0 ? (
        <View style={styles.pendingNotice}>
          <Ionicons name="alert-circle-outline" size={20} color="#b45309" />
          <Text style={styles.pendingText}>
            You have an outstanding fee balance of ₹{formatCurrency(dueBalance)}. Please clear your dues at your study center office.
          </Text>
        </View>
      ) : totalFees > 0 ? (
        <View style={styles.paidNotice}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#059669" />
          <Text style={styles.paidNoticeText}>
            All fees are settled. Your student account is in good financial standing.
          </Text>
        </View>
      ) : (
        <View style={styles.paidNotice}>
          <Ionicons name="information-circle-outline" size={20} color="#059669" />
          <Text style={styles.paidNoticeText}>
            No fee obligations currently assigned to your student profile.
          </Text>
        </View>
      )}

      {/* Course Breakdown Section if multiple obligations exist */}
      {obligations.length > 0 && (
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeader}>
            <Ionicons name="school-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Course Fee Obligations</Text>
          </View>
          {obligations.map((ob, idx) => (
            <View key={ob._id || idx} style={styles.obligationCard}>
              <View style={styles.obTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.obCourseName}>
                    {ob.course?.title || courseTitle}
                  </Text>
                  <Text style={styles.obFeeType}>
                    {formatPaymentType(ob.feeType || 'course_fee')}
                  </Text>
                </View>
                <View style={styles.obAmountCol}>
                  <Text style={styles.obPendingAmount}>
                    ₹{formatCurrency(ob.amountPending ?? (ob.amountDue - (ob.amountPaid || 0)))}
                  </Text>
                  <Text style={styles.obPendingLabel}>
                    {ob.amountPending > 0 ? 'Pending' : 'Settled'}
                  </Text>
                </View>
              </View>
              <View style={styles.obFooter}>
                <Text style={styles.obDetailText}>
                  Obligation Due: ₹{formatCurrency(ob.amountDue)} • Paid: ₹{formatCurrency(ob.amountPaid || 0)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Transactions Section */}
      <View style={styles.sectionHeader}>
        <Ionicons name="receipt-outline" size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>Payment Transactions & Receipts</Text>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Loading fee transactions...</Text>
        </View>
      ) : safeTransactions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="receipt-outline" size={44} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No Payment Transactions Found</Text>
          <Text style={styles.emptySub}>
            Transactions recorded by your study center will appear here automatically.
          </Text>
        </View>
      ) : (
        safeTransactions.map((tx, idx) => {
          const receiptId =
            tx.receiptNumber ||
            tx.transactionNumber ||
            tx.receiptNo ||
            tx.transactionId ||
            (tx._id ? `SES-TXN-${String(tx._id).slice(-6).toUpperCase()}` : `TXN-${idx + 1}`);
          const dateStr =
            tx.paidAt || tx.paymentDate || tx.createdAt
              ? formatDate(tx.paidAt || tx.paymentDate || tx.createdAt, true)
              : 'Recent';
          const isPending = (tx.status || tx.paymentStatus || 'pending') === 'pending';

          return (
            <View key={tx._id || idx} style={styles.receiptCard}>
              <View style={styles.receiptTop}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.receiptNo}>
                    {receiptId}
                  </Text>
                  <Text style={styles.receiptDate}>{dateStr}</Text>
                  <Text style={styles.receiptType}>
                    {formatPaymentType(tx.category || tx.paymentType)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.receiptAmount, isPending && { color: '#d97706' }]}>
                    {isPending ? '₹' : '+₹'}{formatCurrency(tx.amount)}
                  </Text>
                  <View style={{ marginTop: 4 }}>
                    {getStatusBadge(tx)}
                  </View>
                </View>
              </View>

              <View style={styles.receiptDivider} />

              <View style={styles.receiptBottom}>
                <View style={styles.receiptInfo}>
                  <Ionicons name="card-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.receiptMethod}>
                    Mode: {(tx.paymentMethod || 'Cash').toUpperCase()}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.shareBtn}
                  onPress={() => handleShareReceipt(tx)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="share-social-outline" size={16} color={colors.primary} />
                  <Text style={styles.shareText}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
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
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  gradientHeader: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#bfdbfe',
    textTransform: 'uppercase',
  },
  headerCourse: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  progressContainer: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 3,
  },
  feeBreakdown: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  feeCol: {
    flex: 1,
    alignItems: 'center',
  },
  feeColBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  feeLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  feeVal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  pendingAlert: {
    backgroundColor: '#fffbeb',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: 14,
    marginBottom: spacing.md,
  },
  pendingAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  pendingAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e',
  },
  pendingAlertBody: {
    fontSize: 12,
    color: '#78350f',
    lineHeight: 18,
  },
  pendingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: spacing.lg,
    gap: 10,
  },
  pendingText: {
    flex: 1,
    fontSize: 12,
    color: '#991b1b',
    lineHeight: 17,
    fontWeight: '500',
  },
  paidNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    marginBottom: spacing.lg,
    gap: 10,
  },
  paidNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#065f46',
    lineHeight: 17,
    fontWeight: '500',
  },
  sectionWrap: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  obligationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    ...shadows.sm,
  },
  obTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  obCourseName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  obFeeType: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  obAmountCol: {
    alignItems: 'flex-end',
  },
  obPendingAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#dc2626',
  },
  obPendingLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  obFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  obDetailText: {
    fontSize: 11,
    color: colors.textSecondary,
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
  receiptCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    ...shadows.sm,
  },
  receiptTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  receiptNo: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  receiptDate: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  receiptType: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 3,
  },
  receiptAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16a34a',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },
  receiptBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  receiptMethod: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  shareText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
});
