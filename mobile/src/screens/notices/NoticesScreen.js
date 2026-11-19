import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, shadows } from '../../config/theme';
import api from '../../config/api';
import { formatDate } from '../../utils/format';

export default function NoticesScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchNotices = useCallback(async () => {
    try {
      const res = await api.get('/notifications/my');
      if (res.data && res.data.success) {
        const raw = res.data.data || res.data.notifications || [];
        setNotifications(Array.isArray(raw) ? raw : []);
      }
    } catch (e) {
      console.warn('Error fetching notices:', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotices();
  }, [fetchNotices]);

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
    } catch (e) {
      console.warn('Error marking notices read:', e?.message);
    }
  };

  const handleMarkOneRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (e) {
      // optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    }
  };

  const filteredNotices = notifications.filter((item) => {
    if (activeFilter === 'unread') return !item.isRead;
    if (activeFilter === 'academic') return (item.type || '').toLowerCase().includes('academic') || (item.category || '').toLowerCase().includes('academic');
    if (activeFilter === 'exam') return (item.type || '').toLowerCase().includes('exam') || (item.title || '').toLowerCase().includes('exam');
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const renderItem = ({ item }) => {
    const isUnread = !item.isRead;
    const type = (item.type || item.category || 'Announcement').toUpperCase();
    const isHighPriority = item.priority === 'high' || item.priority === 'urgent';

    return (
      <TouchableOpacity
        style={[styles.noticeCard, isUnread && styles.noticeCardUnread]}
        activeOpacity={0.8}
        onPress={() => {
          if (isUnread) handleMarkOneRead(item._id);
        }}
      >
        <View style={styles.noticeHeader}>
          <View style={styles.typeBadge}>
            <Ionicons
              name={
                type.includes('EXAM')
                  ? 'school-outline'
                  : type.includes('ACADEMIC')
                  ? 'book-outline'
                  : 'notifications-outline'
              }
              size={13}
              color={colors.primary}
            />
            <Text style={styles.typeBadgeText}>{type}</Text>
          </View>

          {isHighPriority && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentBadgeText}>URGENT</Text>
            </View>
          )}

          <Text style={styles.noticeDate}>
            {item.createdAt ? formatDate(item.createdAt) : 'Recent'}
          </Text>
        </View>

        <Text style={[styles.noticeTitle, isUnread && styles.noticeTitleBold]}>
          {item.title || 'Important Notice'}
        </Text>

        <Text style={styles.noticeBody} numberOfLines={4}>
          {item.message || item.content || item.description || 'Please review this academic notification.'}
        </Text>

        {isUnread && (
          <View style={styles.unreadDotRow}>
            <View style={styles.blueDot} />
            <Text style={styles.unreadNoticeText}>Unread Announcement</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top action header */}
      <View style={styles.actionBar}>
        <View>
          <Text style={styles.actionTitle}>Notice Board</Text>
          <Text style={styles.actionSub}>
            {unreadCount > 0 ? `${unreadCount} unread notices` : 'All caught up'}
          </Text>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
            <Ionicons name="checkmark-done" size={16} color={colors.primary} />
            <Text style={styles.markAllText}>Mark Read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {[
          { key: 'all', label: 'All Notices' },
          { key: 'unread', label: `Unread (${unreadCount})` },
          { key: 'academic', label: 'Academic' },
          { key: 'exam', label: 'Exams' },
        ].map((f) => {
          const isActive = activeFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching announcements...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotices}
          keyExtractor={(item, idx) => item._id || String(idx)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Announcements</Text>
              <Text style={styles.emptySub}>
                There are no new notices published for your batch or study center at this time.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  actionSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#ffffff',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
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
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  noticeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  noticeCardUnread: {
    borderColor: '#93c5fd',
    backgroundColor: '#f8faff',
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  urgentBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  urgentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#dc2626',
    letterSpacing: 0.5,
  },
  noticeDate: {
    marginLeft: 'auto',
    fontSize: 11,
    color: colors.textMuted,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  noticeTitleBold: {
    fontWeight: '700',
    color: '#1e3a8a',
  },
  noticeBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  unreadDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  blueDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  unreadNoticeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
