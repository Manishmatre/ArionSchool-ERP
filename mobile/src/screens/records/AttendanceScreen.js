import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, shadows } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/api';
import { formatDate } from '../../utils/format';

export default function AttendanceScreen({ navigation }) {
  const { user, student } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState(null);

  const studentId = student?._id || user?.studentDetails?._id || user?.id;

  const loadAttendance = useCallback(async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get(`/attendance/student/${studentId}`);
      if (res.data && res.data.success) {
        const raw = res.data.data || res.data.attendance || [];
        if (Array.isArray(raw)) {
          setAttendanceData(raw);
        } else if (raw && typeof raw === 'object') {
          setAttendanceData(Array.isArray(raw.records) ? raw.records : []);
          if (raw.statistics) {
            setAttendanceStats(raw.statistics);
          }
        } else {
          setAttendanceData([]);
        }
      }
    } catch (e) {
      console.warn('Attendance load error:', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAttendance();
  }, [loadAttendance]);

  const safeAttendance = Array.isArray(attendanceData) ? attendanceData : [];
  const totalDays = attendanceStats?.totalDays ?? safeAttendance.length;
  const presentDays = attendanceStats?.presentDays ?? safeAttendance.filter((a) => a?.status === 'present').length;
  const absentDays = attendanceStats?.absentDays ?? safeAttendance.filter((a) => a?.status === 'absent').length;
  const attendanceRate = attendanceStats?.percentage != null
    ? Math.round(Number(attendanceStats.percentage))
    : (totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {/* Attendance Stats Cards */}
      <View style={styles.overviewGrid}>
        <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
          <Text style={[styles.statVal, { color: colors.primary }]}>{attendanceRate}%</Text>
          <Text style={styles.statLabel}>Total Rate</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#ecfdf5' }]}>
          <Text style={[styles.statVal, { color: '#059669' }]}>{presentDays}</Text>
          <Text style={styles.statLabel}>Days Present</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#fef2f2' }]}>
          <Text style={[styles.statVal, { color: '#dc2626' }]}>{absentDays}</Text>
          <Text style={styles.statLabel}>Days Absent</Text>
        </View>
      </View>

      {/* Health Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: attendanceRate >= 75 ? '#ecfdf5' : '#fffbeb' }]}>
        <Ionicons
          name={attendanceRate >= 75 ? 'checkmark-circle' : 'alert-circle'}
          size={20}
          color={attendanceRate >= 75 ? '#059669' : '#d97706'}
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.statusBannerTitle, { color: attendanceRate >= 75 ? '#065f46' : '#92400e' }]}>
            {attendanceRate >= 75 ? 'Eligible for Examination & Certification' : 'Attention: Low Attendance Warning'}
          </Text>
          <Text style={[styles.statusBannerSub, { color: attendanceRate >= 75 ? '#047857' : '#b45309' }]}>
            {attendanceRate >= 75
              ? 'Minimum 75% attendance criteria successfully maintained.'
              : 'Please ensure regular class attendance to meet academic guidelines.'}
          </Text>
        </View>
      </View>

      {/* Attendance Log List */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Attendance Register Logs</Text>
        <Text style={styles.recordCountText}>{safeAttendance.length} records</Text>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching attendance records...</Text>
        </View>
      ) : safeAttendance.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Good Attendance Standing</Text>
          <Text style={styles.emptySub}>
            Your daily theory and practical classroom sessions are recorded digitally by your center faculty.
          </Text>
        </View>
      ) : (
        safeAttendance.map((item, idx) => {
          const isPresent = item.status === 'present';
          return (
            <View key={item._id || idx} style={styles.logCard}>
              <View style={[styles.statusIndicator, { backgroundColor: isPresent ? '#10b981' : '#ef4444' }]} />
              <View style={styles.logLeft}>
                <Text style={styles.logDate}>
                  {item.date ? formatDate(item.date, true) : 'Class Session'}
                </Text>
                <Text style={styles.logRemark}>
                  {item.remarks || (isPresent ? 'Regular Theory & Practical Session' : 'Absent - No Leave Recorded')}
                </Text>
              </View>

              <View
                style={[
                  styles.logBadge,
                  { backgroundColor: isPresent ? '#dcfce7' : '#fee2e2' },
                ]}
              >
                <Text
                  style={[
                    styles.logBadgeText,
                    { color: isPresent ? '#15803d' : '#b91c1c' },
                  ]}
                >
                  {item.status?.toUpperCase() || 'PRESENT'}
                </Text>
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
  overviewGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  statVal: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  statusBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusBannerSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  recordCountText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  statusIndicator: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: 12,
  },
  logLeft: {
    flex: 1,
  },
  logDate: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  logRemark: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  logBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  logBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  centerBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 10,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
  },
});
