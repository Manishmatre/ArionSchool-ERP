import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, shadows } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/api';
import { formatDate } from '../../utils/format';

export default function HomeworkScreen({ navigation }) {
  const { user, student } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [homeworkList, setHomeworkList] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'submitted' | 'graded'

  // Submission Modal state
  const [activeHomework, setActiveHomework] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const studentId = student?._id || user?.studentDetails?._id || user?.id;

  const loadHomework = useCallback(async () => {
    try {
      const res = await api.get('/homework');
      if (res.data?.success) {
        setHomeworkList(res.data.data || []);
      }
    } catch (e) {
      console.warn('Homework load error:', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHomework();
  }, [loadHomework]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHomework();
  }, [loadHomework]);

  const handleSubmit = async () => {
    if (!submissionText.trim()) {
      Alert.alert('Required', 'Please write your submission or paste your assignment link.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/homework/submit', {
        homeworkId: activeHomework._id,
        content: submissionText.trim()
      });
      if (res.data?.success) {
        Alert.alert('Success', 'Homework submitted successfully!');
        setActiveHomework(null);
        setSubmissionText('');
        loadHomework();
      } else {
        Alert.alert('Error', res.data?.message || 'Could not submit homework.');
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to submit homework.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'graded':
        return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', label: 'Graded' };
      case 'submitted':
        return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', label: 'Submitted' };
      default:
        return { bg: '#fffbeb', text: '#d97706', border: '#fde68a', label: 'Pending' };
    }
  };

  const filteredList = homeworkList.filter((item) => {
    const isSubmitted = !!item.mySubmission;
    const isGraded = item.mySubmission?.status === 'graded';
    if (filter === 'pending') return !isSubmitted;
    if (filter === 'submitted') return isSubmitted && !isGraded;
    if (filter === 'graded') return isGraded;
    return true;
  });

  const pendingCount = homeworkList.filter((h) => !h.mySubmission).length;
  const submittedCount = homeworkList.filter((h) => !!h.mySubmission && h.mySubmission?.status !== 'graded').length;
  const gradedCount = homeworkList.filter((h) => h.mySubmission?.status === 'graded').length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading homework assignments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Filter Chips */}
      <View style={styles.filterRow}>
        {[
          { id: 'all', label: `All (${homeworkList.length})` },
          { id: 'pending', label: `Pending (${pendingCount})` },
          { id: 'submitted', label: `Submitted (${submittedCount})` },
          { id: 'graded', label: `Graded (${gradedCount})` },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setFilter(tab.id)}
            style={[styles.filterChip, filter === tab.id && styles.filterChipActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, filter === tab.id && styles.filterChipTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {filteredList.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="document-text-outline" size={38} color="#94a3b8" />
            </View>
            <Text style={styles.emptyTitle}>No Homework Found</Text>
            <Text style={styles.emptySub}>
              {filter === 'pending'
                ? 'All caught up! No pending homework assignments.'
                : 'Assignments given by your subject teachers will appear here.'}
            </Text>
          </View>
        ) : (
          filteredList.map((item) => {
            const mySub = item.mySubmission;
            const currentStatus = mySub?.status === 'graded' ? 'graded' : mySub ? 'submitted' : 'pending';
            const badge = getStatusColor(currentStatus);

            return (
              <View key={item._id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.subjectPill}>
                    <Ionicons name="book" size={12} color="#2563eb" />
                    <Text style={styles.subjectText}>
                      {item.subject?.name || item.subject || 'General'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                    <Text style={[styles.statusText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                </View>

                <Text style={styles.cardTitle}>{item.title}</Text>
                {item.description ? (
                  <Text style={styles.cardDesc}>{item.description}</Text>
                ) : null}

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={13} color="#64748b" />
                    <Text style={styles.metaText}>Due: {item.dueDate ? formatDate(item.dueDate) : 'No due date'}</Text>
                  </View>
                  {item.maxMarks ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="ribbon-outline" size={13} color="#64748b" />
                      <Text style={styles.metaText}>Max Marks: {item.maxMarks}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Graded Feedback Callout */}
                {mySub?.status === 'graded' && (
                  <View style={styles.gradedBox}>
                    <View style={styles.gradedScoreRow}>
                      <Text style={styles.gradedScoreLabel}>Score Awarded:</Text>
                      <Text style={styles.gradedScoreVal}>{mySub.marksObtained ?? '—'} / {item.maxMarks || 100}</Text>
                    </View>
                    {mySub.feedback ? (
                      <Text style={styles.gradedFeedback}>Teacher Remarks: "{mySub.feedback}"</Text>
                    ) : null}
                  </View>
                )}

                {/* Action button */}
                {!mySub ? (
                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={() => {
                      setActiveHomework(item);
                      setSubmissionText('');
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="cloud-upload-outline" size={16} color="#ffffff" />
                    <Text style={styles.submitBtnText}>Submit Assignment</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.submittedInfo}>
                    <Ionicons name="checkmark-done" size={15} color="#059669" />
                    <Text style={styles.submittedInfoText}>
                      Submitted on {mySub.submittedAt ? formatDate(mySub.submittedAt) : 'Recorded'}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Submission Modal */}
      <Modal visible={!!activeHomework} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Submit Homework</Text>
                <Text style={styles.modalSub}>{activeHomework?.title}</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveHomework(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Your Response or Document Link</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Type your answer, solution notes, or paste a Google Drive / PDF link here..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={submissionText}
              onChangeText={setSubmissionText}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setActiveHomework(null)}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmSubmitBtn}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.confirmSubmitText}>Confirm & Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
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
  subjectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#eff6ff',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 8,
  },
  subjectText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  submittedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  submittedInfoText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  gradedBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  gradedScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  gradedScoreLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  gradedScoreVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  gradedFeedback: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#64748b',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  modalSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 120,
    backgroundColor: '#f8fafc',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  confirmSubmitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  confirmSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
