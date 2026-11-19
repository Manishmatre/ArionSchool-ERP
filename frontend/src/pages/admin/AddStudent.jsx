import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import {
  FiUser,
  FiMail,
  FiPhone,
  FiBook,
  FiArrowLeft,
  FiUpload,
  FiCheckCircle,
  FiShield,
  FiEye,
  FiEyeOff,
  FiLayers,
  FiHome,
  FiAward
} from 'react-icons/fi';
import api from '../../api/axios';
import academicApi from '../../api/academicApi';
import { getAllCampuses } from '../../api/campusApi';
import { Button } from '../../components/ui';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS', 'Other'];

const AddStudent = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [campuses, setCampuses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [houses, setHouses] = useState([]);
  const [showPassword, setShowPassword] = useState(false);

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [formData, setFormData] = useState({
    // Academic Setup
    franchise: '',
    academicSession: '',
    schoolClass: '',
    section: '',
    house: '',
    admissionNumber: '',
    rollNumber: '',
    admissionDate: new Date().toISOString().split('T')[0],
    category: 'General',
    isRTE: false,

    // Student Personal
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'Male',
    bloodGroup: 'B+',
    aadhaarNumber: '',

    // Parents & Guardian
    fatherName: '',
    fatherPhone: '',
    fatherOccupation: '',
    motherName: '',
    motherPhone: '',
    motherOccupation: '',
    guardianName: '',
    guardianPhone: '',
    guardianRelation: 'Parent',

    // Address
    address: '',
    city: 'Jabalpur',
    state: 'Madhya Pradesh',
    pincode: '482001',

    // Previous School
    lastQualification: '',
    schoolOrCollege: '',
    boardOrUniversity: 'CBSE',
    yearOfPassing: '',
    percentage: '',

    // Credentials & Status
    password: '',
    status: 'active'
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [campusRes, sessRes, classRes, houseRes] = await Promise.allSettled([
        getAllCampuses(),
        academicApi.getSessions(),
        academicApi.getClasses(),
        academicApi.getHouses()
      ]);

      const campusList = campusRes.status === 'fulfilled' ? (campusRes.value.data || campusRes.value || []) : [];
      setCampuses(Array.isArray(campusList) ? campusList : []);

      const sessionList = sessRes.status === 'fulfilled' ? (sessRes.value.data?.data || []) : [];
      setSessions(sessionList);

      const classList = classRes.status === 'fulfilled' ? (classRes.value.data?.data || []) : [];
      setClasses(classList);

      const houseList = houseRes.status === 'fulfilled' ? (houseRes.value.data?.data || []) : [];
      setHouses(houseList);

      // Auto-select defaults
      const currentSession = sessionList.find(s => s.isCurrent) || sessionList[0];
      const defaultCampus = campusList[0];
      const defaultClass = classList[0];

      setFormData(prev => ({
        ...prev,
        franchise: defaultCampus?._id || prev.franchise,
        academicSession: currentSession?._id || prev.academicSession,
        schoolClass: defaultClass?._id || prev.schoolClass,
        section: defaultClass?.sections?.[0]?._id || prev.section,
        admissionNumber: `VITS-ADM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
      }));
    } catch (err) {
      console.error('Failed to load academic admission data:', err);
      toast.error('Could not load academic classes or sessions');
    }
  };

  const selectedClass = useMemo(() => {
    return classes.find(c => String(c._id) === String(formData.schoolClass));
  }, [classes, formData.schoolClass]);

  const availableSections = selectedClass?.sections || [];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'schoolClass') {
      const foundCls = classes.find(c => String(c._id) === String(value));
      setFormData(prev => ({
        ...prev,
        schoolClass: value,
        section: foundCls?.sections?.[0]?._id || ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Student photo size must be less than 5MB');
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('Student first and last name are required');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Student portal email address is required');
      return;
    }
    if (!formData.schoolClass) {
      toast.error('Please assign a school class');
      return;
    }

    setLoading(true);
    try {
      const studentPayload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        category: formData.category,
        isRTE: formData.isRTE,
        aadhaarNumber: formData.aadhaarNumber.trim(),

        franchise: formData.franchise || undefined,
        academicSession: formData.academicSession || undefined,
        schoolClass: formData.schoolClass || undefined,
        section: formData.section || undefined,
        house: formData.house || undefined,
        rollNumber: formData.rollNumber ? formData.rollNumber.trim() : undefined,
        admissionNumber: formData.admissionNumber.trim(),
        admissionDate: formData.admissionDate,

        fatherName: formData.fatherName.trim(),
        motherName: formData.motherName.trim(),
        guardianName: formData.guardianName.trim() || formData.fatherName.trim(),
        guardianPhone: formData.guardianPhone.trim() || formData.phone.trim(),
        guardianRelation: formData.guardianRelation,

        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),

        lastQualification: formData.lastQualification.trim(),
        schoolOrCollege: formData.schoolOrCollege.trim(),
        boardOrUniversity: formData.boardOrUniversity.trim(),
        yearOfPassing: formData.yearOfPassing ? Number(formData.yearOfPassing) : undefined,
        percentage: formData.percentage ? Number(formData.percentage) : undefined,

        password: formData.password || `Student@${Math.floor(1000 + Math.random() * 9000)}`,
        status: formData.status
      };

      const res = await api.post('/students', studentPayload);
      if (res.data?.success) {
        const studentId = res.data.data?._id;

        if (photoFile && studentId) {
          try {
            const photoData = new FormData();
            photoData.append('photo', photoFile);
            await api.post(`/students/${studentId}/photo`, photoData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
          } catch (photoErr) {
            console.warn('Optional photo upload failed:', photoErr.message);
          }
        }

        toast.success(`Student admitted successfully to ${selectedClass?.name || 'Class'}!`);
        navigate(`/admin/students/${studentId}`);
      } else {
        toast.error(res.data?.message || 'Failed to register student');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Error admitting student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <PageHeader
          title="Student Admission & Registration"
          subtitle="Enroll student into an academic session, assign class, section, roll number, and parent profile"
          icon={FiUser}
          actions={(
            <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate('/admin/students')}>
              Back to Student Roster
            </Button>
          )}
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left 2 Columns: Structured Details */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Card 1: Academic Enrollment */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold">
                    <FiLayers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Academic Enrollment</h3>
                    <p className="text-xs text-slate-500">Assign school campus, academic year, class and section</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      School Campus <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="franchise"
                      required
                      value={formData.franchise}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    >
                      <option value="">Select campus</option>
                      {campuses.map(c => (
                        <option key={c._id} value={c._id}>{c.name} {c.code ? `(${c.code})` : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Academic Session <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="academicSession"
                      required
                      value={formData.academicSession}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    >
                      <option value="">Select academic session</option>
                      {sessions.map(s => (
                        <option key={s._id} value={s._id}>{s.sessionName} {s.isCurrent ? '(Current)' : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Admission Date
                    </label>
                    <input
                      type="date"
                      name="admissionDate"
                      value={formData.admissionDate}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Class <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="schoolClass"
                      required
                      value={formData.schoolClass}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    >
                      <option value="">Select Class</option>
                      {classes.map(cls => (
                        <option key={cls._id} value={cls._id}>{cls.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Section <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="section"
                      required
                      value={formData.section}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    >
                      <option value="">Select Section</option>
                      {availableSections.map(sec => (
                        <option key={sec._id} value={sec._id}>Section {sec.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Class Roll Number
                    </label>
                    <input
                      type="text"
                      name="rollNumber"
                      value={formData.rollNumber}
                      onChange={handleChange}
                      placeholder="e.g. 15"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Admission Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="admissionNumber"
                      required
                      value={formData.admissionNumber}
                      onChange={handleChange}
                      placeholder="e.g. VITS-ADM-2026-001"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm font-mono transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Category
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      School House (Optional)
                    </label>
                    <select
                      name="house"
                      value={formData.house}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    >
                      <option value="">None / Not Assigned</option>
                      {houses.map(h => (
                        <option key={h._id} value={h._id}>{h.name} ({h.code})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Card 2: Student Personal Information */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 border border-primary-100 flex items-center justify-center font-bold">
                    <FiUser className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Student Personal Information</h3>
                    <p className="text-xs text-slate-500">Student demographic details and identity</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      required
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="e.g. Aarav"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      required
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="e.g. Sharma"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Gender <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="gender"
                      required
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Blood Group
                    </label>
                    <select
                      name="bloodGroup"
                      value={formData.bloodGroup}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    >
                      {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Aadhaar Number
                    </label>
                    <input
                      type="text"
                      name="aadhaarNumber"
                      maxLength={12}
                      value={formData.aadhaarNumber}
                      onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                      placeholder="12-digit UID"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm font-mono transition"
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Parents & Guardian Information */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center font-bold">
                    <FiShield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Parent & Guardian Information</h3>
                    <p className="text-xs text-slate-500">Father, mother and emergency guardian contact</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Father's Name
                    </label>
                    <input
                      type="text"
                      name="fatherName"
                      value={formData.fatherName}
                      onChange={handleChange}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Father's Mobile
                    </label>
                    <input
                      type="tel"
                      name="fatherPhone"
                      maxLength={10}
                      value={formData.fatherPhone}
                      onChange={(e) => setFormData({ ...formData, fatherPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      placeholder="10-digit mobile"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Father's Occupation
                    </label>
                    <input
                      type="text"
                      name="fatherOccupation"
                      value={formData.fatherOccupation}
                      onChange={handleChange}
                      placeholder="e.g. Government Officer"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Mother's Name
                    </label>
                    <input
                      type="text"
                      name="motherName"
                      value={formData.motherName}
                      onChange={handleChange}
                      placeholder="e.g. Sunita Sharma"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Mother's Mobile
                    </label>
                    <input
                      type="tel"
                      name="motherPhone"
                      maxLength={10}
                      value={formData.motherPhone}
                      onChange={(e) => setFormData({ ...formData, motherPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      placeholder="10-digit mobile"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Guardian Relation
                    </label>
                    <select
                      name="guardianRelation"
                      value={formData.guardianRelation}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    >
                      <option value="Parent">Parent</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Guardian">Guardian</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Card 4: Address & Contact Details */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold">
                    <FiHome className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Residential Address & Direct Contact</h3>
                    <p className="text-xs text-slate-500">Student residential address and communication numbers</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Street Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="e.g. 102 Civil Lines, Near High Court Road"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      State
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Pincode
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      maxLength={6}
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm font-mono transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Primary Contact Mobile <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <FiPhone className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
                      <input
                        type="tel"
                        name="phone"
                        required
                        maxLength={10}
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        placeholder="10-digit mobile"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 5: Previous School Record (Optional) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center font-bold">
                    <FiAward className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Previous School Record</h3>
                    <p className="text-xs text-slate-500">Academic background before admission to The Vits School</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Previous School Name
                    </label>
                    <input
                      type="text"
                      name="schoolOrCollege"
                      value={formData.schoolOrCollege}
                      onChange={handleChange}
                      placeholder="e.g. St. Xavier's School"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Previous Board
                    </label>
                    <input
                      type="text"
                      name="boardOrUniversity"
                      value={formData.boardOrUniversity}
                      onChange={handleChange}
                      placeholder="e.g. CBSE / State Board"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Last Class Percentage (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="percentage"
                      value={formData.percentage}
                      onChange={handleChange}
                      placeholder="e.g. 88.5"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Portal Access, Photo & Submit Action */}
            <div className="space-y-6">
              {/* Photo Upload Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <h4 className="text-sm font-bold text-slate-900 mb-3">Student Photograph</h4>
                <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/60">
                  {photoPreview ? (
                    <div className="relative mb-3">
                      <img
                        src={photoPreview}
                        alt="Student Preview"
                        className="w-28 h-28 object-cover rounded-xl shadow-xs border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center hover:bg-rose-600 shadow-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3 border border-slate-200">
                      <FiUpload className="w-7 h-7" />
                    </div>
                  )}

                  <label className="cursor-pointer px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-2xs">
                    <span>{photoPreview ? 'Change Photo' : 'Upload Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-400 mt-2 text-center">JPG, PNG up to 5MB</p>
                </div>
              </div>

              {/* Portal Login Credentials */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <FiShield className="w-4 h-4 text-primary-600" />
                  <h4 className="text-sm font-bold text-slate-900">Student Portal Credentials</h4>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Student Portal Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FiMail className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="e.g. aarav.vits@gmail.com"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Used for Web portal & Mobile App login</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Initial Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Auto-generated if left blank"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm pr-10 transition font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                  >
                    <option value="active">Active (Enrolled)</option>
                    <option value="pending">Pending Verification</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full justify-center py-3 text-sm font-semibold shadow-sm"
                  loading={loading}
                >
                  <FiCheckCircle className="w-4 h-4 mr-2" />
                  Confirm & Complete Admission
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  className="w-full justify-center py-2.5 text-xs text-slate-600"
                  onClick={() => navigate('/admin/students')}
                >
                  Cancel
                </Button>
              </div>

            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default AddStudent;
