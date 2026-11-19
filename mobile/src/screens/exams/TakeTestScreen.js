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

export default function TakeTestScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [testType, setTestType] = useState('full'); // 'full' | 'chapter'
  const [chapters, setChapters] = useState([]);
  const [selectedChapterId, setSelectedChapterId] = useState(null);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [testResults, setTestResults] = useState([]);

  // Quiz Runner Modal state
  const [quizModalVisible, setQuizModalVisible] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      // 1. Fetch Enrolled Courses
      try {
        const cRes = await api.get('/courses/my/enrolled');
        if (cRes.data?.success) {
          const raw = cRes.data.data || cRes.data.courses || [];
          const list = raw
            .map((item) => (item?.course && typeof item.course === 'object' ? item.course : item))
            .filter(Boolean);
          setEnrolledCourses(list);
          if (list.length > 0 && !selectedCourseId) {
            setSelectedCourseId(list[0]._id);
          }
        }
      } catch (e) {
        console.warn('Enrolled courses error:', e?.message);
      }

      // 2. Fetch Practice Test Results
      try {
        const resRes = await api.get('/tests/my-results');
        if (resRes.data?.success) {
          setTestResults(resRes.data.results || resRes.data.data || []);
        }
      } catch (e) {
        console.warn('Test results error:', e?.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load chapters when selected course changes
  useEffect(() => {
    if (!selectedCourseId) return;
    (async () => {
      try {
        const res = await api.get(`/chapters?course=${selectedCourseId}`);
        if (res.data?.chapters && res.data.chapters.length > 0) {
          setChapters(res.data.chapters);
          setSelectedChapterId(res.data.chapters[0]._id);
        } else {
          const currentCourse = enrolledCourses.find((c) => c._id === selectedCourseId);
          if (currentCourse?.curriculum && Array.isArray(currentCourse.curriculum)) {
            setChapters(currentCourse.curriculum);
            setSelectedChapterId(currentCourse.curriculum[0]?._id);
          } else {
            setChapters([]);
            setSelectedChapterId(null);
          }
        }
      } catch {
        setChapters([]);
      }
    })();
  }, [selectedCourseId, enrolledCourses]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleStartTest = async () => {
    if (!selectedCourseId) {
      Alert.alert('Selection Required', 'Please select a course to start your test.');
      return;
    }

    setPracticeLoading(true);
    try {
      const params = {
        testType,
        course: selectedCourseId,
      };
      if (testType === 'chapter' && selectedChapterId) {
        params.chapter = selectedChapterId;
      }

      const res = await api.get('/mcqs/test', { params });
      const mcqs = res.data?.mcqs || [];

      if (mcqs.length === 0) {
        Alert.alert(
          'No Questions Available',
          'Academic trainers have not yet added MCQs for this specific module. Please try the Full Course Test.'
        );
        return;
      }

      const selCourse = enrolledCourses.find((c) => c._id === selectedCourseId);
      const title = `${selCourse?.title || 'Course'} - ${testType === 'full' ? 'Full Syllabus Test' : 'Chapter Quiz'}`;

      setQuizTitle(title);
      setQuizQuestions(mcqs);
      setCurrentQuestionIdx(0);
      setSelectedAnswers({});
      setTimeLeft(Math.min(mcqs.length * 90, 3600)); // 90 secs per question
      setQuizModalVisible(true);
    } catch (err) {
      Alert.alert('Test Error', err.response?.data?.message || 'Unable to load test questions.');
    } finally {
      setPracticeLoading(false);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (quizModalVisible && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmitTest(true);
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
  }, [quizModalVisible, timeLeft]);

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

  const handleSubmitTest = async (isAuto = false) => {
    if (!isAuto) {
      const answered = Object.keys(selectedAnswers).length;
      const total = quizQuestions.length;
      Alert.alert(
        'Submit Test',
        `You have answered ${answered} of ${total} questions. Are you ready to submit your test?`,
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
      const answersPayload = quizQuestions.map((q) => ({
        question: q._id,
        selectedOption: selectedAnswers[q._id] !== undefined ? selectedAnswers[q._id] : -1,
      }));

      const res = await api.post('/tests/submit', {
        testType,
        course: selectedCourseId,
        chapter: testType === 'chapter' ? selectedChapterId : null,
        answers: answersPayload,
        totalTimeTaken: 60,
      });

      if (res.data?.success) {
        setQuizModalVisible(false);
        const r = res.data.data || res.data;
        Alert.alert(
          r?.percentage >= 60 ? 'Test Passed! 🎉' : 'Test Completed',
          `Score: ${r?.score || 0}/${quizQuestions.length} (${r?.percentage || 0}%). ${
            r?.percentage >= 60 ? 'Great performance! Your score has been recorded.' : 'Review concepts and try again.'
          }`,
          [{ text: 'OK', onPress: () => loadData() }]
        );
      }
    } catch (err) {
      Alert.alert('Notice', err.response?.data?.message || 'Test recorded.');
      setQuizModalVisible(false);
      loadData();
    } finally {
      setSubmitting(false);
    }
  };

  const currentQ = quizQuestions[currentQuestionIdx];
  const passedCount = testResults.filter((r) => (r.percentage || 0) >= 60).length;
  const passRate = testResults.length > 0 ? Math.round((passedCount / testResults.length) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* Overview Stats Bar */}
      <View style={styles.statsCard}>
        <View style={styles.statCol}>
          <Text style={styles.statVal}>{enrolledCourses.length}</Text>
          <Text style={styles.statLbl}>Active Courses</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={styles.statVal}>{testResults.length}</Text>
          <Text style={styles.statLbl}>Tests Taken</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={[styles.statVal, { color: '#16a34a' }]}>{passRate}%</Text>
          <Text style={styles.statLbl}>Pass Rate</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading practice tests...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollInner}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        >
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={20} color="#2563eb" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.infoTitle}>Self-Practice Assessments (24/7)</Text>
              <Text style={styles.infoSub}>
                Take practice tests anytime on your enrolled courses. Questions evaluate your core concepts and provide instant scoring.
              </Text>
            </View>
          </View>

          {/* 1. Select Course */}
          <Text style={styles.sectionHeading}>1. Select Enrolled Course</Text>
          {enrolledCourses.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="book-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Enrolled Courses</Text>
              <Text style={styles.emptySub}>Please enroll in a course to take practice tests.</Text>
            </View>
          ) : (
            <View style={styles.coursePillsList}>
              {enrolledCourses.map((c) => {
                const isSelected = selectedCourseId === c._id;
                return (
                  <TouchableOpacity
                    key={c._id}
                    style={[styles.coursePill, isSelected && styles.coursePillActive]}
                    onPress={() => setSelectedCourseId(c._id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'book-outline'}
                      size={15}
                      color={isSelected ? '#ffffff' : colors.primary}
                    />
                    <Text style={[styles.coursePillText, isSelected && styles.coursePillTextActive]} numberOfLines={1}>
                      {c.title || c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* 2. Test Scope */}
          <Text style={styles.sectionHeading}>2. Assessment Scope</Text>
          <View style={styles.typeSelectorRow}>
            <TouchableOpacity
              style={[styles.typeCard, testType === 'full' && styles.typeCardActive]}
              onPress={() => setTestType('full')}
              activeOpacity={0.8}
            >
              <View style={[styles.typeIconBox, testType === 'full' && styles.typeIconBoxActive]}>
                <Ionicons name="trophy-outline" size={20} color={testType === 'full' ? '#ffffff' : colors.primary} />
              </View>
              <Text style={styles.typeTitle}>Full Course Test</Text>
              <Text style={styles.typeSub}>Comprehensive test on all course chapters</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeCard, testType === 'chapter' && styles.typeCardActive]}
              onPress={() => setTestType('chapter')}
              activeOpacity={0.8}
            >
              <View style={[styles.typeIconBox, testType === 'chapter' && styles.typeIconBoxActive]}>
                <Ionicons name="layers-outline" size={20} color={testType === 'chapter' ? '#ffffff' : colors.primary} />
              </View>
              <Text style={styles.typeTitle}>Chapter Test</Text>
              <Text style={styles.typeSub}>Targeted quiz on a specific chapter module</Text>
            </TouchableOpacity>
          </View>

          {/* 3. Chapter Selector if Chapter Test is active */}
          {testType === 'chapter' && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.sectionHeading}>3. Select Chapter</Text>
              {chapters.length === 0 ? (
                <Text style={styles.noChaptersText}>
                  No chapters defined for this course yet. Please choose Full Course Test.
                </Text>
              ) : (
                <View style={styles.chaptersList}>
                  {chapters.map((ch, idx) => {
                    const isSelected = selectedChapterId === ch._id;
                    return (
                      <TouchableOpacity
                        key={ch._id || idx}
                        style={[styles.chapterPill, isSelected && styles.chapterPillActive]}
                        onPress={() => setSelectedChapterId(ch._id)}
                      >
                        <Text style={[styles.chapterPillText, isSelected && styles.chapterPillTextActive]}>
                          Ch {idx + 1}: {ch.title || ch.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Start Test Action */}
          <TouchableOpacity
            style={[styles.startBtn, (practiceLoading || enrolledCourses.length === 0) && { opacity: 0.6 }]}
            onPress={handleStartTest}
            disabled={practiceLoading || enrolledCourses.length === 0}
            activeOpacity={0.85}
          >
            {practiceLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="play" size={18} color="#ffffff" />
                <Text style={styles.startBtnText}>Start Practice Test Now</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Past Practice Test Results */}
          <View style={styles.resultsHeaderRow}>
            <Text style={styles.sectionHeading}>Recent Test Results</Text>
            <Text style={styles.countText}>{testResults.length} records</Text>
          </View>

          {testResults.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="ribbon-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Test Attempts Yet</Text>
              <Text style={styles.emptySub}>Your practice test scores and accuracy will appear here.</Text>
            </View>
          ) : (
            testResults.slice(0, 10).map((r) => {
              const isPassed = (r.percentage || 0) >= 60;
              return (
                <View key={r._id} style={styles.resultCard}>
                  <View style={styles.resultTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultCourseName}>
                        {r.course?.title || (r.testType === 'full' ? 'Full Course Assessment' : 'Chapter Quiz')}
                      </Text>
                      <Text style={styles.resultDate}>
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB') : 'Recorded'}
                      </Text>
                    </View>
                    <View style={[styles.badge, isPassed ? styles.badgeGreen : styles.badgeRed]}>
                      <Text style={[styles.badgeText, isPassed ? styles.textGreen : styles.textRed]}>
                        {isPassed ? 'PASSED' : 'NEEDS PRACTICE'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.resultMetrics}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricNum}>{r.score || 0}</Text>
                      <Text style={styles.metricLbl}>Score</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={[styles.metricNum, { color: isPassed ? '#16a34a' : '#dc2626' }]}>
                        {r.percentage || 0}%
                      </Text>
                      <Text style={styles.metricLbl}>Percentage</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricNum}>
                        {r.totalQuestions || (r.answers ? r.answers.length : 10)}
                      </Text>
                      <Text style={styles.metricLbl}>Questions</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* QUIZ RUNNER MODAL */}
      <Modal visible={quizModalVisible} animationType="slide" onRequestClose={() => {}}>
        <SafeAreaView style={styles.modalArea}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {quizTitle}
              </Text>
              <Text style={styles.modalSub}>
                Question {currentQuestionIdx + 1} of {quizQuestions.length}
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
                { width: `${((currentQuestionIdx + 1) / (quizQuestions.length || 1)) * 100}%` },
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

            {currentQuestionIdx < quizQuestions.length - 1 ? (
              <TouchableOpacity
                style={styles.nextBtn}
                onPress={() => setCurrentQuestionIdx((p) => Math.min(quizQuestions.length - 1, p + 1))}
              >
                <Text style={styles.nextBtnText}>Next Question</Text>
                <Ionicons name="arrow-forward" size={16} color="#ffffff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.submitBtn} onPress={() => handleSubmitTest(false)} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color="#ffffff" />
                    <Text style={styles.submitBtnText}>Submit Test</Text>
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
    color: colors.primary,
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
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e40af',
  },
  infoSub: {
    fontSize: 11,
    color: '#3b82f6',
    marginTop: 2,
    lineHeight: 16,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coursePillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  coursePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
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
    fontWeight: '700',
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  typeCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  typeCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  typeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  typeIconBoxActive: {
    backgroundColor: colors.primary,
  },
  typeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  typeSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 14,
  },
  chaptersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  chapterPill: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chapterPillActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
  },
  chapterPillText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chapterPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  noChaptersText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
    ...shadows.sm,
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 8,
  },
  countText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 24,
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
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    ...shadows.sm,
  },
  resultTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultCourseName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  resultDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeGreen: { backgroundColor: '#dcfce7' },
  badgeRed: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 10, fontWeight: '800' },
  textGreen: { color: '#15803d' },
  textRed: { color: '#b91c1c' },
  resultMetrics: {
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
    backgroundColor: '#1e3a8a',
  },
  modalTitle: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  modalSub: { color: '#bfdbfe', fontSize: 11, marginTop: 2 },
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
  progFill: { height: '100%', backgroundColor: colors.primary },
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
  qIndex: { fontSize: 11, fontWeight: '800', color: colors.primary, marginBottom: 4 },
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
  optItemActive: { borderColor: colors.primary, backgroundColor: '#eff6ff' },
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
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  optText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },
  optTextActive: { color: colors.primary, fontWeight: '700' },
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
    backgroundColor: colors.primary,
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
