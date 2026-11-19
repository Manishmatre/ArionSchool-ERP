import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  FiBook, FiUsers, FiFileText, FiCheckSquare, FiEdit2, 
  FiArrowLeft, FiPlus, FiTrash2, FiEye, FiBarChart2, FiSave, FiAward, FiClock, FiUpload, FiChevronDown,
  FiCheckCircle, FiCheck, FiLayers
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import api from '../../api/axios';
import { toAbsoluteUrl } from '../../utils/url';
import { getAllPrograms } from '../../api/programApi';
import { FiHelpCircle } from 'react-icons/fi';
import CourseSyllabusTab from './course-curriculum/CourseSyllabusTab';
import CourseModulesTab from './course-curriculum/CourseModulesTab';
import CourseMCQBankTab from './course-curriculum/CourseMCQBankTab';
import CourseAssessmentsTab from './course-curriculum/CourseAssessmentsTab';
import {
  Card, StatCard, Badge, Button, IconButton, PageLoading, EmptyState, Modal, FormField, FormGrid, SelectField, TextField,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, ChartCard, TextArea,
} from '../../components/ui';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts';

const courseSectionHeadingClass = 'text-sm font-semibold text-slate-900';

const SeatAllocation = ({ currentAllocations = [], onSave }) => {
  const [franchises, setFranchises] = useState([]);
  const [allocations, setAllocations] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api.get('/campuses')
      .then((response) => {
        if (active) {
          const list = response.data?.data || response.data || [];
          setFranchises(Array.isArray(list) ? list : []);
        }
      })
      .catch((error) => {
        if (active) toast.error(error.response?.data?.message || 'Could not load franchise partners');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const currentByFranchise = new Map(
      currentAllocations.map((item) => [
        String(item.franchise?._id || item.franchise || ''),
        Number(item.seats || 0),
      ])
    );
    setAllocations(
      Object.fromEntries(
        franchises.map((franchise) => [
          franchise._id,
          currentByFranchise.get(franchise._id) || 0,
        ])
      )
    );
  }, [franchises, currentAllocations]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const next = franchises
        .map((franchise) => ({
          franchise: franchise._id,
          seats: Math.max(0, Number(allocations[franchise._id] || 0)),
        }))
        .filter((allocation) => allocation.seats > 0);
      await onSave(next);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoading message="Loading campus allocations…" />;
  if (!franchises.length) {
    return (
      <EmptyState
        icon={FiUsers}
        title="No school campuses found"
        description="Campuses will appear here for class and subject allocation."
      />
    );
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className={courseSectionHeadingClass}>Campus seat allocation</h3>
        <Button type="submit" icon={FiSave} loading={saving}>Save allocations</Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Campus / School</th>
              <th className="px-4 py-3 font-semibold">Contact</th>
              <th className="px-4 py-3 font-semibold">Allocated seats</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {franchises.map((franchise) => (
              <tr key={franchise._id}>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {franchise.name || franchise.franchiseName || 'Franchise'}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {franchise.email || franchise.contactEmail || '—'}
                </td>
                <td className="w-48 px-4 py-2">
                  <TextField
                    aria-label={`Seats for ${franchise.name || 'franchise'}`}
                    type="number"
                    min="0"
                    value={allocations[franchise._id] ?? 0}
                    onChange={(event) =>
                      setAllocations((current) => ({
                        ...current,
                        [franchise._id]: event.target.value,
                      }))
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </form>
  );
};

const CourseDetails = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'admin';
  const coursesHomePath = ['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role) ? '/school/courses' : '/admin/courses';

  const courseTabs = [
    ['overview', 'Overview', FiBook],
    ['syllabus', 'Syllabus', FiFileText],
    ...(isSuperAdmin ? [
      ['modules', 'Modules & Lessons', FiLayers],
      ['mcqs', 'MCQ Bank', FiHelpCircle],
      ['allocation', 'Seat allocation', FiUsers]
    ] : []),
    ['assessments', 'Assessments', FiAward],
    ['students', 'Students', FiUsers],
    ['analytics', 'Analytics', FiBarChart2],
  ];
  const allowedCourseTabs = courseTabs.map(([tab]) => tab);
  
  const [course, setCourse] = useState(null);
  const [curriculumModules, setCurriculumModules] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [mcqs, setMcqs] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [seatInfo, setSeatInfo] = useState({ allocated: 0, filled: 0 });
  const [stats, setStats] = useState({
    totalChapters: 0,
    totalTopics: 0,
    totalMCQs: 0,
    enrolledStudents: 0
  });
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    let tabParam = searchParams.get('courseTab');
    if (tabParam === 'chapters' || tabParam === 'topics') tabParam = 'modules';
    return allowedCourseTabs.includes(tabParam) ? tabParam : 'overview';
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [quickEditing, setQuickEditing] = useState(() => searchParams.get('edit') === 'true' || searchParams.get('courseTab') === 'profile');
  const [syllabusEditing, setSyllabusEditing] = useState(false);
  const [syllabusSaving, setSyllabusSaving] = useState(false);
  const [syllabusDraft, setSyllabusDraft] = useState([]);
  const [chapterModalOpen, setChapterModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState(null);
  const [chapterSaving, setChapterSaving] = useState(false);
  const [chapterForm, setChapterForm] = useState({ title: '', description: '', order: 1 });
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [topicSaving, setTopicSaving] = useState(false);
  const [topicForm, setTopicForm] = useState({ title: '', description: '', chapter: '', order: 1, videoUrl: '', duration: 0, studyMaterialUrl: '', studyMaterialName: '' });
  const [mcqModalOpen, setMcqModalOpen] = useState(false);
  const [editingMcq, setEditingMcq] = useState(null);
  const [mcqSaving, setMcqSaving] = useState(false);
  const [mcqForm, setMcqForm] = useState({ question: '', chapter: '', topic: '', options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }], explanation: '', difficulty: 'medium', marks: 1 });
  const [programs, setPrograms] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const thumbnailInputRef = useRef(null);

  const [outcomesModalOpen, setOutcomesModalOpen] = useState(false);
  const [outcomesDraft, setOutcomesDraft] = useState('');
  const [outcomesSaving, setOutcomesSaving] = useState(false);

  const [prereqModalOpen, setPrereqModalOpen] = useState(false);
  const [prereqDraft, setPrereqDraft] = useState('');
  const [prereqSaving, setPrereqSaving] = useState(false);

  useEffect(() => {
    fetchCourseDetails();
    if (!['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role)) fetchEditorOptions();
    if (['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role)) {
      fetchFranchiseSeatInfo();
    }
  }, [courseId]);

  useEffect(() => {
    if (!course) return;
    setThumbnailPreview(course.thumbnail ? toAbsoluteUrl(course.thumbnail) : '');
    setProfile({
      title: course.title || '',
      courseCode: course.courseCode || '',
      category: course.category || 'Other',
      program: course.program?._id || course.program || '',
      primaryTrainer: course.primaryTrainer?._id || course.primaryTrainer || '',
      trainerName: course.trainerName || course.instructor?.name || [course.primaryTrainer?.personalInfo?.firstName, course.primaryTrainer?.personalInfo?.lastName].filter(Boolean).join(' ') || '',
      shortDescription: course.shortDescription || '',
      fullDescription: course.fullDescription || course.description || '',
      durationValue: course.durationValue || 1,
      durationType: course.durationType || 'months',
      totalHours: course.totalHours || 0,
      totalSessions: course.totalSessions || 0,
      totalLectures: course.totalLectures || 1,
      estimatedTime: course.estimatedTime || '',
      regularFee: course.regularFee ?? course.price ?? 0,
      discountedFee: course.discountedFee || 0,
      registrationFee: course.registrationFee || 0,
      examFee: course.examFee || 0,
      certificateFee: course.certificateFee || 0,
      installmentAllowed: Boolean(course.installmentAllowed),
      language: course.language || 'English',
      skillLevel: course.skillLevel || course.level || 'All Levels',
      targetAudience: course.targetAudience || '',
      prerequisites: (course.prerequisites || []).join('\n'),
      learningOutcomes: (course.learningOutcomes || []).join('\n'),
      tags: Array.isArray(course.tags) ? course.tags.join(', ') : course.tags || '',
      videoUrl: course.videoUrl || '',
      certificateAvailable: Boolean(course.certificateAvailable),
      certificateType: course.certificateType || 'Certificate',
      isActive: Boolean(course.isActive),
      curriculum: course.curriculum || [],
      franchiseSeats: course.franchiseSeats || [],
      totalSeats: course.totalSeats || 0,
      trainers: (course.trainers || []).map((t) => t?._id || t),
    });
  }, [course]);

  useEffect(() => {
    if (activeTab === 'students') {
      fetchEnrolledStudents();
    } else if (activeTab === 'topics') {
      fetchTopics();
    } else if (activeTab === 'mcqs') {
      fetchTopics();
      fetchMCQs();
    }
  }, [activeTab, chapters, courseId]);

  const fetchCourseDetails = async () => {
    try {
      // 1. Fetch core course details, chapters, and modules in parallel for immediate render
      const [courseRes, chaptersRes, modulesRes] = await Promise.all([
        api.get(`/courses/${courseId}`),
        api.get(`/chapters?course=${courseId}`).catch(() => ({ data: { chapters: [] } })),
        api.get(`/modules?course=${courseId}`).catch(() => ({ data: { data: [] } }))
      ]);

      const courseData = courseRes.data?.data || courseRes.data;
      setCourse(courseData);
      const chList = chaptersRes.data?.chapters || [];
      setChapters(chList);

      let fetchedMods = modulesRes.data?.data || [];
      // Client-side fallback if modules collection hasn't finished initial sync
      if (fetchedMods.length === 0) {
        if (Array.isArray(courseData?.curriculum) && courseData.curriculum.length > 0) {
          fetchedMods = courseData.curriculum.map((m, mIdx) => ({
            _id: m._id || `mod-${mIdx}`,
            title: m.title,
            description: m.description || '',
            order: mIdx + 1,
            status: 'active',
            publicationStatus: 'published',
            lessons: (m.topics || []).map((t, tIdx) => {
              const rawVideo = t.videoUrl || (t.video && typeof t.video === 'string' ? t.video : '') ||
                (typeof t.description === 'string' && /youtube\.com|youtu\.be/i.test(t.description) ? t.description : '');
              const isVideo = Boolean(rawVideo) || t.contentType === 'video';
              const durationVal = Number(t.duration) || (isVideo ? 15 : 10);

              return {
                _id: t._id || `lsn-${mIdx}-${tIdx}`,
                title: t.topicTitle || t.title,
                description: t.topicDescription || (typeof t.description === 'string' && !t.description.startsWith('http') ? t.description : ''),
                contentType: isVideo ? 'video' : (t.contentType || (t.pdfUrl ? 'pdf' : 'text')),
                videoUrl: rawVideo,
                documentUrl: t.pdfUrl || t.documentUrl || '',
                duration: durationVal,
                order: t.order || (tIdx + 1),
                status: 'active',
                publicationStatus: 'published'
              };
            })
          }));
        } else if (chList.length > 0) {
          fetchedMods = chList.map((ch, idx) => ({
            _id: ch._id,
            title: ch.title,
            description: ch.description || '',
            order: ch.order || (idx + 1),
            status: ch.isActive !== false ? 'active' : 'inactive',
            publicationStatus: 'published',
            lessons: []
          }));
        }
      }
      setCurriculumModules(fetchedMods);

      // Unblock UI rendering immediately
      setLoading(false);

      // 2. Fetch stats asynchronously in the background so initial paint is instant
      api.get(`/courses/${courseId}/stats`)
        .then((statsRes) => {
          setStats({
            totalChapters: statsRes.data?.data?.totalChapters ?? chList.length,
            totalTopics: statsRes.data?.data?.totalTopics ?? 0,
            totalMCQs: statsRes.data?.data?.totalMCQs ?? 0,
            enrolledStudents: statsRes.data?.data?.enrolledStudents ?? 0
          });
          setAnalytics(statsRes.data?.data?.analytics || null);
        })
        .catch(() => {});
    } catch (error) {
      console.error('Error fetching course details:', error);
      toast.error('Failed to fetch course details');
      setLoading(false);
    }
  };

  const fetchEditorOptions = async () => {
    try {
      const [programResponse, staffResponse] = await Promise.all([
        getAllPrograms().catch(() => ({ data: [] })),
        api.get('/staff').catch(() => ({ data: { data: [] } }))
      ]);
      setPrograms(programResponse.data || []);
      setTrainers(staffResponse.data?.data || []);
    } catch (error) {
      console.error('Could not load course editor options:', error);
    }
  };

  const handleThumbnailChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file for the course cover');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Course cover image must be 5 MB or smaller');
      event.target.value = '';
      return;
    }
    setThumbnailPreview(URL.createObjectURL(file));
    setImageUploading(true);
    try {
      const body = new FormData();
      body.append('thumbnail', file);
      body.append('curriculum', JSON.stringify(course.curriculum || []));
      body.append('prerequisites', JSON.stringify(course.prerequisites || []));
      body.append('learningOutcomes', JSON.stringify(course.learningOutcomes || []));
      body.append('tags', Array.isArray(course.tags) ? course.tags.join(',') : course.tags || '');
      body.append('franchiseSeats', JSON.stringify(course.franchiseSeats || []));
      body.append('totalSeats', String(course.totalSeats || 0));
      const response = await api.put(`/courses/${courseId}`, body, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const updated = response.data?.data || response.data;
      setCourse((current) => ({ ...current, ...updated }));
      toast.success('Course cover updated');
    } catch (error) {
      setThumbnailPreview(course.thumbnail ? toAbsoluteUrl(course.thumbnail) : '');
      toast.error(error.response?.data?.message || 'Could not update the course cover');
    } finally {
      setImageUploading(false);
      event.target.value = '';
    }
  };

  const changeCourseTab = (tab) => {
    if (!allowedCourseTabs.includes(tab)) return;
    setActiveTab(tab);
    const nextParams = new URLSearchParams(searchParams);
    if (tab === 'overview') nextParams.delete('courseTab');
    else nextParams.set('courseTab', tab);
    setSearchParams(nextParams, { replace: true });
  };

  const fetchEnrolledStudents = async () => {
    setStudentsLoading(true);
    try {
      const url = ['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role) 
        ? `/courses/${courseId}/franchise-students` 
        : `/courses/${courseId}/students`;
      const response = await api.get(url);
      setEnrolledStudents(response.data?.data || response.data || []);
    } catch (error) {
      console.error('Error fetching enrolled students:', error);
      toast.error('Failed to fetch enrolled students');
    } finally {
      setStudentsLoading(false);
    }
  };

  const fetchTopics = async () => {
    try {
      const topicsPromises = chapters.map(chapter => 
        api.get(`/topics?chapter=${chapter._id}`).catch(() => ({ data: { topics: [] } }))
      );
      const topicsResponses = await Promise.all(topicsPromises);
      const allTopics = topicsResponses.flatMap(res => res.data?.topics || []);
      setTopics(allTopics);
      setStats(prev => ({ ...prev, totalTopics: allTopics.length }));
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  };

  const fetchFranchiseSeatInfo = async () => {
    try {
      const response = await api.get(`/courses/${courseId}/franchise-seats`);
      setSeatInfo(response.data?.data || { allocated: 0, filled: 0 });
    } catch (error) {
      console.error('Error fetching school seat info:', error);
    }
  };

  const fetchMCQs = async () => {
    try {
      const response = await api.get(`/mcqs`).catch(() => ({ data: { mcqs: [] } }));
      const allMCQs = response.data?.mcqs || [];
      const courseMCQs = allMCQs.filter(mcq => 
        mcq.course?._id === courseId || mcq.course === courseId
      );
      setMcqs(courseMCQs);
      setStats(prev => ({ ...prev, totalMCQs: courseMCQs.length }));
    } catch (error) {
      console.error('Error fetching MCQs:', error);
    }
  };

  const handleSaveAllocations = async (newAllocations) => {
    try {
      await api.put(`/courses/${courseId}`, {
        franchiseSeats: newAllocations
      });
      await fetchCourseDetails();
      toast.success('Seat allocations saved successfully');
    } catch (error) {
      toast.error('Failed to save seat allocations');
      console.error('Error saving seat allocations:', error);
    }
  };

  const openOutcomesModal = () => {
    setOutcomesDraft((course?.learningOutcomes || []).join('\n'));
    setOutcomesModalOpen(true);
  };

  const handleSaveOutcomes = async (e) => {
    if (e) e.preventDefault();
    setOutcomesSaving(true);
    try {
      const items = outcomesDraft.split('\n').map((s) => s.trim()).filter(Boolean);
      const res = await api.put(`/courses/${courseId}`, { learningOutcomes: items });
      const updated = res.data?.data || res.data;
      setCourse((curr) => ({ ...curr, learningOutcomes: items, ...updated }));
      setOutcomesModalOpen(false);
      toast.success('Learning outcomes updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save learning outcomes');
    } finally {
      setOutcomesSaving(false);
    }
  };

  const openPrereqModal = () => {
    setPrereqDraft((course?.prerequisites || []).join('\n'));
    setPrereqModalOpen(true);
  };

  const handleSavePrerequisites = async (e) => {
    if (e) e.preventDefault();
    setPrereqSaving(true);
    try {
      const items = prereqDraft.split('\n').map((s) => s.trim()).filter(Boolean);
      const res = await api.put(`/courses/${courseId}`, { prerequisites: items });
      const updated = res.data?.data || res.data;
      setCourse((curr) => ({ ...curr, prerequisites: items, ...updated }));
      setPrereqModalOpen(false);
      toast.success('Prerequisites updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save prerequisites');
    } finally {
      setPrereqSaving(false);
    }
  };

  const saveCourseProfile = async (event) => {
    event.preventDefault();
    setProfileSaving(true);
    try {
      const payload = {
        ...profile,
        primaryTrainer: profile.primaryTrainer || null,
        trainerName: profile.trainerName || '',
        duration: `${profile.durationValue || 1} ${profile.durationType ? (profile.durationType.charAt(0).toUpperCase() + profile.durationType.slice(1)) : 'Months'}`,
        durationValue: Number(profile.durationValue || 1),
        totalHours: Number(profile.totalHours || 0),
        totalSessions: Number(profile.totalSessions || 0),
        totalLectures: Number(profile.totalLectures || 1),
        regularFee: Number(profile.regularFee || 0),
        discountedFee: Number(profile.discountedFee || 0),
        registrationFee: Number(profile.registrationFee || 0),
        examFee: Number(profile.examFee || 0),
        certificateFee: Number(profile.certificateFee || 0),
        prerequisites: profile.prerequisites.split('\n').map((item) => item.trim()).filter(Boolean),
        learningOutcomes: profile.learningOutcomes.split('\n').map((item) => item.trim()).filter(Boolean),
        tags: profile.tags.split(',').map((item) => item.trim()).filter(Boolean),
        curriculum: course.curriculum || [],
        franchiseSeats: course.franchiseSeats || [],
        totalSeats: course.totalSeats || 0,
        trainers: profile.trainers || [],
      };
      await api.put(`/courses/${courseId}`, payload);
      await fetchCourseDetails();
      setQuickEditing(false);
      toast.success('Course details saved');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save the course profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const beginSyllabusEdit = () => {
    setSyllabusDraft((course.curriculum || []).map((module) => ({
      ...module,
      topics: (module.topics || []).map((topic) => ({ ...topic })),
    })));
    setSyllabusEditing(true);
  };

  const saveSyllabus = async (event) => {
    event.preventDefault();
    setSyllabusSaving(true);
    try {
      const response = await api.put(`/courses/${courseId}`, {
        curriculum: syllabusDraft,
        prerequisites: course.prerequisites || [],
        learningOutcomes: course.learningOutcomes || [],
        tags: Array.isArray(course.tags) ? course.tags : [],
        franchiseSeats: course.franchiseSeats || [],
        totalSeats: course.totalSeats || 0,
      });
      const updated = response.data?.data || response.data;
      setCourse((current) => ({ ...current, ...updated }));
      setSyllabusEditing(false);
      toast.success('Syllabus saved');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save the syllabus');
    } finally {
      setSyllabusSaving(false);
    }
  };

  const updateSyllabusModule = (moduleIndex, field, value) =>
    setSyllabusDraft((items) =>
      items.map((mod, index) => (index === moduleIndex ? { ...mod, [field]: value } : mod))
    );

  const updateSyllabusTopic = (moduleIndex, topicIndex, field, value) =>
    setSyllabusDraft((items) =>
      items.map((mod, index) =>
        index === moduleIndex
          ? {
              ...mod,
              topics: mod.topics.map((t, itemIndex) =>
                itemIndex === topicIndex ? { ...t, [field]: value } : t
              ),
            }
          : mod
      )
    );

  const openChapterForm = (chapter = null) => {
    setEditingChapter(chapter);
    setChapterForm(
      chapter
        ? { title: chapter.title || '', description: chapter.description || '', order: chapter.order || 1 }
        : { title: '', description: '', order: chapters.length + 1 }
    );
    setChapterModalOpen(true);
  };

  const saveChapter = async (event) => {
    event.preventDefault();
    setChapterSaving(true);
    try {
      const payload = { ...chapterForm, course: courseId, order: Number(chapterForm.order) };
      if (editingChapter) await api.put(`/chapters/${editingChapter._id}`, payload);
      else await api.post('/chapters', payload);
      toast.success(editingChapter ? 'Chapter updated' : 'Chapter created');
      setChapterModalOpen(false);
      await fetchCourseDetails();
      if (activeTab === 'topics') await fetchTopics();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save chapter');
    } finally {
      setChapterSaving(false);
    }
  };

  const openTopicForm = (topic = null) => {
    setEditingTopic(topic);
    setTopicForm(
      topic
        ? {
            title: topic.title || '',
            description: topic.description || '',
            chapter: topic.chapter?._id || topic.chapter || '',
            order: topic.order || 1,
            videoUrl: topic.videoUrl || '',
            duration: topic.duration || topic.videoDuration || 0,
            studyMaterialUrl: topic.studyMaterialUrl || '',
            studyMaterialName: topic.studyMaterialName || '',
          }
        : {
            title: '',
            description: '',
            chapter: chapters[0]?._id || '',
            order: topics.length + 1,
            videoUrl: '',
            duration: 0,
            studyMaterialUrl: '',
            studyMaterialName: '',
          }
    );
    setTopicModalOpen(true);
  };

  const saveTopic = async (event) => {
    event.preventDefault();
    setTopicSaving(true);
    try {
      const payload = {
        ...topicForm,
        order: Number(topicForm.order),
        duration: Number(topicForm.duration || 0),
      };
      if (editingTopic) await api.put(`/topics/${editingTopic._id}`, payload);
      else await api.post('/topics', payload);
      toast.success(editingTopic ? 'Topic updated' : 'Topic created');
      setTopicModalOpen(false);
      await fetchTopics();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save topic');
    } finally {
      setTopicSaving(false);
    }
  };

  const openMcqForm = (mcq = null) => {
    const chapterId = mcq?.chapter?._id || mcq?.chapter || chapters[0]?._id || '';
    setEditingMcq(mcq);
    setMcqForm(
      mcq
        ? {
            question: mcq.question || '',
            chapter: chapterId,
            topic: mcq.topic?._id || mcq.topic || '',
            options: (mcq.options || []).map((option) => ({
              text: option.text || '',
              isCorrect: Boolean(option.isCorrect),
            })),
            explanation: mcq.explanation || '',
            difficulty: mcq.difficulty || 'medium',
            marks: mcq.marks || 1,
          }
        : {
            question: '',
            chapter: chapterId,
            topic:
              topics.find((item) => (item.chapter?._id || item.chapter) === chapterId)?._id || '',
            options: [
              { text: '', isCorrect: true },
              { text: '', isCorrect: false },
              { text: '', isCorrect: false },
              { text: '', isCorrect: false },
            ],
            explanation: '',
            difficulty: 'medium',
            marks: 1,
          }
    );
    setMcqModalOpen(true);
  };

  const saveMcq = async (event) => {
    event.preventDefault();
    const options = mcqForm.options.map((option) => ({ ...option, text: option.text.trim() }));
    if (options.some((option) => !option.text) || options.filter((option) => option.isCorrect).length !== 1) {
      toast.error('Fill every answer and choose exactly one correct option');
      return;
    }
    setMcqSaving(true);
    try {
      const payload = { ...mcqForm, options, course: courseId, marks: Number(mcqForm.marks || 1) };
      if (editingMcq) await api.put(`/mcqs/${editingMcq._id}`, payload);
      else await api.post('/mcqs', payload);
      toast.success(editingMcq ? 'Question updated' : 'Question created');
      setMcqModalOpen(false);
      await fetchMCQs();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save question');
    } finally {
      setMcqSaving(false);
    }
  };

  const deleteContentItem = async (type, item) => {
    const label = type === 'topics' ? 'topic' : 'question';
    if (!window.confirm(`Delete this ${label}? This action cannot be undone.`)) return;
    try {
      await api.delete(`/${type}/${item._id}`);
      toast.success(`${label[0].toUpperCase()}${label.slice(1)} deleted`);
      if (type === 'topics') await fetchTopics();
      else await fetchMCQs();
    } catch (error) {
      toast.error(error.response?.data?.message || `Could not delete ${label}`);
    }
  };

  const handleDeleteChapter = async (chapterId) => {
    if (!window.confirm('Are you sure you want to delete this chapter?')) return;
    try {
      await api.delete(`/chapters/${chapterId}`);
      toast.success('Chapter deleted successfully');
      await fetchCourseDetails();
      if (activeTab === 'topics') await fetchTopics();
    } catch (error) {
      console.error('Error deleting chapter:', error);
      toast.error('Failed to delete chapter');
    }
  };

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Course Details" subtitle="View and manage course content" icon={FiBook} />
        <PageLoading message="Loading course details..." />
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout>
        <PageHeader title="Course Details" subtitle="View and manage course content" icon={FiBook} />
        <Card>
          <EmptyState
            icon={FiBook}
            title="Course not found"
            description="The course you are looking for does not exist or has been removed."
            action={<Button icon={FiArrowLeft} onClick={() => navigate(coursesHomePath)}>Back to Courses</Button>}
          />
        </Card>
      </Layout>
    );
  }

  const renderCourseTabActions = () => {
    if (['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role)) {
      if (activeTab === 'assessments') {
        return (
          <Button icon={FiPlus} onClick={() => navigate(`/admin/exams/create?courseId=${courseId}`)}>
            Create Exam
          </Button>
        );
      }
      return (
        <Button variant="primary" icon={FiPlus} onClick={() => navigate('/school/students/add')}>
          Enroll Student
        </Button>
      );
    }

    switch (activeTab) {
      case 'syllabus':
        return (
          <Button icon={FiLayers} onClick={() => changeCourseTab('modules')}>
            Manage Curriculum
          </Button>
        );
      case 'modules':
        return (
          <Button icon={FiPlus} onClick={() => navigate(`/admin/courses/${courseId}/add-lessons`)}>
            Add Lessons
          </Button>
        );
      case 'mcqs':
        return (
          <Button icon={FiPlus} onClick={() => navigate(`/admin/courses/${courseId}/mcqs/batch`)}>
            Add MCQs
          </Button>
        );
      case 'assessments':
        return (
          <Button icon={FiPlus} onClick={() => navigate(`/admin/exams/create?courseId=${courseId}`)}>
            Create Exam
          </Button>
        );
      case 'students':
        return (
          <Button icon={FiPlus} onClick={() => navigate('/admin/students/add')}>
            Enroll Student
          </Button>
        );
      default:
        return (
          <Button icon={FiEdit2} onClick={() => { setActiveTab('overview'); setQuickEditing(true); }}>
            Edit details
          </Button>
        );
    }
  };

  return (
    <Layout
      title={course.title || 'Course Details'}
      breadcrumbs={`Courses / ${course.title || 'Course Details'}`}
    >
      <div className="space-y-4 course-management-page">
        {/* Top Header */}
        <PageHeader actions={renderCourseTabActions()} />

        {/* Modular Course Detail Tabs */}
        <nav className="-mt-1 mb-4 border-b border-slate-200/90 bg-white" aria-label="Course sections">
          <div className="flex space-x-6 overflow-x-auto no-scrollbar sm:space-x-8">
            {courseTabs.map(([tab, label, TabIcon]) => (
              <button
                key={tab}
                type="button"
                onClick={() => changeCourseTab(tab)}
                aria-pressed={activeTab === tab}
                className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-1 py-2.5 text-xs font-semibold transition-colors ${
                  activeTab === tab
                    ? 'border-primary-600 font-bold text-primary-600'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
                }`}
              >
                <TabIcon className={`h-3.5 w-3.5 ${activeTab === tab ? 'text-primary-600' : 'text-slate-400'}`} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </nav>

        <Card padded={false} className="overflow-hidden border border-slate-200 shadow-sm">
          <div className="bg-slate-50/40 p-4 md:p-6">
            {/* 1. Overview Tab */}
            {activeTab === 'overview' && !quickEditing && (
              <div className="space-y-6">
                {/* Hero Banner Section */}
                <section className="relative isolate min-h-[220px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-md">
                  {thumbnailPreview ? (
                    <img
                      src={thumbnailPreview}
                      alt={`${course.title} course cover`}
                      className="absolute inset-0 z-0 h-full w-full object-cover"
                      onError={(event) => { event.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-800 via-indigo-600 to-slate-900" />
                  )}
                  <div className="absolute inset-0 z-10 bg-gradient-to-r from-slate-950/80 via-slate-900/60 to-slate-900/25" />
                  
                  {!['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role) && (
                    <>
                      <input
                        ref={thumbnailInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleThumbnailChange}
                      />
                      <button
                        type="button"
                        disabled={imageUploading}
                        onClick={() => thumbnailInputRef.current?.click()}
                        className="absolute right-4 top-4 z-30 inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-800 shadow-md transition hover:bg-white disabled:cursor-wait disabled:opacity-70"
                      >
                        <FiUpload />
                        {imageUploading ? 'Uploading…' : 'Change cover'}
                      </button>
                    </>
                  )}

                  <div className="relative z-20 flex min-h-[220px] flex-col justify-between gap-5 p-5 text-white md:flex-row md:items-end md:p-8">
                    <div className="max-w-3xl">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-1 bg-primary-500/80 backdrop-blur-md text-white text-xs font-semibold rounded-lg">
                          {course.category || 'Course'}
                        </span>
                        <span className={`px-2.5 py-1 backdrop-blur-md text-xs font-semibold rounded-lg ${course.isActive ? 'bg-emerald-500/80 text-white' : 'bg-slate-500/80 text-white'}`}>
                          {course.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-semibold rounded-lg">
                          {course.skillLevel || course.level || 'All levels'}
                        </span>
                      </div>
                      <h2 className="text-2xl font-bold tracking-tight md:text-3xl text-white">
                        {course.title}
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
                        {course.shortDescription || course.fullDescription || course.description || 'Course description has not been added yet.'}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-200">
                        {course.courseCode && (
                          <span>Code <strong className="ml-1 text-white font-mono bg-white/10 px-2 py-0.5 rounded">{course.courseCode}</strong></span>
                        )}
                        <span className="inline-flex items-center gap-1.5">
                          <FiClock />
                          {course.durationValue ? `${course.durationValue} ${course.durationType || 'months'}` : `${course.totalHours || 0} hours`}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <FiAward />
                          {course.certificateAvailable ? 'Certificate included' : 'No certificate'}
                        </span>
                      </div>
                    </div>

                    <div className="min-w-[160px] rounded-xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-md text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">Course fee</p>
                      <p className="mt-1 text-2xl font-bold text-white">
                        {Number(course.discountedFee || course.regularFee || course.price || 0) > 0 
                          ? `₹${Number(course.discountedFee || course.regularFee || course.price).toLocaleString('en-IN')}` 
                          : 'Free'}
                      </p>
                      {course.discountedFee > 0 && course.regularFee > course.discountedFee && (
                        <p className="mt-0.5 text-xs text-slate-300 line-through">
                          Regular ₹{Number(course.regularFee).toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                {/* 4 Stat Cards Row */}
                <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
                  <StatCard title="Enrolled students" tone="info" icon={FiUsers} value={['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role) ? seatInfo.filled : stats.enrolledStudents} />
                  <StatCard title="Total Modules" tone="success" icon={FiLayers} value={curriculumModules.length} />
                  <StatCard title="Total Lessons" tone="purple" icon={FiFileText} value={curriculumModules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0)} />
                  <StatCard title="Question Bank" tone="amber" icon={FiHelpCircle} value={stats.totalMCQs} />
                </div>
                {['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role) && (
                  <section className="flex flex-col gap-3 rounded-2xl border border-primary-100 bg-primary-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Your course seat capacity</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {seatInfo.filled} enrolled of {seatInfo.allocated} allocated · {Math.max(0, seatInfo.allocated - seatInfo.filled)} seats available
                      </p>
                    </div>
                    <Button variant="secondary" onClick={() => navigate('/school/students')}>
                      View Enrolled Students
                    </Button>
                  </section>
                )}

                {/* About this course Card */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-primary-600 font-bold">
                        <FiBook size={18} />
                      </span>
                      <h3 className="text-base font-bold text-slate-900">About this course</h3>
                    </div>
                    {!quickEditing && !['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role) && (
                      <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" icon={FiEdit2} onClick={() => setQuickEditing(true)}>
                        Edit course
                      </Button>
                    )}
                  </div>
                  
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {course.fullDescription || course.description || course.shortDescription || 'No course description has been added yet.'}
                  </p>
                  
                  {Array.isArray(course.tags) && course.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {course.tags.map((tag, index) => (
                        <Badge key={`${tag}-${index}`} variant="neutral">{tag}</Badge>
                      ))}
                    </div>
                  )}

                  {/* COURSE INFORMATION Grid */}
                  <div className="mt-6 border-t border-slate-200 pt-5">
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                      COURSE INFORMATION
                    </h4>
                    <dl className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
                      {[
                        ['Program', course.program?.name || programs.find((p) => p._id === (course.program?._id || course.program))?.name || 'Not set'],
                        ['Category', course.category || 'Other'],
                        ['Course code', course.courseCode || 'Not set'],
                        ['Skill level', course.skillLevel || course.level || 'All Levels'],
                        ['Duration', course.durationValue ? `${course.durationValue} ${course.durationType || 'months'}` : `${course.totalHours || 0} hours`],
                        ['Estimated completion', course.estimatedTime || 'Not set'],
                        ['Language', course.language || 'English'],
                        ['Sessions', course.totalSessions || 'Not set'],
                        ['Lectures', course.totalLectures || 'Not set'],
                        ['Course fee', Number(course.discountedFee || course.regularFee || course.price || 0) > 0 ? `₹${Number(course.discountedFee || course.regularFee || course.price).toLocaleString('en-IN')}` : 'Free'],
                        ['Primary trainer', course.trainerName || course.instructor?.name || [course.primaryTrainer?.personalInfo?.firstName, course.primaryTrainer?.personalInfo?.lastName].filter(Boolean).join(' ') || 'Not assigned'],
                        ['Certificate', course.certificateAvailable ? 'Included' : 'Not included'],
                        ...(course.targetAudience ? [['For', course.targetAudience]] : []),
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-start justify-between gap-4 border-t border-slate-100 py-2.5 text-sm">
                          <dt className="text-slate-500 font-medium">{label}</dt>
                          <dd className="text-right font-semibold text-slate-800">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </section>

                {/* What learners will achieve & Prerequisites Cards */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3.5 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                            <FiCheckCircle className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">What learners will achieve</h3>
                            <p className="text-xs text-slate-400">Key competencies & skills gained</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {course.learningOutcomes?.length > 0 && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              {course.learningOutcomes.length} {course.learningOutcomes.length === 1 ? 'Outcome' : 'Outcomes'}
                            </span>
                          )}
                          {!['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role) && (
                            <button
                              type="button"
                              onClick={openOutcomesModal}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200/60 transition"
                            >
                              <FiEdit2 className="w-3 h-3" />
                              <span>{course.learningOutcomes?.length ? 'Edit' : 'Add'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {course.learningOutcomes?.length > 0 ? (
                        <ul className="space-y-2.5">
                          {course.learningOutcomes.map((outcome, index) => (
                            <li key={index} className="flex items-start gap-2.5 text-sm text-slate-700 leading-relaxed">
                              <FiCheckCircle className="text-emerald-500 w-4 h-4 shrink-0 mt-0.5" />
                              <span>{outcome}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="py-6 text-center">
                          <p className="text-xs text-slate-500 mb-2">No learning outcomes defined yet.</p>
                          {!['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role) && (
                            <button
                              type="button"
                              onClick={openOutcomesModal}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200/60 transition"
                            >
                              <FiPlus className="w-3.5 h-3.5" />
                              <span>Add Learning Outcomes</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3.5 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 shrink-0">
                            <FiBook className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">Prerequisites</h3>
                            <p className="text-xs text-slate-400">Recommended prior preparation</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {course.prerequisites?.length > 0 && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200/60">
                              {course.prerequisites.length}
                            </span>
                          )}
                          {!['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role) && (
                            <button
                              type="button"
                              onClick={openPrereqModal}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-2.5 py-1 rounded-lg border border-primary-200/60 transition"
                            >
                              <FiEdit2 className="w-3 h-3" />
                              <span>{course.prerequisites?.length ? 'Edit' : 'Add'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {course.prerequisites?.length > 0 ? (
                        <ul className="space-y-2.5">
                          {course.prerequisites.map((prerequisite, index) => (
                            <li key={index} className="flex items-start gap-2.5 text-sm text-slate-700 leading-relaxed">
                              <FiCheckSquare className="text-primary-500 w-4 h-4 shrink-0 mt-0.5" />
                              <span>{prerequisite}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="py-6 text-center">
                          <p className="text-xs text-slate-500 mb-2">No prerequisites specified for this course.</p>
                          {!['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role) && (
                            <button
                              type="button"
                              onClick={openPrereqModal}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg border border-primary-200/60 transition"
                            >
                              <FiPlus className="w-3.5 h-3.5" />
                              <span>Add Prerequisites</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            )}

            {/* Inline Course Profile Editor */}
            {activeTab === 'overview' && quickEditing && profile && (
              <form onSubmit={saveCourseProfile} className="course-management-form space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Edit course details</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Update essential information and presentation details</p>
                  </div>
                  <div className="flex gap-2.5">
                    <Button type="button" variant="secondary" onClick={() => { setQuickEditing(false); fetchCourseDetails(); }}>
                      Cancel
                    </Button>
                    <Button type="submit" icon={FiSave} loading={profileSaving}>
                      Save changes
                    </Button>
                  </div>
                </div>

                <FormGrid className="gap-x-5 gap-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="profile-course-title">
                      Course name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="profile-course-title"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                      required
                      value={profile.title}
                      onChange={(event) => setProfile({ ...profile, title: event.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="profile-course-code">
                      Course code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="profile-course-code"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition font-mono uppercase"
                      required
                      value={profile.courseCode}
                      onChange={(event) => setProfile({ ...profile, courseCode: event.target.value.toUpperCase() })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="profile-course-program">
                      Program <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="profile-course-program"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                      required
                      value={profile.program}
                      onChange={(event) => setProfile({ ...profile, program: event.target.value })}
                    >
                      <option value="">Select program</option>
                      {programs.map((program) => (
                        <option key={program._id} value={program._id}>
                          {program.name}{program.code ? ` (${program.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="profile-course-category">
                      Category
                    </label>
                    <input
                      id="profile-course-category"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                      value={profile.category}
                      onChange={(event) => setProfile({ ...profile, category: event.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="profile-course-level">
                      Skill level
                    </label>
                    <select
                      id="profile-course-level"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                      value={profile.skillLevel}
                      onChange={(event) => setProfile({ ...profile, skillLevel: event.target.value })}
                    >
                      <option>Beginner</option>
                      <option>Intermediate</option>
                      <option>Advanced</option>
                      <option>All Levels</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="profile-duration">
                      Duration
                    </label>
                    <div className="grid grid-cols-[1fr_130px] gap-2">
                      <input
                        id="profile-duration"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                        type="number"
                        min="1"
                        value={profile.durationValue}
                        onChange={(event) => setProfile({ ...profile, durationValue: event.target.value })}
                      />
                      <select
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                        value={profile.durationType}
                        onChange={(event) => setProfile({ ...profile, durationType: event.target.value })}
                      >
                        <option value="days">Days</option>
                        <option value="weeks">Weeks</option>
                        <option value="months">Months</option>
                        <option value="years">Years</option>
                      </select>
                    </div>
                  </div>

                  <TextArea
                    className="md:col-span-2"
                    label="Short summary"
                    maxLength={200}
                    required
                    value={profile.shortDescription}
                    onChange={(event) => setProfile({ ...profile, shortDescription: event.target.value })}
                  />

                  <TextArea
                    className="md:col-span-2"
                    label="Full description"
                    rows={3}
                    required
                    value={profile.fullDescription}
                    onChange={(event) => setProfile({ ...profile, fullDescription: event.target.value })}
                  />

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="profile-language">
                      Language
                    </label>
                    <select
                      id="profile-language"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                      value={profile.language}
                      onChange={(event) => setProfile({ ...profile, language: event.target.value })}
                    >
                      {['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Other'].map((lang) => (
                        <option key={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="profile-hours">
                      Total hours
                    </label>
                    <input
                      id="profile-hours"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                      type="number"
                      min="0"
                      value={profile.totalHours}
                      onChange={(event) => setProfile({ ...profile, totalHours: event.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="profile-sessions">
                      Total sessions
                    </label>
                    <input
                      id="profile-sessions"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                      type="number"
                      min="0"
                      value={profile.totalSessions}
                      onChange={(event) => setProfile({ ...profile, totalSessions: event.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="profile-lectures">
                      Total lectures <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="profile-lectures"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                      type="number"
                      min="1"
                      value={profile.totalLectures}
                      onChange={(event) => setProfile({ ...profile, totalLectures: event.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="profile-estimated-time">
                      Estimated completion time
                    </label>
                    <input
                      id="profile-estimated-time"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                      value={profile.estimatedTime}
                      onChange={(event) => setProfile({ ...profile, estimatedTime: event.target.value })}
                      placeholder="e.g. 12 weeks"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="profile-fee">
                      Regular fee (₹)
                    </label>
                    <input
                      id="profile-fee"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                      type="number"
                      min="0"
                      step="0.01"
                      value={profile.regularFee}
                      onChange={(event) => setProfile({ ...profile, regularFee: event.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="profile-discounted-fee">
                      Discounted fee (₹)
                    </label>
                    <input
                      id="profile-discounted-fee"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                      type="number"
                      min="0"
                      step="0.01"
                      value={profile.discountedFee}
                      onChange={(event) => setProfile({ ...profile, discountedFee: event.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="profile-registration-fee">
                      Registration fee (₹)
                    </label>
                    <input
                      id="profile-registration-fee"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                      type="number"
                      min="0"
                      step="0.01"
                      value={profile.registrationFee}
                      onChange={(event) => setProfile({ ...profile, registrationFee: event.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="profile-trainer-input">
                      Primary trainer
                    </label>
                    <div className="relative">
                      <input
                        id="profile-trainer-input"
                        type="text"
                        list="profile-trainer-list"
                        autoComplete="off"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition text-slate-800 placeholder:text-slate-400 pr-9"
                        placeholder="Select from staff or type custom trainer..."
                        value={profile.trainerName || ''}
                        onChange={(event) => {
                          const val = event.target.value;
                          const matched = trainers.find((t) => {
                            const name = `${t.personalInfo?.firstName || ''} ${t.personalInfo?.lastName || ''}`.trim();
                            return name.toLowerCase() === val.trim().toLowerCase();
                          });
                          setProfile({
                            ...profile,
                            trainerName: val,
                            primaryTrainer: matched ? matched._id : ''
                          });
                        }}
                      />
                      <datalist id="profile-trainer-list">
                        {trainers.map((trainer) => {
                          const name = `${trainer.personalInfo?.firstName || ''} ${trainer.personalInfo?.lastName || ''}`.trim();
                          return (
                            <option key={trainer._id} value={name}>
                              {name} {trainer.personalInfo?.email ? `(${trainer.personalInfo.email})` : ''}
                            </option>
                          );
                        })}
                      </datalist>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                        <FiChevronDown className="w-4 h-4" />
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="profile-audience">
                      Target audience
                    </label>
                    <input
                      id="profile-audience"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                      value={profile.targetAudience}
                      onChange={(event) => setProfile({ ...profile, targetAudience: event.target.value })}
                      placeholder="Who is this course for?"
                    />
                  </div>

                  <TextArea
                    className="md:col-span-2"
                    label="Prerequisites (one per line)"
                    value={profile.prerequisites}
                    onChange={(event) => setProfile({ ...profile, prerequisites: event.target.value })}
                  />

                  <TextArea
                    className="md:col-span-2"
                    label="Learning outcomes (one per line)"
                    value={profile.learningOutcomes}
                    onChange={(event) => setProfile({ ...profile, learningOutcomes: event.target.value })}
                  />

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="profile-tags">
                      Tags (comma separated)
                    </label>
                    <input
                      id="profile-tags"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                      value={profile.tags}
                      onChange={(event) => setProfile({ ...profile, tags: event.target.value })}
                      placeholder="computer, beginner, certification"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="profile-video-url">
                      Course introduction video URL
                    </label>
                    <input
                      id="profile-video-url"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                      type="url"
                      value={profile.videoUrl}
                      onChange={(event) => setProfile({ ...profile, videoUrl: event.target.value })}
                      placeholder="https://"
                    />
                  </div>
                </FormGrid>

                <div className="flex flex-wrap gap-6 border-t border-slate-200 pt-5 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      className="rounded text-primary-600 focus:ring-primary-500"
                      checked={profile.certificateAvailable}
                      onChange={(event) => setProfile({ ...profile, certificateAvailable: event.target.checked })}
                    />
                    Certificate available
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      className="rounded text-primary-600 focus:ring-primary-500"
                      checked={profile.installmentAllowed}
                      onChange={(event) => setProfile({ ...profile, installmentAllowed: event.target.checked })}
                    />
                    Allow installment payments
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      className="rounded text-primary-600 focus:ring-primary-500"
                      checked={profile.isActive}
                      onChange={(event) => setProfile({ ...profile, isActive: event.target.checked })}
                    />
                    Course is active
                  </label>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                  <Button type="button" variant="secondary" onClick={() => setQuickEditing(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" icon={FiSave} loading={profileSaving}>
                    Save profile
                  </Button>
                </div>
              </form>
            )}

            {/* 2. Syllabus Tab (Clean Read-Only Hierarchy) */}
            {activeTab === 'syllabus' && (
              <CourseSyllabusTab
                course={course}
                modules={curriculumModules}
                onSwitchToCurriculum={() => changeCourseTab('modules')}
              />
            )}

            {/* 3. Modules & Lessons Tab (Full Curriculum Management) */}
            {activeTab === 'modules' && (
              <CourseModulesTab
                courseId={courseId}
                courseTitle={course?.title}
                onCurriculumUpdated={(updated) => setCurriculumModules(updated)}
              />
            )}

            {/* 4. MCQ Bank Tab (Centralized Question Bank) */}
            {activeTab === 'mcqs' && (
              <CourseMCQBankTab
                courseId={courseId}
                courseTitle={course?.title}
                modules={curriculumModules}
              />
            )}

            {/* 5. Assessments Tab (Exam Creation & Auto-Generation Review) */}
            {activeTab === 'assessments' && (
              <CourseAssessmentsTab
                courseId={courseId}
                courseTitle={course?.title}
                modules={curriculumModules}
              />
            )}

            {/* 6. Enrolled Students Tab */}
            {activeTab === 'students' && (
              <div className="space-y-4">
                <h3 className={courseSectionHeadingClass}>Enrolled students</h3>
                
                {studentsLoading ? (
                  <PageLoading message="Loading students..." />
                ) : enrolledStudents.length === 0 ? (
                  <EmptyState icon={FiUsers} title="No students enrolled yet" description="Students enrolled in this course will appear here with progress tracking." />
                ) : (
                  <>
                    <TableWrapper>
                      <Table>
                        <TableHead>
                          <tr>
                            <TableHeader>Student Name</TableHeader>
                            <TableHeader>Email</TableHeader>
                            <TableHeader>Mobile</TableHeader>
                            <TableHeader>Progress</TableHeader>
                            <TableHeader>Enrolled On</TableHeader>
                            <TableHeader>Last Accessed</TableHeader>
                          </tr>
                        </TableHead>
                        <TableBody>
                          {enrolledStudents.map((student, index) => (
                            <TableRow key={student._id || index}>
                              <TableCell>
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-9 w-9 bg-primary-100 text-primary-700 font-bold rounded-xl flex items-center justify-center text-xs">
                                    {student.name?.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="ml-3 text-sm font-semibold text-slate-900">{student.name}</div>
                                </div>
                              </TableCell>
                              <TableCell>{student.email}</TableCell>
                              <TableCell>{student.mobile || 'N/A'}</TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <div className="bg-slate-200 rounded-full h-2 mr-2 w-24 overflow-hidden">
                                    <div
                                      className="bg-primary-600 h-2 rounded-full transition-all"
                                      style={{ width: `${student.progress || 0}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-semibold">{student.progress || 0}%</span>
                                </div>
                              </TableCell>
                              <TableCell>{new Date(student.enrolledAt).toLocaleDateString()}</TableCell>
                              <TableCell className="text-slate-500">
                                {student.lastAccessedAt ? new Date(student.lastAccessedAt).toLocaleDateString() : 'Never'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableWrapper>
                    <div className="mt-4 text-xs font-semibold text-slate-500">
                      Total: {enrolledStudents.length} student{enrolledStudents.length !== 1 ? 's' : ''}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 7. Seat Allocation Tab */}
            {activeTab === 'allocation' && user?.role === 'super_admin' && (
              <SeatAllocation
                currentAllocations={course.franchiseSeats || []} 
                onSave={handleSaveAllocations} 
              />
            )}

            {/* 8. Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-5">
                <h3 className={courseSectionHeadingClass}>Course analytics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard title="Enrolled" tone="primary" icon={FiUsers} value={stats.enrolledStudents || 0} />
                  <StatCard title="Avg. progress" tone="success" icon={FiBarChart2} value={`${analytics?.averageProgress || 0}%`} />
                  <StatCard title="Completion" tone="purple" icon={FiCheckSquare} value={`${analytics?.completionRate || 0}%`} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ChartCard title="Enrollment trend" subtitle="Last 12 months" icon={FiBarChart2} height={260}>
                    {(analytics?.enrollmentTrend || []).every((row) => !row.enrollments) ? (
                      <EmptyState title="No enrollments yet" description="Trend data appears after students join this course." />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analytics.enrollmentTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Line type="monotone" dataKey="enrollments" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </ChartCard>
                  <ChartCard title="Completion mix" subtitle={`${analytics?.completedCount || 0} completed`} icon={FiBarChart2} height={260}>
                    {(analytics?.progressBuckets || []).every((row) => !row.students) ? (
                      <EmptyState title="No progress yet" description="Completion bands fill in as students study." />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.progressBuckets}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="students" fill="#0f766e" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </ChartCard>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Chapter Modal */}
      {!['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role) && (
        <>
          <Modal
            open={chapterModalOpen}
            onClose={() => !chapterSaving && setChapterModalOpen(false)}
            title={editingChapter ? 'Edit chapter' : 'Add chapter'}
            size="md"
            footer={(
              <>
                <Button variant="secondary" onClick={() => setChapterModalOpen(false)} disabled={chapterSaving}>
                  Cancel
                </Button>
                <Button type="submit" form="course-chapter-form" loading={chapterSaving}>
                  {editingChapter ? 'Save changes' : 'Add chapter'}
                </Button>
              </>
            )}
          >
            <form id="course-chapter-form" onSubmit={saveChapter} className="space-y-4">
              <FormField label="Chapter name" required>
                <TextField
                  value={chapterForm.title}
                  onChange={(event) => setChapterForm((form) => ({ ...form, title: event.target.value }))}
                  placeholder="e.g. Introduction"
                  required
                />
              </FormField>
              <FormField label="Description" required>
                <TextArea
                  value={chapterForm.description}
                  onChange={(event) => setChapterForm((form) => ({ ...form, description: event.target.value }))}
                  rows={3}
                  placeholder="What students will learn in this chapter"
                  required
                />
              </FormField>
              <FormField label="Order" required>
                <TextField
                  type="number"
                  min="1"
                  value={chapterForm.order}
                  onChange={(event) => setChapterForm((form) => ({ ...form, order: event.target.value }))}
                  required
                />
              </FormField>
            </form>
          </Modal>

          {/* Topic Modal */}
          <Modal
            open={topicModalOpen}
            onClose={() => !topicSaving && setTopicModalOpen(false)}
            title={editingTopic ? 'Edit topic' : 'Add topic'}
            size="lg"
            footer={(
              <>
                <Button variant="secondary" onClick={() => setTopicModalOpen(false)} disabled={topicSaving}>
                  Cancel
                </Button>
                <Button type="submit" form="course-topic-form" loading={topicSaving}>
                  {editingTopic ? 'Save changes' : 'Add topic'}
                </Button>
              </>
            )}
          >
            <form id="course-topic-form" onSubmit={saveTopic} className="space-y-4">
              <FormGrid cols={2}>
                <FormField label="Topic name" required>
                  <TextField
                    value={topicForm.title}
                    onChange={(event) => setTopicForm((form) => ({ ...form, title: event.target.value }))}
                    placeholder="e.g. Core concepts"
                    required
                  />
                </FormField>
                <FormField label="Chapter" required>
                  <SelectField
                    value={topicForm.chapter}
                    onChange={(event) => setTopicForm((form) => ({ ...form, chapter: event.target.value }))}
                    required
                  >
                    <option value="">Select a chapter</option>
                    {chapters.map((chapter) => (
                      <option key={chapter._id} value={chapter._id}>
                        {chapter.title}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
              </FormGrid>
              <FormField label="Description" required>
                <TextArea
                  value={topicForm.description}
                  onChange={(event) => setTopicForm((form) => ({ ...form, description: event.target.value }))}
                  rows={3}
                  placeholder="Describe this lesson"
                  required
                />
              </FormField>
              <FormGrid cols={2}>
                <FormField label="Order" required>
                  <TextField
                    type="number"
                    min="1"
                    value={topicForm.order}
                    onChange={(event) => setTopicForm((form) => ({ ...form, order: event.target.value }))}
                    required
                  />
                </FormField>
                <FormField label="Duration (minutes)">
                  <TextField
                    type="number"
                    min="0"
                    value={topicForm.duration}
                    onChange={(event) => setTopicForm((form) => ({ ...form, duration: event.target.value }))}
                  />
                </FormField>
              </FormGrid>
              <FormGrid cols={2}>
                <FormField label="Video URL">
                  <TextField
                    type="url"
                    value={topicForm.videoUrl}
                    onChange={(event) => setTopicForm((form) => ({ ...form, videoUrl: event.target.value }))}
                    placeholder="https://"
                  />
                </FormField>
                <FormField label="Study material URL">
                  <TextField
                    type="url"
                    value={topicForm.studyMaterialUrl}
                    onChange={(event) => setTopicForm((form) => ({ ...form, studyMaterialUrl: event.target.value }))}
                    placeholder="https://"
                  />
                </FormField>
              </FormGrid>
              <FormField label="Study material name">
                <TextField
                  value={topicForm.studyMaterialName}
                  onChange={(event) => setTopicForm((form) => ({ ...form, studyMaterialName: event.target.value }))}
                  placeholder="e.g. Lesson notes PDF"
                />
              </FormField>
            </form>
          </Modal>

          {/* MCQ Assessment Modal */}
          <Modal
            open={mcqModalOpen}
            onClose={() => !mcqSaving && setMcqModalOpen(false)}
            title={editingMcq ? 'Edit assessment question' : 'Add assessment question'}
            size="lg"
            footer={(
              <>
                <Button variant="secondary" onClick={() => setMcqModalOpen(false)} disabled={mcqSaving}>
                  Cancel
                </Button>
                <Button type="submit" form="course-mcq-form" loading={mcqSaving}>
                  {editingMcq ? 'Save changes' : 'Add question'}
                </Button>
              </>
            )}
          >
            <form id="course-mcq-form" onSubmit={saveMcq} className="space-y-4">
              <FormField label="Question" required>
                <TextArea
                  value={mcqForm.question}
                  onChange={(event) => setMcqForm((form) => ({ ...form, question: event.target.value }))}
                  rows={3}
                  placeholder="Enter the question"
                  required
                />
              </FormField>
              <FormGrid cols={2}>
                <FormField label="Chapter" required>
                  <SelectField
                    value={mcqForm.chapter}
                    onChange={(event) => {
                      const chapter = event.target.value;
                      setMcqForm((form) => ({
                        ...form,
                        chapter,
                        topic: topics.find((item) => (item.chapter?._id || item.chapter) === chapter)?._id || '',
                      }));
                    }}
                    required
                  >
                    <option value="">Select a chapter</option>
                    {chapters.map((chapter) => (
                      <option key={chapter._id} value={chapter._id}>
                        {chapter.title}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
                <FormField label="Topic" required>
                  <SelectField
                    value={mcqForm.topic}
                    onChange={(event) => setMcqForm((form) => ({ ...form, topic: event.target.value }))}
                    required
                  >
                    <option value="">Select a topic</option>
                    {topics
                      .filter((topic) => (topic.chapter?._id || topic.chapter) === mcqForm.chapter)
                      .map((topic) => (
                        <option key={topic._id} value={topic._id}>
                          {topic.title}
                        </option>
                      ))}
                  </SelectField>
                </FormField>
              </FormGrid>
              <fieldset className="space-y-2.5">
                <legend className="mb-2 text-sm font-semibold text-slate-700">
                  Answer choices <span className="text-rose-500">*</span>
                  <span className="ml-2 text-xs font-normal text-slate-500">Select the correct answer</span>
                </legend>
                {mcqForm.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="w-6 text-xs font-bold text-slate-500">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <TextField
                      value={option.text}
                      onChange={(event) =>
                        setMcqForm((form) => ({
                          ...form,
                          options: form.options.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, text: event.target.value } : item
                          ),
                        }))
                      }
                      placeholder={`Option ${index + 1}`}
                      required
                    />
                    <label className="flex shrink-0 items-center gap-1.5 text-xs text-slate-600 cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="correct-option"
                        checked={option.isCorrect}
                        onChange={() =>
                          setMcqForm((form) => ({
                            ...form,
                            options: form.options.map((item, itemIndex) => ({
                              ...item,
                              isCorrect: itemIndex === index,
                            })),
                          }))
                        }
                      />
                      Correct
                    </label>
                  </div>
                ))}
              </fieldset>
              <FormGrid cols={2}>
                <FormField label="Difficulty">
                  <SelectField
                    value={mcqForm.difficulty}
                    onChange={(event) => setMcqForm((form) => ({ ...form, difficulty: event.target.value }))}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </SelectField>
                </FormField>
                <FormField label="Marks">
                  <TextField
                    type="number"
                    min="1"
                    value={mcqForm.marks}
                    onChange={(event) => setMcqForm((form) => ({ ...form, marks: event.target.value }))}
                  />
                </FormField>
              </FormGrid>
              <FormField label="Explanation (optional)">
                <TextArea
                  value={mcqForm.explanation}
                  onChange={(event) => setMcqForm((form) => ({ ...form, explanation: event.target.value }))}
                  rows={2}
                  placeholder="Explain why the answer is correct"
                />
              </FormField>
            </form>
          </Modal>

          {/* Quick Learning Outcomes Modal */}
          <Modal
            open={outcomesModalOpen}
            onClose={() => !outcomesSaving && setOutcomesModalOpen(false)}
            title="Edit Learning Outcomes"
            size="md"
            footer={(
              <>
                <Button variant="secondary" onClick={() => setOutcomesModalOpen(false)} disabled={outcomesSaving}>
                  Cancel
                </Button>
                <Button onClick={handleSaveOutcomes} loading={outcomesSaving} icon={FiSave}>
                  Save Outcomes
                </Button>
              </>
            )}
          >
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Enter each learning outcome or skill on a new line. These will appear on the course overview.
              </p>
              <TextArea
                rows={6}
                value={outcomesDraft}
                onChange={(e) => setOutcomesDraft(e.target.value)}
                placeholder="e.g. Build full-stack web applications&#10;Master database modeling with MongoDB&#10;Deploy production apps to cloud"
                className="w-full"
              />
            </div>
          </Modal>

          {/* Quick Prerequisites Modal */}
          <Modal
            open={prereqModalOpen}
            onClose={() => !prereqSaving && setPrereqModalOpen(false)}
            title="Edit Course Prerequisites"
            size="md"
            footer={(
              <>
                <Button variant="secondary" onClick={() => setPrereqModalOpen(false)} disabled={prereqSaving}>
                  Cancel
                </Button>
                <Button onClick={handleSavePrerequisites} loading={prereqSaving} icon={FiSave}>
                  Save Prerequisites
                </Button>
              </>
            )}
          >
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Enter recommended background or skills needed (one per line).
              </p>
              <TextArea
                rows={5}
                value={prereqDraft}
                onChange={(e) => setPrereqDraft(e.target.value)}
                placeholder="e.g. Basic understanding of programming&#10;Familiarity with HTML and CSS"
                className="w-full"
              />
            </div>
          </Modal>
        </>
      )}
    </Layout>
  );
};

export default CourseDetails;
