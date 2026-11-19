import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import SubNavTabs from '../../components/SubNavTabs';
import {
  FiCalendar, FiLayers, FiBookOpen, FiShield, FiPlus,
  FiEdit2, FiTrash2, FiCheckCircle, FiRefreshCw, FiZap
} from 'react-icons/fi';
import academicApi from '../../api/academicApi';
import {
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge, IconButton
} from '../../components/ui';

const AcademicSetup = ({ defaultTab }) => {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const getInitialTab = () => {
    if (defaultTab) return defaultTab;
    const tabParam = searchParams.get('tab');
    if (tabParam && ['sessions', 'classes', 'subjects', 'houses'].includes(tabParam)) return tabParam;
    if (location.pathname.includes('/classes')) return 'classes';
    if (location.pathname.includes('/sections')) return 'classes';
    if (location.pathname.includes('/academic-years')) return 'sessions';
    if (location.pathname.includes('/subjects')) return 'subjects';
    return 'classes';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [loading, setLoading] = useState(true);

  // Data states
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [houses, setHouses] = useState([]);

  // Modal states
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showHouseModal, setShowHouseModal] = useState(false);
  const [seedingLoading, setSeedingLoading] = useState(false);

  // Selected item for modal
  const [selectedClassForSection, setSelectedClassForSection] = useState(null);

  // Form states
  const [sessionForm, setSessionForm] = useState({ sessionName: '', startDate: '', endDate: '', isCurrent: false });
  const [classForm, setClassForm] = useState({ name: '', code: '', order: 1 });
  const [sectionForm, setSectionForm] = useState({ name: '', capacity: 40, roomNumber: '' });
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', subjectType: 'theory', maxMarks: 100, passMarks: 33 });
  const [houseForm, setHouseForm] = useState({ name: '', code: '', color: '#3B82F6', motto: '' });

  useEffect(() => {
    loadAllAcademicData();
  }, []);

  const loadAllAcademicData = async () => {
    setLoading(true);
    try {
      const [sessRes, clsRes, subRes, houseRes] = await Promise.all([
        academicApi.getSessions(),
        academicApi.getClasses(),
        academicApi.getSubjects(),
        academicApi.getHouses()
      ]);
      setSessions(sessRes?.data?.data || []);
      setClasses(clsRes?.data?.data || []);
      setSubjects(subRes?.data?.data || []);
      setHouses(houseRes?.data?.data || []);
    } catch (err) {
      toast.error('Failed to load academic masters');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Seed School Defaults Handler
  const handleSeedDefaults = async () => {
    if (!window.confirm('This will provision the standard K-12 academic structure (Nursery to Class 12, Sections A-B, Core Subjects, and 4 Houses). Existing records will be preserved. Proceed?')) {
      return;
    }
    setSeedingLoading(true);
    try {
      const res = await academicApi.seedSchoolDefaults({});
      toast.success(res?.data?.message || 'Default academic structure created successfully!');
      await loadAllAcademicData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error provisioning defaults');
    } finally {
      setSeedingLoading(false);
    }
  };

  // Handlers for Academic Session
  const handleCreateSession = async (e) => {
    e.preventDefault();
    try {
      await academicApi.createSession(sessionForm);
      toast.success('Academic session created');
      setShowSessionModal(false);
      setSessionForm({ sessionName: '', startDate: '', endDate: '', isCurrent: false });
      loadAllAcademicData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create session');
    }
  };

  const handleDeleteSession = async (id) => {
    if (!window.confirm('Delete this academic session?')) return;
    try {
      await academicApi.deleteSession(id);
      toast.success('Session deleted');
      loadAllAcademicData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error deleting session');
    }
  };

  // Handlers for School Class
  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      await academicApi.createClass(classForm);
      toast.success('Class created with default Section A');
      setShowClassModal(false);
      setClassForm({ name: '', code: '', order: classes.length + 1 });
      loadAllAcademicData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create class');
    }
  };

  const handleDeleteClass = async (id) => {
    if (!window.confirm('Delete this class and its sections?')) return;
    try {
      await academicApi.deleteClass(id);
      toast.success('Class removed');
      loadAllAcademicData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error removing class');
    }
  };

  // Handlers for Section
  const handleCreateSection = async (e) => {
    e.preventDefault();
    if (!selectedClassForSection) return;
    try {
      await academicApi.createSection({
        ...sectionForm,
        schoolClass: selectedClassForSection._id
      });
      toast.success('Section added');
      setShowSectionModal(false);
      setSectionForm({ name: '', capacity: 40, roomNumber: '' });
      loadAllAcademicData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add section');
    }
  };

  const handleDeleteSection = async (id) => {
    if (!window.confirm('Delete this section?')) return;
    try {
      await academicApi.deleteSection(id);
      toast.success('Section removed');
      loadAllAcademicData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error removing section');
    }
  };

  // Handlers for Subject
  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      await academicApi.createSubject(subjectForm);
      toast.success('Subject created');
      setShowSubjectModal(false);
      setSubjectForm({ name: '', code: '', subjectType: 'theory', maxMarks: 100, passMarks: 33 });
      loadAllAcademicData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create subject');
    }
  };

  const handleDeleteSubject = async (id) => {
    if (!window.confirm('Delete this subject?')) return;
    try {
      await academicApi.deleteSubject(id);
      toast.success('Subject removed');
      loadAllAcademicData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error removing subject');
    }
  };

  // Handlers for House
  const handleCreateHouse = async (e) => {
    e.preventDefault();
    try {
      await academicApi.createHouse(houseForm);
      toast.success('House created');
      setShowHouseModal(false);
      setHouseForm({ name: '', code: '', color: '#3B82F6', motto: '' });
      loadAllAcademicData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create house');
    }
  };

  const handleDeleteHouse = async (id) => {
    if (!window.confirm('Delete this house?')) return;
    try {
      await academicApi.deleteHouse(id);
      toast.success('House removed');
      loadAllAcademicData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error removing house');
    }
  };

  return (
    <Layout>
      <div className="space-y-6 pb-12">
        <PageHeader
          title="Academic Setup & Masters"
          subtitle="Configure academic years, class grades, sections, subjects, and student houses for your school."
        >
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSeedDefaults}
              disabled={seedingLoading}
              className="inline-flex items-center px-4 py-2 border border-primary-600 rounded-lg shadow-sm text-sm font-medium text-primary-600 bg-white hover:bg-primary-50 transition-colors"
            >
              <FiZap className={`w-4 h-4 mr-2 ${seedingLoading ? 'animate-spin' : 'text-amber-500'}`} />
              {seedingLoading ? 'Provisioning...' : 'Quick Seed K-12 Hierarchy'}
            </button>
            <button
              onClick={loadAllAcademicData}
              className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              title="Refresh"
            >
              <FiRefreshCw className="w-4 h-4" />
            </button>
          </div>
        </PageHeader>

        {/* Tab Navigation */}
        <SubNavTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: 'classes', label: 'Classes & Sections', icon: FiLayers, badge: classes.length },
            { id: 'sessions', label: 'Academic Sessions', icon: FiCalendar, badge: sessions.length },
            { id: 'subjects', label: 'Subjects', icon: FiBookOpen, badge: subjects.length },
            { id: 'houses', label: 'Houses', icon: FiShield, badge: houses.length }
          ]}
        />

        {/* Tab 1: Classes & Sections */}
        {activeTab === 'classes' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-800">School Classes & Assigned Sections</h3>
                <p className="text-sm text-gray-500">Configure standard grades (Nursery to 12th) and their divisions.</p>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  setClassForm({ name: '', code: '', order: classes.length + 1 });
                  setShowClassModal(true);
                }}
              >
                <FiPlus className="w-4 h-4 mr-2" /> Add Class
              </Button>
            </div>

            {classes.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-xl border border-gray-100 shadow-sm">
                <FiLayers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h4 className="text-base font-semibold text-gray-700">No classes configured yet</h4>
                <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-4">
                  Add grade levels manually or click "Quick Seed K-12 Hierarchy" to auto-create standard school grades.
                </p>
                <Button variant="primary" onClick={handleSeedDefaults}>
                  <FiZap className="w-4 h-4 mr-2 text-amber-400" /> Auto-Seed Standard K-12 Classes
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {classes.map((cls) => (
                  <div key={cls._id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow transition-shadow p-5">
                    <div className="flex justify-between items-start pb-3 border-b border-gray-100">
                      <div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                          {cls.code || `GRADE ${cls.order}`}
                        </span>
                        <h4 className="text-lg font-bold text-gray-800 mt-1">{cls.name}</h4>
                      </div>
                      <IconButton
                        icon={FiTrash2}
                        onClick={() => handleDeleteClass(cls._id)}
                        className="text-gray-400 hover:text-red-600"
                        title="Delete Class"
                      />
                    </div>

                    {/* Sections list */}
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Sections</span>
                        <button
                          onClick={() => {
                            setSelectedClassForSection(cls);
                            setSectionForm({ name: '', capacity: 40, roomNumber: '' });
                            setShowSectionModal(true);
                          }}
                          className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center"
                        >
                          <FiPlus className="w-3 h-3 mr-1" /> Add Section
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {(cls.sections || []).length === 0 ? (
                          <span className="text-xs text-gray-400 italic">No sections configured</span>
                        ) : (
                          cls.sections.map((sec) => (
                            <div
                              key={sec._id}
                              className="group flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700 hover:border-primary-400 transition-colors"
                            >
                              <span>Sec {sec.name}</span>
                              <span className="text-gray-400 font-normal">({sec.capacity || 40})</span>
                              <button
                                onClick={() => handleDeleteSection(sec._id)}
                                className="text-gray-300 hover:text-red-500 transition-colors"
                                title="Remove Section"
                              >
                                &times;
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Academic Sessions */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-800">Academic Sessions</h3>
                <p className="text-sm text-gray-500">Manage school academic years, term timelines, and active sessions.</p>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  setSessionForm({ sessionName: '', startDate: '', endDate: '', isCurrent: false });
                  setShowSessionModal(true);
                }}
              >
                <FiPlus className="w-4 h-4 mr-2" /> Add Session
              </Button>
            </div>

            <TableWrapper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Session Name</TableHeader>
                    <TableHeader>Start Date</TableHeader>
                    <TableHeader>End Date</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader className="text-right">Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessions.length === 0 ? (
                    <TableEmpty colSpan={5} message="No academic sessions found" />
                  ) : (
                    sessions.map((sess) => (
                      <TableRow key={sess._id}>
                        <TableCell className="font-semibold text-gray-800">
                          {sess.sessionName}
                          {sess.isCurrent && (
                            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                              Active / Current
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{new Date(sess.startDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(sess.endDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <StatusBadge status={sess.status || 'active'} />
                        </TableCell>
                        <TableCell className="text-right">
                          <IconButton
                            icon={FiTrash2}
                            onClick={() => handleDeleteSession(sess._id)}
                            className="text-gray-400 hover:text-red-600"
                            title="Delete Session"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableWrapper>
          </div>
        )}

        {/* Tab 3: Subjects */}
        {activeTab === 'subjects' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-800">Subject Master Catalog</h3>
                <p className="text-sm text-gray-500">Define theory, practical, and activity subjects across school classes.</p>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  setSubjectForm({ name: '', code: '', subjectType: 'theory', maxMarks: 100, passMarks: 33 });
                  setShowSubjectModal(true);
                }}
              >
                <FiPlus className="w-4 h-4 mr-2" /> Add Subject
              </Button>
            </div>

            <TableWrapper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Subject Code</TableHeader>
                    <TableHeader>Subject Name</TableHeader>
                    <TableHeader>Type</TableHeader>
                    <TableHeader>Max Marks</TableHeader>
                    <TableHeader>Pass Marks</TableHeader>
                    <TableHeader className="text-right">Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {subjects.length === 0 ? (
                    <TableEmpty colSpan={6} message="No subjects configured yet" />
                  ) : (
                    subjects.map((sub) => (
                      <TableRow key={sub._id}>
                        <TableCell className="font-mono text-xs font-semibold text-primary-600">
                          {sub.code}
                        </TableCell>
                        <TableCell className="font-semibold text-gray-800">{sub.name}</TableCell>
                        <TableCell>
                          <span className="capitalize px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {sub.subjectType}
                          </span>
                        </TableCell>
                        <TableCell>{sub.maxMarks || 100}</TableCell>
                        <TableCell>{sub.passMarks || 33}</TableCell>
                        <TableCell className="text-right">
                          <IconButton
                            icon={FiTrash2}
                            onClick={() => handleDeleteSubject(sub._id)}
                            className="text-gray-400 hover:text-red-600"
                            title="Delete Subject"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableWrapper>
          </div>
        )}

        {/* Tab 4: Houses */}
        {activeTab === 'houses' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-800">Student Houses</h3>
                <p className="text-sm text-gray-500">Configure school houses for sports, cultural activities, and student discipline.</p>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  setHouseForm({ name: '', code: '', color: '#3B82F6', motto: '' });
                  setShowHouseModal(true);
                }}
              >
                <FiPlus className="w-4 h-4 mr-2" /> Add House
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {houses.length === 0 ? (
                <div className="col-span-full bg-white p-12 text-center rounded-xl border border-gray-100">
                  <FiShield className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No houses configured. Use quick seed to create standard houses.</p>
                </div>
              ) : (
                houses.map((house) => (
                  <div key={house._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 relative overflow-hidden">
                    <div
                      className="absolute top-0 left-0 right-0 h-2"
                      style={{ backgroundColor: house.color || '#3B82F6' }}
                    />
                    <div className="flex justify-between items-start mt-1">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        {house.code}
                      </span>
                      <IconButton
                        icon={FiTrash2}
                        onClick={() => handleDeleteHouse(house._id)}
                        className="text-gray-400 hover:text-red-600"
                      />
                    </div>
                    <h4 className="text-lg font-bold text-gray-800 mt-2">{house.name}</h4>
                    {house.motto && (
                      <p className="text-xs text-gray-500 italic mt-1">"{house.motto}"</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Modal: Add Class */}
        {showClassModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Add School Class</h3>
              <form onSubmit={handleCreateClass} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Class Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Class 10, Nursery, LKG"
                    value={classForm.name}
                    onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Class Code</label>
                  <input
                    type="text"
                    placeholder="e.g. CLS-10"
                    value={classForm.code}
                    onChange={(e) => setClassForm({ ...classForm, code: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Display Order</label>
                  <input
                    type="number"
                    value={classForm.order}
                    onChange={(e) => setClassForm({ ...classForm, order: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-3">
                  <Button variant="outline" type="button" onClick={() => setShowClassModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    Create Class
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Section */}
        {showSectionModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-1">
                Add Section to {selectedClassForSection?.name}
              </h3>
              <p className="text-xs text-gray-500 mb-4">Create section partition (e.g. A, B, C)</p>
              <form onSubmit={handleCreateSection} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Section Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. A, B, C"
                    value={sectionForm.name}
                    onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Capacity</label>
                  <input
                    type="number"
                    value={sectionForm.capacity}
                    onChange={(e) => setSectionForm({ ...sectionForm, capacity: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Room Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Room 102"
                    value={sectionForm.roomNumber}
                    onChange={(e) => setSectionForm({ ...sectionForm, roomNumber: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-3">
                  <Button variant="outline" type="button" onClick={() => setShowSectionModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    Add Section
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Session */}
        {showSessionModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Create Academic Session</h3>
              <form onSubmit={handleCreateSession} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Session Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2025-2026"
                    value={sessionForm.sessionName}
                    onChange={(e) => setSessionForm({ ...sessionForm, sessionName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={sessionForm.startDate}
                      onChange={(e) => setSessionForm({ ...sessionForm, startDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">End Date</label>
                    <input
                      type="date"
                      required
                      value={sessionForm.endDate}
                      onChange={(e) => setSessionForm({ ...sessionForm, endDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isCurrent"
                    checked={sessionForm.isCurrent}
                    onChange={(e) => setSessionForm({ ...sessionForm, isCurrent: e.target.checked })}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="isCurrent" className="text-sm font-medium text-gray-700">
                    Set as Current / Active Academic Session
                  </label>
                </div>
                <div className="flex justify-end space-x-3 pt-3">
                  <Button variant="outline" type="button" onClick={() => setShowSessionModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    Create Session
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Subject */}
        {showSubjectModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Add Subject</h3>
              <form onSubmit={handleCreateSubject} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Subject Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mathematics, Science"
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Subject Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MATH-CORE"
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Type</label>
                  <select
                    value={subjectForm.subjectType}
                    onChange={(e) => setSubjectForm({ ...subjectForm, subjectType: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="theory">Theory</option>
                    <option value="practical">Practical</option>
                    <option value="both">Theory + Practical</option>
                    <option value="activity">Activity / Sports</option>
                    <option value="language">Language</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Max Marks</label>
                    <input
                      type="number"
                      value={subjectForm.maxMarks}
                      onChange={(e) => setSubjectForm({ ...subjectForm, maxMarks: Number(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Pass Marks</label>
                    <input
                      type="number"
                      value={subjectForm.passMarks}
                      onChange={(e) => setSubjectForm({ ...subjectForm, passMarks: Number(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-3">
                  <Button variant="outline" type="button" onClick={() => setShowSubjectModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    Create Subject
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add House */}
        {showHouseModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Add Student House</h3>
              <form onSubmit={handleCreateHouse} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">House Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Red House - Shivaji"
                    value={houseForm.name}
                    onChange={(e) => setHouseForm({ ...houseForm, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">House Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. RED"
                      value={houseForm.code}
                      onChange={(e) => setHouseForm({ ...houseForm, code: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Theme Color</label>
                    <input
                      type="color"
                      value={houseForm.color}
                      onChange={(e) => setHouseForm({ ...houseForm, color: e.target.value })}
                      className="w-full h-10 border border-gray-300 rounded-lg p-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Motto</label>
                  <input
                    type="text"
                    placeholder="e.g. Courage and Honor"
                    value={houseForm.motto}
                    onChange={(e) => setHouseForm({ ...houseForm, motto: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-3">
                  <Button variant="outline" type="button" onClick={() => setShowHouseModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    Create House
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AcademicSetup;
