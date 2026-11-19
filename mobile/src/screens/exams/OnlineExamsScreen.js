import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, shadows } from '../../config/theme';
import api from '../../config/api';

// Helper to safely parse date/time string respecting Indian Standard Time (+05:30)
const parseExamTime = (dateVal) => {
  if (!dateVal) return NaN;
  if (typeof dateVal === 'number') return dateVal;
  if (dateVal instanceof Date) return dateVal.getTime();
  const str = String(dateVal).trim();
  if (!str) return NaN;
  if (!str.includes('Z') && !str.match(/[+-]\d\d:?\d\d$/)) {
    const parsedIst = new Date(`${str}+05:30`).getTime();
    if (!isNaN(parsedIst)) return parsedIst;
  }
  return new Date(str).getTime();
};

export default function OnlineExamsScreen({ navigation }) {
  const [activeSubTab, setActiveSubTab] = useState('active'); // 'active' | 'completed'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [availableExams, setAvailableExams] = useState([]);
  const [attemptedExams, setAttemptedExams] = useState([]);

  // Exam Runner Modal State
  const [examModalVisible, setExamModalVisible] = useState(false);
  const [currentExam, setCurrentExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);

  const fetchExams = useCallback(async () => {
    try {
      const res = await api.get('/exams/student/my-exams');
      if (res.data?.success && res.data.data) {
        setAvailableExams(res.data.data.available || []);
        setAttemptedExams(res.data.data.attempted || []);
      }
    } catch (err) {
      console.warn('Exams fetch error:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExams();
  };

  const handleStartExam = async (exam) => {
    const startTs = parseExamTime(exam.startTime);
    if (!isNaN(startTs) && Date.now() < startTs) {
      const formatted = new Date(startTs).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
      Alert.alert(
        'Upcoming Exam',
        `This examination is scheduled to start on ${formatted}. You cannot start this exam before the scheduled start time.`
      );
      return;
    }

    const isAllowed = !exam.feeAccess || exam.feeAccess.allowed === true || exam.feeAccess.isEligible === true;
    if (!isAllowed) {
      Alert.alert(
        'Fee Clearance Required',
        exam.feeAccess?.message || 'Please clear your pending fee installments before taking this examination.'
      );
      return;
    }

    try {
      const res = await api.get(`/exams/student/${exam._id}/start`);
      if (res.data?.success && res.data.data) {
        const fullExam = res.data.data;
        const examQuestions = fullExam.mcqs || fullExam.questions || [];

        if (examQuestions.length === 0) {
          Alert.alert('Exam Notice', 'Questions for this exam are being finalized by your institute instructor.');
          return;
        }

        setCurrentExam(fullExam);
        setQuestions(examQuestions);
        setCurrentQuestionIdx(0);
        setSelectedAnswers({});
        setTimeLeft((fullExam.duration || 30) * 60);
        setExamModalVisible(true);
      } else {
        Alert.alert('Unable to Start Exam', res.data?.message || 'Exam is currently not accessible.');
      }
    } catch (err) {
      Alert.alert(
        'Exam Schedule Alert',
        err.response?.data?.message || 'Could not start exam. Please ensure exam session is active.'
      );
    }
  };

  // Timer countdown
  useEffect(() => {
    if (examModalVisible && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmitExam(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examModalVisible, timeLeft]);

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSelectOption = (questionId, optionIdx) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIdx,
    }));
  };

  const handleSubmitExam = async (isAuto = false) => {
    if (!isAuto) {
      const answered = Object.keys(selectedAnswers).length;
      const total = questions.length;
      Alert.alert(
        'Submit Official Exam',
        `You have answered ${answered} of ${total} questions. Ready to submit? This will finalize your official score.`,
        [
          { text: 'Review', style: 'cancel' },
          {
            text: 'Submit Now',
            onPress: () => processSubmission(),
          },
        ]
      );
    } else {
      processSubmission();
    }
  };

  const processSubmission = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const answersPayload = Object.entries(selectedAnswers).map(([qId, optIdx]) => ({
        questionId: qId,
        selectedOption: optIdx,
      }));

      const res = await api.post(`/exams/student/${currentExam._id}/submit`, {
        answers: answersPayload,
      });

      if (res.data?.success) {
        setExamModalVisible(false);
        const r = res.data.data;
        Alert.alert(
          r?.isPassed ? 'Exam Passed! 🎓' : 'Exam Completed',
          `Score: ${r?.score || 0}/${r?.maxScore || 100} (${r?.percentage || 0}%). Official marksheet updated.`,
          [{ text: 'OK', onPress: () => fetchExams() }]
        );
      }
    } catch (err) {
      Alert.alert('Notice', err.response?.data?.message || 'Exam response saved.');
      setExamModalVisible(false);
      fetchExams();
    } finally {
      setSubmitting(false);
    }
  };

  const currentQ = questions[currentQuestionIdx];
  const passedCount = attemptedExams.filter((e) => e.isPassed).length;
  const passRate = attemptedExams.length > 0 ? Math.round((passedCount / attemptedExams.length) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* Overview Stats Bar */}
      <View style={styles.statsCard}>
        <View style={styles.statCol}>
          <Text style={styles.statVal}>{availableExams.length}</Text>
          <Text style={styles.statLbl}>Active / Scheduled</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={styles.statVal}>{attemptedExams.length}</Text>
          <Text style={styles.statLbl}>Completed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={[styles.statVal, { color: '#16a34a' }]}>{passRate}%</Text>
          <Text style={styles.statLbl}>Pass Rate</Text>
        </View>
      </View>

      {/* Sub Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeSubTab === 'active' && styles.tabItemActive]}
          onPress={() => setActiveSubTab('active')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={activeSubTab === 'active' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeSubTab === 'active' && styles.tabTextActive]}>
            Active & Scheduled ({availableExams.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeSubTab === 'completed' && styles.tabItemActive]}
          onPress={() => setActiveSubTab('completed')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={16}
            color={activeSubTab === 'completed' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeSubTab === 'completed' && styles.tabTextActive]}>
            Official Results ({attemptedExams.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching official exams...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollInner}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        >
          {activeSubTab === 'active' && (
            <View>
              {/* Admin Notice */}
              <View style={styles.infoBanner}>
                <Ionicons name="shield-checkmark" size={20} color="#7c3aed" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.infoTitle}>Official Examinations Portal</Text>
                  <Text style={styles.infoSub}>
                    Official certification and semester exams are conducted exclusively by institute faculty. Pass records are registered on your digital marksheet.
                  </Text>
                </View>
              </View>

              {availableExams.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="school-outline" size={44} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>No Official Exams Scheduled</Text>
                  <Text style={styles.emptySub}>
                    You have no pending official exams. When your center faculty schedules an examination, it will appear here.
                  </Text>
                </View>
              ) : (
                availableExams.map((exam) => {
                  const isEligible = !exam.feeAccess || exam.feeAccess.allowed === true || exam.feeAccess.isEligible === true;
                  const isOverridden = Boolean(exam.feeAccess?.overridden);
                  const startTs = parseExamTime(exam.startTime);
                  const isUpcoming = !isNaN(startTs) && Date.now() < startTs;
                  const isLive = !isUpcoming && (exam.status === 'active' || exam.status === 'ongoing' || !isNaN(startTs));

                  return (
                    <View key={exam._id} style={styles.examCard}>
                      <View style={styles.examTopRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.courseTag}>{exam.course?.title || 'Academic Course'}</Text>
                          <Text style={styles.examTitle}>{exam.title}</Text>
                        </View>
                        <View style={[styles.statusBadge, isLive ? styles.badgeGreen : styles.badgeBlue]}>
                          <Text style={[styles.statusText, isLive ? styles.textGreen : styles.textBlue]}>
                            {isLive ? 'LIVE NOW' : 'UPCOMING'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.examMetaRow}>
                        <View style={styles.metaItem}>
                          <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                          <Text style={styles.metaText}>{exam.duration || 30} Mins</Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Ionicons name="help-circle-outline" size={13} color={colors.textSecondary} />
                          <Text style={styles.metaText}>{exam.questions?.length || 10} Questions</Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Ionicons name="trophy-outline" size={13} color={colors.textSecondary} />
                          <Text style={styles.metaText}>Pass: {exam.passPercentage || 60}%</Text>
                        </View>
                      </View>

                      {isOverridden ? (
                        <View style={[styles.feeWarning, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
                          <Ionicons name="shield-checkmark" size={14} color="#1d4ed8" />
                          <Text style={[styles.feeWarningText, { color: '#1e40af' }]}>
                            Admin granted exam access permission.
                          </Text>
                        </View>
                      ) : !isEligible ? (
                        <View style={styles.feeWarning}>
                          <Ionicons name="lock-closed" size={14} color="#b45309" />
                          <Text style={styles.feeWarningText}>
                            Installment clearance required to start this official examination.
                          </Text>
                        </View>
                      ) : null}

                      {isUpcoming ? (
                        <View style={[styles.startBtn, { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1' }]}>
                          <Ionicons name="time-outline" size={16} color="#475569" />
                          <Text style={[styles.startBtnText, { color: '#475569', fontWeight: '600' }]}>
                            Starts: {!isNaN(startTs) ? new Date(startTs).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                          </Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.startBtn, !isEligible && styles.startBtnDisabled]}
                          onPress={() => handleStartExam(exam)}
                          activeOpacity={0.85}
                        >
                          <Ionicons name={isEligible ? 'play' : 'lock-closed'} size={16} color="#ffffff" />
                          <Text style={styles.startBtnText}>
                            {isEligible ? 'Take Official Exam' : 'Fee Clearance Required'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {activeSubTab === 'completed' && (
            <View>
              {attemptedExams.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="ribbon-outline" size={44} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>No Exam Marksheets Yet</Text>
                  <Text style={styles.emptySub}>
                    Official marks and verified grades from completed exams will appear here.
                  </Text>
                </View>
              ) : (
                attemptedExams.map((r) => {
                  const isPassed = r.isPassed;
                  return (
                    <View key={r._id} style={styles.resultCard}>
                      <View style={styles.resultTopRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.courseTag}>{r.exam?.course?.title || 'Academic Course'}</Text>
                          <Text style={styles.examTitle}>{r.exam?.title || 'Official Academic Exam'}</Text>
                        </View>
                        <View style={[styles.statusBadge, isPassed ? styles.badgeGreen : styles.badgeRed]}>
                          <Text style={[styles.statusText, isPassed ? styles.textGreen : styles.textRed]}>
                            {isPassed ? 'PASSED' : 'FAILED'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.resultMetricsRow}>
                        <View style={styles.metricItem}>
                          <Text style={styles.metricNum}>{r.score || 0} / {r.maxScore || 100}</Text>
                          <Text style={styles.metricLbl}>Marks</Text>
                        </View>
                        <View style={styles.metricItem}>
                          <Text style={[styles.metricNum, { color: isPassed ? '#16a34a' : '#dc2626' }]}>
                            {r.percentage || 0}%
                          </Text>
                          <Text style={styles.metricLbl}>Percentage</Text>
                        </View>
                        <View style={styles.metricItem}>
                          <Text style={styles.metricNum}>
                            {r.completedAt ? new Date(r.completedAt).toLocaleDateString('en-GB') : 'Recorded'}
                          </Text>
                          <Text style={styles.metricLbl}>Date</Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* EXAM MODAL */}
      <Modal visible={examModalVisible} animationType="slide" onRequestClose={() => {}}>
        <SafeAreaView style={styles.modalArea}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {currentExam?.title || 'Official Exam'}
              </Text>
              <Text style={styles.modalSub}>
                Question {currentQuestionIdx + 1} of {questions.length}
              </Text>
            </View>

            <View style={styles.timerBadge}>
              <Ionicons name="timer-outline" size={16} color="#ffffff" />
              <Text style={styles.timerText}>{formatTimer(timeLeft)}</Text>
            </View>
          </View>

          <View style={styles.progTrack}>
            <View
              style={[
                styles.progFill,
                { width: `${((currentQuestionIdx + 1) / (questions.length || 1)) * 100}%` },
              ]}
            />
          </View>

          {currentQ ? (
            <ScrollView style={styles.quizScroll} contentContainerStyle={styles.quizInner}>
              <View style={styles.qBox}>
                <Text style={styles.qIndex}>QUESTION {currentQuestionIdx + 1}</Text>
                <Text style={styles.qText}>{currentQ.questionText || currentQ.question}</Text>
              </View>

              <View style={styles.optsList}>
                {(currentQ.options || []).map((opt, oIdx) => {
                  const optText = typeof opt === 'string' ? opt : opt.text || opt.option || `Option ${oIdx + 1}`;
                  const isSelected = selectedAnswers[currentQ._id] === oIdx;

                  return (
                    <TouchableOpacity
                      key={oIdx}
                      style={[styles.optItem, isSelected && styles.optItemActive]}
                      onPress={() => handleSelectOption(currentQ._id, oIdx)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.radio, isSelected && styles.radioActive]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                      <Text style={[styles.optText, isSelected && styles.optTextActive]}>{optText}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.centerBox}>
              <Text style={styles.loadingText}>No questions available.</Text>
            </View>
          )}

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.navBtn, currentQuestionIdx === 0 && styles.navBtnDisabled]}
              onPress={() => setCurrentQuestionIdx((p) => Math.max(0, p - 1))}
              disabled={currentQuestionIdx === 0}
            >
              <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
              <Text style={styles.navBtnText}>Previous</Text>
            </TouchableOpacity>

            {currentQuestionIdx < questions.length - 1 ? (
              <TouchableOpacity
                style={styles.nextBtn}
                onPress={() => setCurrentQuestionIdx((p) => Math.min(questions.length - 1, p + 1))}
              >
                <Text style={styles.nextBtnText}>Next Question</Text>
                <Ionicons name="arrow-forward" size={16} color="#ffffff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.submitBtn} onPress={() => handleSubmitExam(false)} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color="#ffffff" />
                    <Text style={styles.submitBtnText}>Submit Official Exam</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'space-around',
    ...shadows.sm,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#7c3aed',
  },
  statLbl: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: spacing.md,
    marginTop: 12,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: '#f5f3ff',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#7c3aed',
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  scrollInner: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 10,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f5f3ff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5b21b6',
  },
  infoSub: {
    fontSize: 11,
    color: '#6d28d9',
    marginTop: 2,
    lineHeight: 16,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  examCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  examTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  courseTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
    textTransform: 'uppercase',
  },
  examTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  badgeGreen: { backgroundColor: '#dcfce7' },
  badgeBlue: { backgroundColor: '#eff6ff' },
  badgeRed: { backgroundColor: '#fee2e2' },
  textGreen: { color: '#15803d' },
  textBlue: { color: '#2563eb' },
  textRed: { color: '#b91c1c' },
  examMetaRow: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    marginVertical: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  feeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: 8,
    marginVertical: 8,
  },
  feeWarningText: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '600',
    flex: 1,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
    marginTop: 6,
  },
  startBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    ...shadows.sm,
  },
  resultTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultMetricsRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    justifyContent: 'space-around',
    marginTop: 4,
  },
  metricItem: { alignItems: 'center' },
  metricNum: { fontSize: 14, fontWeight: '800', color: colors.text },
  metricLbl: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  // Modal
  modalArea: { flex: 1, backgroundColor: '#ffffff' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: '#7c3aed',
  },
  modalTitle: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  modalSub: { color: '#ede9fe', fontSize: 11, marginTop: 2 },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dc2626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timerText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  progTrack: { height: 4, backgroundColor: '#e2e8f0' },
  progFill: { height: '100%', backgroundColor: '#7c3aed' },
  quizScroll: { flex: 1 },
  quizInner: { padding: spacing.md },
  qBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  qIndex: { fontSize: 11, fontWeight: '800', color: '#7c3aed', marginBottom: 4 },
  qText: { fontSize: 15, fontWeight: '600', color: colors.text, lineHeight: 22 },
  optsList: { gap: 10 },
  optItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  optItemActive: { borderColor: '#7c3aed', backgroundColor: '#f5f3ff' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioActive: { borderColor: '#7c3aed' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#7c3aed' },
  optText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },
  optTextActive: { color: '#7c3aed', fontWeight: '700' },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7c3aed',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  nextBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
});
