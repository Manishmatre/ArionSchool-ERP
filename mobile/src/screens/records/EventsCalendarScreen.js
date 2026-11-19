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
import { formatDate } from '../../utils/format';

const CATEGORIES = [
  { id: 'all', label: 'All Events' },
  { id: 'holiday', label: 'Holidays' },
  { id: 'academic', label: 'Academic' },
  { id: 'examination', label: 'Exams' },
  { id: 'ptm', label: 'PTM' },
  { id: 'sports', label: 'Sports' },
  { id: 'cultural', label: 'Cultural' },
];

export default function EventsCalendarScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState([]);
  const [category, setCategory] = useState('all');

  const loadEvents = useCallback(async () => {
    try {
      const res = await api.get('/school-events');
      if (res.data?.success) {
        setEvents(res.data.data || []);
      }
    } catch (e) {
      console.warn('Events load error:', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
  }, [loadEvents]);

  const getCategoryTheme = (cat) => {
    switch (cat) {
      case 'holiday':
        return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', icon: 'sunny' };
      case 'examination':
        return { bg: '#faf5ff', text: '#9333ea', border: '#e9d5ff', icon: 'school' };
      case 'ptm':
        return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', icon: 'people' };
      case 'sports':
        return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', icon: 'football' };
      case 'cultural':
        return { bg: '#fdf2f8', text: '#db2777', border: '#fbcfe8', icon: 'color-palette' };
      default:
        return { bg: '#f8fafc', text: '#475569', border: '#e2e8f0', icon: 'calendar' };
    }
  };

  const filteredEvents = events.filter((e) => {
    if (category === 'all') return true;
    return e.category === category;
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading school calendar...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Category Filter Pills */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBarContent}>
          {CATEGORIES.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setCategory(tab.id)}
              style={[styles.filterChip, category === tab.id && styles.filterChipActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, category === tab.id && styles.filterChipTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {filteredEvents.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="calendar-outline" size={38} color="#94a3b8" />
            </View>
            <Text style={styles.emptyTitle}>No Events Found</Text>
            <Text style={styles.emptySub}>
              No upcoming school activities or holidays in this category.
            </Text>
          </View>
        ) : (
          filteredEvents.map((item) => {
            const theme = getCategoryTheme(item.category);
            const dateObj = new Date(item.startDate || item.date || Date.now());
            const dayNum = dateObj.getDate();
            const monthStr = dateObj.toLocaleString('en-IN', { month: 'short' }).toUpperCase();

            return (
              <View key={item._id} style={styles.eventCard}>
                {/* Date Left Badge */}
                <View style={styles.dateCol}>
                  <Text style={styles.dayNum}>{dayNum}</Text>
                  <Text style={styles.monthStr}>{monthStr}</Text>
                </View>

                {/* Event Details */}
                <View style={styles.eventInfo}>
                  <View style={styles.topRow}>
                    <View style={[styles.categoryBadge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                      <Ionicons name={theme.icon} size={11} color={theme.text} />
                      <Text style={[styles.categoryText, { color: theme.text }]}>
                        {item.category?.toUpperCase() || 'EVENT'}
                      </Text>
                    </View>
                    {item.isHoliday && (
                      <View style={styles.holidayBadge}>
                        <Text style={styles.holidayText}>HOLIDAY</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.eventTitle}>{item.title}</Text>
                  {item.description ? (
                    <Text style={styles.eventDesc} numberOfLines={2}>{item.description}</Text>
                  ) : null}

                  <View style={styles.metaRow}>
                    {item.venue ? (
                      <View style={styles.metaItem}>
                        <Ionicons name="location-outline" size={12} color="#64748b" />
                        <Text style={styles.metaText}>{item.venue}</Text>
                      </View>
                    ) : null}
                    {item.endDate && item.endDate !== item.startDate ? (
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={12} color="#64748b" />
                        <Text style={styles.metaText}>Till {formatDate(item.endDate)}</Text>
                      </View>
                    ) : null}
                  </View>
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
  filterBar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 10,
  },
  filterBarContent: {
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 32,
  },
  eventCard: {
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
  dateCol: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingVertical: 10,
    marginRight: 14,
  },
  dayNum: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  monthStr: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3b82f6',
    letterSpacing: 0.5,
  },
  eventInfo: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  holidayBadge: {
    backgroundColor: '#fef2f2',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  holidayText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#dc2626',
    letterSpacing: 0.5,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  eventDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#64748b',
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
