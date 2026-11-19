import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, shadows } from '../../config/theme';
import api from '../../config/api';
import { formatDate } from '../../utils/format';

export default function StudentReviewsScreen() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myReviews, setMyReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReviewsData = useCallback(async () => {
    try {
      // 1. Fetch courses
      try {
        const cRes = await api.get('/courses/my/enrolled');
        if (cRes.data && cRes.data.success) {
          const rawList = Array.isArray(cRes.data.data)
            ? cRes.data.data
            : Array.isArray(cRes.data.courses)
            ? cRes.data.courses
            : [];
          const list = rawList.map((c) => (c && c.course ? c.course : c)).filter(Boolean);
          setCourses(list);
          if (list.length > 0 && !selectedCourse) {
            setSelectedCourse(list[0]);
          }
        }
      } catch (e) {
        console.warn('Could not fetch courses for reviews:', e);
      }

      // 2. Fetch my submitted testimonials
      try {
        const rRes = await api.get('/testimonials/my');
        if (rRes.data && rRes.data.success) {
          const rawRev = rRes.data.testimonials || rRes.data.data || [];
          setMyReviews(Array.isArray(rawRev) ? rawRev : []);
        }
      } catch (e) {
        console.warn('Could not fetch my reviews:', e);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCourse]);

  useEffect(() => {
    loadReviewsData();
  }, [loadReviewsData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReviewsData();
  }, [loadReviewsData]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Required', 'Please write a few words about your learning experience.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        course: selectedCourse?._id,
        rating,
        message: content.trim(),
        content: content.trim(),
        videoUrl: videoUrl.trim() || undefined,
        feedbackType: videoUrl.trim() ? 'video' : 'text',
      };

      const res = await api.post('/testimonials', payload);
      if (res.data?.success) {
        Alert.alert('Thank you!', 'Your feedback has been submitted successfully.');
        setContent('');
        setVideoUrl('');
        loadReviewsData();
      } else {
        Alert.alert('Error', res.data?.message || 'Could not submit review.');
      }
    } catch (err) {
      console.error('Review submit error:', err);
      Alert.alert('Submission Error', err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {/* Review Form Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Share Your Experience</Text>
        <Text style={styles.cardSub}>Rate your course and share your learning feedback.</Text>

        {/* Course Selector */}
        {courses.length > 0 && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Course</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.courseScroll}>
              {courses.map((c) => {
                const isSelected = selectedCourse?._id === c._id;
                return (
                  <TouchableOpacity
                    key={c._id}
                    style={[styles.coursePill, isSelected && styles.coursePillActive]}
                    onPress={() => setSelectedCourse(c)}
                  >
                    <Text style={[styles.coursePillText, isSelected && styles.coursePillTextActive]}>
                      {c.title || c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Rating Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Rating (1 - 5 Stars)</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starBtn}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={32}
                  color={colors.accent}
                />
              </TouchableOpacity>
            ))}
            <Text style={styles.ratingText}>{rating} of 5 Stars</Text>
          </View>
        </View>

        {/* Feedback Text */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Your Testimonial Review</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            placeholder="Tell us what you liked about the syllabus, instructors, and practicals..."
            placeholderTextColor={colors.textMuted}
            value={content}
            onChangeText={setContent}
            textAlignVertical="top"
          />
        </View>

        {/* Optional Video Review URL */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Video Review Link (Optional)</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="logo-youtube" size={18} color="#ef4444" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              placeholder="https://youtube.com/watch?v=... or Vimeo"
              placeholderTextColor={colors.textMuted}
              value={videoUrl}
              onChangeText={setVideoUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Text style={styles.submitBtnText}>Submit My Review</Text>
              <Ionicons name="paper-plane" size={18} color="#ffffff" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Past Submissions */}
      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>Your Submitted Reviews ({myReviews.length})</Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : myReviews.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="chatbubble-ellipses-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyText}>You haven't submitted any reviews yet.</Text>
          </View>
        ) : (
          myReviews.map((rev, idx) => {
            const reviewText = (rev.message || rev.content || '').trim() || 'Great learning experience!';
            const ratingScore = Math.max(1, Math.min(5, Number(rev.rating) || 5));
            const courseLabel = rev.courseName || rev.course?.title || null;

            return (
              <View key={rev._id || idx} style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <View style={styles.cardStars}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Ionicons
                        key={s}
                        name={s <= ratingScore ? 'star' : 'star-outline'}
                        size={16}
                        color={colors.accent}
                      />
                    ))}
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: rev.status === 'approved' ? '#dcfce7' : '#fef9c3' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: rev.status === 'approved' ? '#15803d' : '#854d0e' },
                      ]}
                    >
                      {rev.status?.toUpperCase() || 'PENDING APPROVAL'}
                    </Text>
                  </View>
                </View>

                {courseLabel ? (
                  <View style={styles.reviewCoursePill}>
                    <Ionicons name="book-outline" size={12} color={colors.primary} />
                    <Text style={styles.reviewCourseText}>{courseLabel}</Text>
                  </View>
                ) : null}

                <Text style={styles.reviewContent}>"{reviewText}"</Text>

                {rev.videoUrl ? (
                  <View style={styles.videoBadge}>
                    <Ionicons name="videocam" size={14} color={colors.primary} />
                    <Text style={styles.videoBadgeText}>Includes Video Review</Text>
                  </View>
                ) : null}

                <Text style={styles.reviewDate}>
                  Submitted {rev.createdAt ? formatDate(rev.createdAt) : 'Recently'}
                </Text>
              </View>
            );
          })
        )}
      </View>
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  cardSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  courseScroll: {
    flexDirection: 'row',
  },
  coursePill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  coursePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  coursePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  coursePillTextActive: {
    color: '#ffffff',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starBtn: {
    padding: 2,
  },
  ratingText: {
    marginLeft: 10,
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
    minHeight: 90,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...shadows.sm,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  historySection: {
    marginTop: 24,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  reviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardStars: {
    flexDirection: 'row',
    gap: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  reviewCoursePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  reviewCourseText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  reviewContent: {
    fontSize: 13,
    color: colors.text,
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 18,
  },
  videoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  videoBadgeText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  reviewDate: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
  },
});
