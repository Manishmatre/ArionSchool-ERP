import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, shadows } from '../../config/theme';
import api from '../../config/api';
import { formatDate, formatTime } from '../../utils/format';

export default function OnlineClassesScreen() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await api.get('/online-classes/my');
      if (res.data && res.data.success) {
        const raw = res.data.data || res.data.classes || [];
        setClasses(Array.isArray(raw) ? raw : []);
      }
    } catch (e) {
      console.warn('Error fetching classes:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchClasses();
  }, [fetchClasses]);

  const joinMeeting = (url) => {
    if (!url) {
      Alert.alert('Notice', 'Meeting link has not been shared by faculty yet.');
      return;
    }
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open meeting link.');
    });
  };

  const renderClassItem = ({ item }) => {
    const meetUrl = item.meetingLink || item.joinUrl;
    const isLive = item.status === 'live' || item.isLive;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            {isLive ? (
              <View style={styles.liveTag}>
                <Ionicons name="radio" size={12} color="#ffffff" />
                <Text style={styles.liveTagText}>LIVE NOW</Text>
              </View>
            ) : (
              <View style={styles.scheduledTag}>
                <Ionicons name="calendar-outline" size={12} color={colors.primary} />
                <Text style={styles.scheduledTagText}>SCHEDULED</Text>
              </View>
            )}
            <Text style={styles.courseTag}>{item.course?.title || item.courseName || 'Academic Course'}</Text>
          </View>
        </View>

        <Text style={styles.title}>{item.topic || item.title || 'Interactive Online Lecture'}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.metaText}>{item.teacher || 'Faculty Trainer'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.metaText}>
              {item.startTime ? formatTime(item.startTime) : 'Scheduled'}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>
            {item.startTime ? formatDate(item.startTime, true) : 'Today'}
          </Text>

          <TouchableOpacity
            style={[styles.joinBtn, !meetUrl && { opacity: 0.5 }]}
            onPress={() => joinMeeting(meetUrl)}
            activeOpacity={0.8}
          >
            <Ionicons name="videocam" size={16} color="#ffffff" />
            <Text style={styles.joinBtnText}>Join Class</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading scheduled classes...</Text>
        </View>
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(item, index) => item._id || String(index)}
          renderItem={renderClassItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons name="videocam-off-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Live Classes Scheduled</Text>
              <Text style={styles.emptySub}>
                When your instructor schedules live video lectures, they will be listed here with meeting links.
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
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveTag: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveTagText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  scheduledTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduledTagText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  courseTag: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  dateText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  joinBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  joinBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginTop: 30,
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
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
