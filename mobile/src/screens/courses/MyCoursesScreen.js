import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, shadows } from '../../config/theme';
import api, { getHostUrl } from '../../config/api';

export default function MyCoursesScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('enrolled'); // 'enrolled' | 'all'
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchCourses = useCallback(async () => {
    try {
      // 1. Fetch Enrolled Courses
      try {
        const enrolledRes = await api.get('/courses/my/enrolled');
        if (enrolledRes.data && enrolledRes.data.success) {
          // Normalize: could be enrollment items with .course or direct course items
          const raw = Array.isArray(enrolledRes.data.data)
            ? enrolledRes.data.data
            : Array.isArray(enrolledRes.data.courses)
            ? enrolledRes.data.courses
            : [];
          const list = raw.map((item) => {
            if (item && item.course && typeof item.course === 'object') {
              return {
                ...item.course,
                enrollmentId: item._id,
                enrolledAt: item.enrolledAt,
                progressPercentage: item.progress || 0,
              };
            }
            return item;
          }).filter(Boolean);
          setEnrolledCourses(list);
        }
      } catch (err) {
        console.warn('Enrolled courses error:', err?.message);
      }

      // 2. Fetch All Courses Catalog
      try {
        const allRes = await api.get('/courses');
        if (allRes.data && allRes.data.success) {
          const rawAll = Array.isArray(allRes.data.data)
            ? allRes.data.data
            : Array.isArray(allRes.data.courses)
            ? allRes.data.courses
            : [];
          setAllCourses(rawAll);
        }
      } catch (err) {
        console.warn('All courses error:', err?.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCourses();
  }, [fetchCourses]);

  const rawCurrentList = activeTab === 'enrolled' ? enrolledCourses : allCourses;
  const currentList = Array.isArray(rawCurrentList) ? rawCurrentList : [];

  const filteredList = currentList.filter((c) => {
    const title = (c.title || c.name || '').toLowerCase();
    const code = (c.courseCode || c.code || '').toLowerCase();
    const query = search.toLowerCase().trim();
    return !query || title.includes(query) || code.includes(query);
  });

  const renderThumbnail = (course) => {
    const rawThumb = course.thumbnail || course.image;
    if (rawThumb) {
      const uri = rawThumb.startsWith('http') ? rawThumb : `${getHostUrl()}${rawThumb.startsWith('/') ? '' : '/'}${rawThumb}`;
      return <Image source={{ uri }} style={styles.courseImg} resizeMode="cover" />;
    }
    return (
      <View style={[styles.courseImg, styles.placeholderImg]}>
        <Ionicons name="book" size={32} color="#ffffff" />
      </View>
    );
  };

  const renderItem = ({ item }) => {
    const isEnrolled = activeTab === 'enrolled' || enrolledCourses.some((c) => c._id === item._id);
    const progress = item.progressPercentage || (isEnrolled ? 45 : 0);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CourseLearn', { course: item })}
      >
        <View style={styles.thumbWrapper}>
          {renderThumbnail(item)}
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{item.level || 'Certificate'}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.courseCode}>{item.courseCode || item.code || item.category || 'COURSE'}</Text>
          <Text style={styles.courseTitle} numberOfLines={2}>
            {item.title || item.name}
          </Text>

          {item.duration ? (
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>{item.duration} {item.durationUnit || 'Months'}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Ionicons name="layers-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>{item.curriculum?.length || item.totalChapters || 4} Chapters</Text>
            </View>
          ) : null}

          {/* Progress bar if enrolled */}
          {isEnrolled && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Course Progress</Text>
                <Text style={styles.progressVal}>{progress}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
              </View>
            </View>
          )}

          <View style={styles.cardFooter}>
            <TouchableOpacity
              style={[styles.actionBtn, isEnrolled ? styles.actionBtnLearn : styles.actionBtnView]}
              onPress={() => navigation.navigate('CourseLearn', { course: item })}
            >
              <Ionicons
                name={isEnrolled ? 'play-circle' : 'information-circle'}
                size={16}
                color="#ffffff"
              />
              <Text style={styles.actionBtnText}>
                {isEnrolled ? 'Continue Learning' : 'View Syllabus'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Tabs */}
      <View style={styles.header}>
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'enrolled' && styles.activeTab]}
            onPress={() => setActiveTab('enrolled')}
          >
            <Text style={[styles.tabText, activeTab === 'enrolled' && styles.activeTabText]}>
              My Enrolled ({enrolledCourses.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.activeTab]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
              All Courses ({allCourses.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search courses by name or code..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading courses...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item, index) => item._id || String(index)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="book-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>
                {activeTab === 'enrolled' ? 'No Enrolled Courses Found' : 'No Courses Available'}
              </Text>
              <Text style={styles.emptySub}>
                {activeTab === 'enrolled'
                  ? 'Switch to "All Courses" tab to explore all academic programs.'
                  : 'Check back later for newly added courses.'}
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
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#ffffff',
    ...shadows.sm,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 10,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  thumbWrapper: {
    height: 140,
    width: '100%',
    position: 'relative',
  },
  courseImg: {
    width: '100%',
    height: '100%',
  },
  placeholderImg: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  levelText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  cardBody: {
    padding: spacing.md,
  },
  courseCode: {
    fontSize: 11,
    color: colors.primaryLight,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  metaDot: {
    marginHorizontal: 4,
    color: colors.textMuted,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  progressVal: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  cardFooter: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionBtnLearn: {
    backgroundColor: colors.primary,
  },
  actionBtnView: {
    backgroundColor: '#475569',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
