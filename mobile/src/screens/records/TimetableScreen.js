import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, shadows } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/api';

const DAYS = [
  { id: 'Monday', short: 'Mon' },
  { id: 'Tuesday', short: 'Tue' },
  { id: 'Wednesday', short: 'Wed' },
  { id: 'Thursday', short: 'Thu' },
  { id: 'Friday', short: 'Fri' },
  { id: 'Saturday', short: 'Sat' },
];

export default function TimetableScreen({ navigation }) {
  const { user, student } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState([]);

  // Default to current day of week if Monday-Saturday, otherwise Monday
  const getTodayName = () => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const current = dayNames[new Date().getDay()];
    return current === 'Sunday' ? 'Monday' : current;
  };

  const [selectedDay, setSelectedDay] = useState(getTodayName);

  const loadTimetable = useCallback(async () => {
    try {
      const res = await api.get('/timetable');
      if (res.data?.success) {
        setEntries(res.data.data || []);
      }
    } catch (e) {
      console.warn('Timetable load error:', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTimetable();
  }, [loadTimetable]);

  // Filter and sort entries for selected day by period number
  const dayEntries = entries
    .filter((e) => e.dayOfWeek === selectedDay)
    .sort((a, b) => (a.periodNumber || 0) - (b.periodNumber || 0));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading class timetable...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Day Selector Header */}
      <View style={styles.daySelector}>
        {DAYS.map((d) => {
          const isSelected = selectedDay === d.id;
          const isToday = getTodayName() === d.id;

          return (
            <TouchableOpacity
              key={d.id}
              style={[styles.dayTab, isSelected && styles.dayTabActive]}
              onPress={() => setSelectedDay(d.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>{d.short}</Text>
              {isToday && <View style={[styles.todayDot, isSelected && styles.todayDotActive]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Day Heading */}
        <View style={styles.headingRow}>
          <Text style={styles.headingTitle}>{selectedDay}'s Class Schedule</Text>
          <Text style={styles.headingCount}>{dayEntries.length} Periods</Text>
        </View>

        {dayEntries.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="calendar-outline" size={38} color="#94a3b8" />
            </View>
            <Text style={styles.emptyTitle}>No Classes Scheduled</Text>
            <Text style={styles.emptySub}>
              There are no lecture periods configured for {selectedDay}.
            </Text>
          </View>
        ) : (
          dayEntries.map((period, idx) => {
            const isBreak = period.isBreak || period.subject?.name?.toLowerCase().includes('break');

            return (
              <View
                key={period._id || idx}
                style={[styles.periodCard, isBreak && styles.breakCard]}
              >
                {/* Left Period Number Column */}
                <View style={[styles.periodCol, isBreak && styles.breakPeriodCol]}>
                  <Text style={[styles.periodNum, isBreak && styles.breakPeriodNum]}>
                    {isBreak ? '☕' : `P${period.periodNumber || idx + 1}`}
                  </Text>
                  <Text style={styles.periodLabel}>{isBreak ? 'Break' : 'Period'}</Text>
                </View>

                {/* Right Class Details Column */}
                <View style={styles.infoCol}>
                  <View style={styles.timeRow}>
                    <Ionicons name="time-outline" size={13} color="#64748b" />
                    <Text style={styles.timeText}>
                      {period.startTime || '08:30 AM'} - {period.endTime || '09:15 AM'}
                    </Text>
                  </View>

                  <Text style={styles.subjectName}>
                    {period.subject?.name || period.subjectName || (isBreak ? 'Recess / Interval' : 'General Subject')}
                  </Text>

                  {!isBreak && (
                    <View style={styles.bottomMeta}>
                      <View style={styles.metaBadge}>
                        <Ionicons name="person-outline" size={12} color="#475569" />
                        <Text style={styles.metaBadgeText}>
                          {period.teacher?.name || period.teacherName || 'Faculty Teacher'}
                        </Text>
                      </View>
                      {period.room ? (
                        <View style={styles.metaBadge}>
                          <Ionicons name="location-outline" size={12} color="#475569" />
                          <Text style={styles.metaBadgeText}>Room {period.room}</Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  daySelector: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    justifyContent: 'space-between',
  },
  dayTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    marginHorizontal: 3,
  },
  dayTabActive: {
    backgroundColor: colors.primary,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dayTextActive: {
    color: '#ffffff',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  todayDotActive: {
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 32,
  },
  headingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  headingCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    backgroundColor: '#e2e8f0',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  periodCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    ...shadows.sm,
  },
  breakCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  periodCol: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingVertical: 10,
    marginRight: 14,
  },
  breakPeriodCol: {
    backgroundColor: '#fef3c7',
  },
  periodNum: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  breakPeriodNum: {
    fontSize: 16,
    color: '#d97706',
  },
  periodLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  infoCol: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  bottomMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  metaBadgeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 18,
  },
});
