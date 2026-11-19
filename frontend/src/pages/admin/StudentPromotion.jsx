import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  FiUsers,
  FiArrowRight,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiAward,
  FiLayers,
  FiRefreshCw,
  FiRotateCcw,
  FiInfo
} from 'react-icons/fi';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import {
  StatCard,
  Button,
  PageLoading,
  Card,
  SelectField,
  Badge,
  TableWrapper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
  TableEmpty
} from '../../components/ui';
import api from '../../api/axios';

const StudentPromotion = () => {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);

  // Filter selections
  const [previousSessionId, setPreviousSessionId] = useState('');
  const [nextSessionId, setNextSessionId] = useState('');
  const [fromClassId, setFromClassId] = useState('');
  const [toClassId, setToClassId] = useState('');

  // Eligible students and decisions
  const [students, setStudents] = useState([]);
  const [promotions, setPromotions] = useState({}); // { [studentId]: { decision: 'promoted', targetSectionId: '', remarks: '' } }
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [submittingBatch, setSubmittingBatch] = useState(false);

  // History tab
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('rollover'); // 'rollover' | 'history'

  useEffect(() => {
    fetchPrerequisites();
  }, []);

  const fetchPrerequisites = async () => {
    try {
      setLoading(true);
      const [sessionsRes, classesRes, historyRes] = await Promise.allSettled([
        api.get('/academics/sessions'),
        api.get('/academics/classes'),
        api.get('/promotions/history')
      ]);

      const sessList = sessionsRes.status === 'fulfilled' ? (sessionsRes.value.data?.data || []) : [];
      setSessions(sessList);

      const currentSess = sessList.find((s) => s.isCurrent) || sessList[0];
      if (currentSess) {
        setPreviousSessionId(currentSess._id);
        const nextCandidate = sessList.find((s) => s._id !== currentSess._id);
        if (nextCandidate) setNextSessionId(nextCandidate._id);
      }

      const clsList = classesRes.status === 'fulfilled' ? (classesRes.value.data?.data || []) : [];
      setClasses(clsList);
      if (clsList.length > 0) {
        setFromClassId(clsList[0]._id);
        if (clsList.length > 1) setToClassId(clsList[1]._id);
      }

      if (historyRes.status === 'fulfilled') {
        setHistory(historyRes.value.data?.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load academic setup data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fromClassId) {
      fetchSectionsForClass(fromClassId);
    }
  }, [fromClassId]);

  const fetchSectionsForClass = async (classId) => {
    try {
      const res = await api.get(`/academics/sections?schoolClass=${classId}`);
      setSections(res.data?.data || []);
    } catch (e) {
      setSections([]);
    }
  };

  const handleLoadStudents = async () => {
    if (!previousSessionId || !fromClassId) {
      toast.warning('Please select previous academic session and current class');
      return;
    }

    try {
      setFetchingStudents(true);
      const res = await api.get('/promotions/eligible-students', {
        params: {
          sessionId: previousSessionId,
          classId: fromClassId
        }
      });

      const list = res.data?.data || [];
      setStudents(list);

      if (res.data?.suggestedNextClass?._id) {
        setToClassId(res.data.suggestedNextClass._id);
      }

      // Initialize promotion state
      const initialMap = {};
      list.forEach((st) => {
        initialMap[st._id] = {
          decision: st.suggestedDecision || 'promoted',
          targetSectionId: st.currentSection?._id || '',
          remarks: ''
        };
      });
      setPromotions(initialMap);

      if (list.length === 0) {
        toast.info('No active students found in this class');
      } else {
        toast.success(`Loaded ${list.length} enrolled students`);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to fetch enrolled students');
      setStudents([]);
    } finally {
      setFetchingStudents(false);
    }
  };

  const handleDecisionChange = (studentId, decision) => {
    setPromotions((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        decision
      }
    }));
  };

  const handleSectionChange = (studentId, sectionId) => {
    setPromotions((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        targetSectionId: sectionId
      }
    }));
  };

  const handleBulkSetDecision = (decision) => {
    setPromotions((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = { ...updated[id], decision };
      });
      return updated;
    });
    toast.info(`Set all decisions to "${decision.toUpperCase()}"`);
  };

  const handleProcessRollover = async () => {
    if (!previousSessionId || !nextSessionId) {
      toast.error('Please specify both source and target academic sessions');
      return;
    }

    if (previousSessionId === nextSessionId) {
      toast.error('Source and target academic sessions cannot be the same');
      return;
    }

    if (!fromClassId) {
      toast.error('Please specify current class');
      return;
    }

    const payloadList = students.map((st) => ({
      studentId: st._id,
      decision: promotions[st._id]?.decision || 'promoted',
      targetClassId: promotions[st._id]?.decision === 'promoted' ? toClassId : fromClassId,
      targetSectionId: promotions[st._id]?.targetSectionId || undefined,
      remarks: promotions[st._id]?.remarks || ''
    }));

    if (payloadList.length === 0) {
      toast.warning('No students selected for promotion');
      return;
    }

    const confirmed = window.confirm(
      `Confirm academic rollover for ${payloadList.length} students?\n\nTarget Session: ${
        sessions.find((s) => s._id === nextSessionId)?.sessionName || ''
      }\nTarget Class: ${classes.find((c) => c._id === toClassId)?.name || ''}`
    );
    if (!confirmed) return;

    try {
      setSubmittingBatch(true);
      const res = await api.post('/promotions/process-batch', {
        previousSessionId,
        nextSessionId,
        fromClassId,
        toClassId,
        promotions: payloadList
      });

      toast.success(res.data?.message || 'Promotion batch executed successfully!');
      // Refresh history and reset student list
      handleLoadStudents();
      api.get('/promotions/history').then((h) => setHistory(h.data?.data || []));
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to process promotion batch');
    } finally {
      setSubmittingBatch(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Student Promotion & Rollover" subtitle="Academic year transition management" icon={FiLayers} />
        <PageLoading message="Loading academic setup..." />
      </Layout>
    );
  }

  const promotedCount = Object.values(promotions).filter((p) => p.decision === 'promoted').length;
  const detainedCount = Object.values(promotions).filter((p) => p.decision === 'detained').length;
  const compartmentCount = Object.values(promotions).filter((p) => p.decision === 'compartment').length;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Student Promotion & Academic Rollover"
          subtitle="Manage student progression, detention, and class transitions across academic sessions"
          icon={FiLayers}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant={activeTab === 'rollover' ? 'primary' : 'secondary'}
                onClick={() => setActiveTab('rollover')}
              >
                Promotion Rollover
              </Button>
              <Button
                variant={activeTab === 'history' ? 'primary' : 'secondary'}
                onClick={() => setActiveTab('history')}
              >
                Batch Logs ({history.length})
              </Button>
            </div>
          }
        />

        {activeTab === 'rollover' ? (
          <>
            {/* Session & Class Configuration Strip */}
            <Card>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <SelectField
                  label="From Academic Session"
                  value={previousSessionId}
                  onChange={(e) => setPreviousSessionId(e.target.value)}
                >
                  <option value="">Select Previous Session</option>
                  {sessions.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.sessionName} {s.isCurrent ? '(Active)' : ''}
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  label="To Academic Session"
                  value={nextSessionId}
                  onChange={(e) => setNextSessionId(e.target.value)}
                >
                  <option value="">Select Next Session</option>
                  {sessions.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.sessionName}
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  label="From Class"
                  value={fromClassId}
                  onChange={(e) => setFromClassId(e.target.value)}
                >
                  <option value="">Select Current Class</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  label="Promote To Class"
                  value={toClassId}
                  onChange={(e) => setToClassId(e.target.value)}
                >
                  <option value="">Select Next Class</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <FiInfo className="text-primary-600" />
                  <span>
                    Historical grades, report cards, and fee ledgers will be permanently preserved in the source session.
                  </span>
                </div>
                <Button
                  variant="primary"
                  icon={FiRefreshCw}
                  onClick={handleLoadStudents}
                  loading={fetchingStudents}
                >
                  Fetch Enrolled Students
                </Button>
              </div>
            </Card>

            {/* Metrics Ribbon */}
            {students.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Total Enrolled" tone="info" icon={FiUsers} value={students.length} />
                <StatCard title="Promoting" tone="success" icon={FiCheckCircle} value={promotedCount} />
                <StatCard title="Detaining" tone="danger" icon={FiAlertCircle} value={detainedCount} />
                <StatCard title="Compartment / Hold" tone="warning" icon={FiClock} value={compartmentCount} />
              </div>
            )}

            {/* Students Table */}
            {students.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">Bulk Decisions:</span>
                    <button
                      type="button"
                      onClick={() => handleBulkSetDecision('promoted')}
                      className="text-xs font-semibold px-2.5 py-1 bg-success-50 text-success-700 rounded-lg hover:bg-success-100"
                    >
                      All Promoted
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkSetDecision('detained')}
                      className="text-xs font-semibold px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg hover:bg-rose-100"
                    >
                      All Detained
                    </button>
                  </div>

                  <Button
                    variant="success"
                    icon={FiArrowRight}
                    onClick={handleProcessRollover}
                    loading={submittingBatch}
                  >
                    Execute Promotion Batch ({promotedCount} to {classes.find((c) => c._id === toClassId)?.name || 'Next Class'})
                  </Button>
                </div>

                <TableWrapper>
                  <Table>
                    <TableHead>
                      <tr>
                        <TableHeader>Student</TableHeader>
                        <TableHeader>Admission No</TableHeader>
                        <TableHeader>Current Class</TableHeader>
                        <TableHeader>Academic Score</TableHeader>
                        <TableHeader>Promotion Decision</TableHeader>
                        <TableHeader>Target Section</TableHeader>
                      </tr>
                    </TableHead>
                    <TableBody>
                      {students.map((st) => {
                        const currentDecision = promotions[st._id]?.decision || 'promoted';
                        return (
                          <TableRow key={st._id}>
                            <TableCell>
                              <div className="font-semibold text-slate-900">{st.name}</div>
                              <div className="text-xs text-slate-500">Roll #{st.rollNumber || 'N/A'}</div>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-xs">{st.admissionNumber || st.enrollmentNumber}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="neutral">
                                {st.currentClass?.name || 'Class'} {st.currentSection?.name ? `- ${st.currentSection.name}` : ''}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-800">{st.percentage}%</span>
                                <Badge variant={st.percentage >= 33 ? 'success' : 'danger'}>
                                  Grade {st.grade}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <select
                                value={currentDecision}
                                onChange={(e) => handleDecisionChange(st._id, e.target.value)}
                                className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 border transition ${
                                  currentDecision === 'promoted'
                                    ? 'bg-success-50 border-success-200 text-success-800'
                                    : currentDecision === 'detained'
                                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                                    : 'bg-amber-50 border-amber-200 text-amber-800'
                                }`}
                              >
                                <option value="promoted">Promoted</option>
                                <option value="detained">Detained (Retained)</option>
                                <option value="compartment">Compartment</option>
                                <option value="graduated">Graduated (Alumni)</option>
                                <option value="withdrawn">Withdrawn</option>
                              </select>
                            </TableCell>
                            <TableCell>
                              <select
                                value={promotions[st._id]?.targetSectionId || ''}
                                onChange={(e) => handleSectionChange(st._id, e.target.value)}
                                className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5"
                              >
                                <option value="">Auto Section</option>
                                {sections.map((sec) => (
                                  <option key={sec._id} value={sec._id}>
                                    Section {sec.name}
                                  </option>
                                ))}
                              </select>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableWrapper>
              </div>
            )}

            {students.length === 0 && (
              <TableEmpty
                icon={FiLayers}
                title="No students loaded"
                description="Select academic sessions and class above, then click 'Fetch Enrolled Students'."
              />
            )}
          </>
        ) : (
          /* Promotion History Tab */
          <TableWrapper>
            <Table>
              <TableHead>
                <tr>
                  <TableHeader>Batch Number</TableHeader>
                  <TableHeader>Date</TableHeader>
                  <TableHeader>Sessions Transition</TableHeader>
                  <TableHeader>Classes Rollover</TableHeader>
                  <TableHeader>Total</TableHeader>
                  <TableHeader>Promoted</TableHeader>
                  <TableHeader>Detained</TableHeader>
                  <TableHeader>Status</TableHeader>
                </tr>
              </TableHead>
              <TableBody>
                {history.length === 0 ? (
                  <TableEmpty colSpan={8} title="No promotion history found" description="Completed academic rollover batches will appear here." />
                ) : (
                  history.map((h) => (
                    <TableRow key={h._id}>
                      <TableCell>
                        <span className="font-mono text-xs font-semibold text-primary-700">{h.batchNumber}</span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {h.promotionDate ? new Date(h.promotionDate).toLocaleDateString('en-IN') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
                          <span>{h.previousSession?.sessionName}</span>
                          <FiArrowRight className="text-slate-400" />
                          <span className="text-primary-700">{h.nextSession?.sessionName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span>{h.fromClass?.name}</span>
                          <FiArrowRight className="text-slate-400" />
                          <span className="font-semibold text-slate-900">{h.toClass?.name || 'Same Class'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{h.totalStudents}</TableCell>
                      <TableCell>
                        <Badge variant="success">{h.promotedCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={h.detainedCount > 0 ? 'danger' : 'neutral'}>{h.detainedCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={h.status === 'completed' ? 'primary' : 'warning'}>
                          {h.status?.toUpperCase() || 'COMPLETED'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableWrapper>
        )}
      </div>
    </Layout>
  );
};

export default StudentPromotion;
