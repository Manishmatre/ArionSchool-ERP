import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiBookOpen, FiCheck, FiClock, FiLayers, FiPlus } from 'react-icons/fi';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import api from '../../api/axios';
import { getAllPrograms } from '../../api/programApi';
import { Button, Card, FormGrid, FormSection } from '../../components/ui';

const DEFAULT_CATEGORIES = [
  'Computer',
  'Programming',
  'Technology',
  'Web Development',
  'Design & Multimedia',
  'Accounting & Tally',
  'Digital Marketing',
  'Hardware & Networking',
  'Vocational',
  'Other'
];

const AddCourse = () => {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    program: '',
    category: 'Computer',
    regularFee: '',
    shortDescription: ''
  });

  useEffect(() => {
    let mounted = true;
    getAllPrograms()
      .then((res) => {
        if (!mounted) return;
        const list = res.data || [];
        setPrograms(list);
        if (list.length > 0 && !form.program) {
          setForm((prev) => ({ ...prev, program: list[0]._id }));
        }
      })
      .catch((err) => {
        console.warn('Could not load programs:', err.message);
      })
      .finally(() => {
        if (mounted) setLoadingOptions(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const generatedCode = useMemo(() => {
    const base = form.title
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9]+/g, '')
      .toUpperCase()
      .slice(0, 8) || 'COURSE';
    return `${base}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
  }, [form.title]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      toast.error('Please enter a course name');
      return;
    }
    if (!form.program) {
      toast.error('Please select a program');
      return;
    }

    setSaving(true);
    const summary = form.shortDescription.trim() || `${form.title.trim()} course`;
    const payload = new FormData();
    Object.entries({
      title: form.title.trim(),
      courseCode: generatedCode,
      program: form.program,
      category: form.category || 'Computer',
      shortDescription: summary.slice(0, 200),
      fullDescription: summary,
      durationType: 'months',
      durationValue: 1,
      totalHours: 0,
      totalSessions: 0,
      regularFee: Number(form.regularFee || 0),
      discountedFee: 0,
      registrationFee: 0,
      installmentAllowed: false,
      language: 'English',
      skillLevel: 'All Levels',
      totalLectures: 1,
      certificateAvailable: true,
      isActive: true,
      curriculum: JSON.stringify([]),
      prerequisites: JSON.stringify([]),
      learningOutcomes: JSON.stringify([]),
      tags: '',
    }).forEach(([key, value]) => payload.append(key, String(value)));

    try {
      const response = await api.post('/courses', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const created = response.data?.data;
      toast.success('Course created! Complete the course profile and content from its detail page.');
      if (created?._id) {
        navigate(`/admin/courses/${created._id}`);
      } else {
        navigate('/admin/courses');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not create this course');
    } finally {
      setSaving(false);
    }
  };

  const selectedProgramName = useMemo(() => {
    const found = programs.find((p) => p._id === form.program);
    return found ? `${found.name}${found.code ? ` · ${found.code}` : ''}` : 'Select a program';
  }, [programs, form.program]);

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader
          title="Add course"
          subtitle="Start with the essentials. Add course content and the full profile after creation."
          icon={FiBookOpen}
          actions={(
            <div className="flex items-center gap-2">
              <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate('/admin/courses')}>
                All Courses
              </Button>
              {!loadingOptions && !programs.length ? (
                <Button icon={FiLayers} onClick={() => navigate('/admin/programs')}>
                  Add Program First
                </Button>
              ) : (
                <Button
                  type="submit"
                  form="add-course-form"
                  icon={FiPlus}
                  loading={saving}
                  disabled={loadingOptions || !programs.length}
                >
                  Create Course
                </Button>
              )}
            </div>
          )}
        />

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* Essentials Form Section */}
          <FormSection
            title="Course essentials"
            subtitle="You can complete optional details, syllabus, and resources from the course page."
            icon={FiBookOpen}
          >
            <form id="add-course-form" onSubmit={handleSubmit} className="course-management-form space-y-5">
              <FormGrid className="gap-x-5 gap-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="course-title">
                    Course name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="course-title"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    placeholder="e.g. Web Development"
                    maxLength={120}
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="course-program">
                    Program <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="course-program"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    value={form.program}
                    onChange={(event) => setForm({ ...form, program: event.target.value })}
                    required
                    disabled={loadingOptions || !programs.length}
                  >
                    <option value="">
                      {loadingOptions ? 'Loading programs…' : programs.length ? 'Select a program' : 'Create a program first'}
                    </option>
                    {programs.map((program) => (
                      <option key={program._id} value={program._id}>
                        {program.name}{program.code ? ` · ${program.code}` : ''}
                      </option>
                    ))}
                  </select>
                  {!loadingOptions && !programs.length && (
                    <p className="mt-1 text-xs text-amber-700">Add a program before creating its course.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="course-category">
                    Category
                  </label>
                  <select
                    id="course-category"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    value={form.category}
                    onChange={(event) => setForm({ ...form, category: event.target.value })}
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="course-fee">
                    Course fee (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="course-fee"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.regularFee}
                    onChange={(event) => setForm({ ...form, regularFee: event.target.value })}
                    placeholder="0 for a free course"
                    required
                  />
                </div>
              </FormGrid>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="course-summary">
                  Short summary <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  id="course-summary"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition min-h-24 resize-y"
                  rows="3"
                  maxLength="200"
                  value={form.shortDescription}
                  onChange={(event) => setForm({ ...form, shortDescription: event.target.value })}
                  placeholder="A short description shown in the course list"
                />
                <p className="mt-1 text-right text-xs text-slate-400">{form.shortDescription.length}/200</p>
              </div>

              <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center">
                <p className="text-xs text-slate-500">Course code will be generated automatically.</p>
                <Button
                  type="submit"
                  icon={FiPlus}
                  loading={saving}
                  disabled={loadingOptions || !programs.length}
                >
                  Create course
                </Button>
              </div>
            </form>
          </FormSection>

          {/* Live Preview Card */}
          <Card className="border border-slate-200 bg-white" padded>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Live preview</p>
            <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 shadow-sm border border-primary-100">
              <FiBookOpen size={22} />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900 leading-snug">
              {form.title.trim() || 'New course'}
            </h2>
            <p className="mt-1 text-sm text-slate-500 font-medium">
              {selectedProgramName}
            </p>

            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Category</span>
                <span className="font-semibold text-slate-800">{form.category || 'Computer'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <FiClock className="text-slate-400" />
                  Course fee
                </span>
                <span className="font-bold text-slate-900">
                  ₹{Number(form.regularFee || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Status</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
                  <FiCheck className="text-emerald-600" />
                  Draft ready
                </span>
              </div>
            </div>

            <p className="mt-5 text-xs leading-5 text-slate-400 border-t border-slate-100 pt-4">
              After creating this course, open its tabs to manage its profile, syllabus, chapters, assessments, and enrolled students.
            </p>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default AddCourse;
