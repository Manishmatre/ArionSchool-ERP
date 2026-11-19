import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import {
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiBook,
  FiArrowLeft,
  FiFileText,
  FiX,
  FiSave,
  FiImage,
  FiLayers,
  FiHome,
  FiAward,
  FiShield
} from 'react-icons/fi';
import api from '../../api/axios';
import academicApi from '../../api/academicApi';
import { getAllCampuses } from '../../api/campusApi';
import DocumentUploadPreview from '../../components/DocumentUploadPreview';
import { toAbsoluteUrl } from '../../utils/url';
import { useAuth } from '../../context/AuthContext';
import { FormPageLayout, FormSection, FormGrid, Button, PageLoading } from '../../components/ui';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS', 'Other'];

const EditStudent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  // Masters
  const [campuses, setCampuses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [houses, setHouses] = useState([]);

  // Files
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [docFiles, setDocFiles] = useState({
    aadhaarCardFront: null,
    aadhaarCardBack: null,
    signature: null,
    lastMarksheet: null
  });
  const [filePreviews, setFilePreviews] = useState({});

  const [formData, setFormData] = useState({
    // Academic Enrollment
    franchise: '',
    academicSession: '',
    schoolClass: '',
    section: '',
    house: '',
    admissionNumber: '',
    rollNumber: '',
    admissionDate: '',
    category: 'General',
    isRTE: false,
    status: 'active',

    // Personal Information
    firstName: '',
    lastName: '',
    gender: 'Male',
    dateOfBirth: '',
    bloodGroup: 'B+',
    aadhaarNumber: '',
    email: '',
    phone: '',

    // Parent & Guardian Details
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

    // Original photo from DB
    photo: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    try {
      setFetchingData(true);
      const [studentRes, campusRes, sessRes, classRes, houseRes] = await Promise.allSettled([
        api.get(`/students/${id}`),
        getAllCampuses(),
        academicApi.getSessions(),
        academicApi.getClasses(),
        academicApi.getHouses()
      ]);

      if (studentRes.status !== 'fulfilled' || !studentRes.value.data?.data) {
        toast.error('Student record not found');
        navigate('/admin/students');
        return;
      }

      const student = studentRes.value.data.data;
      const campusList = campusRes.status === 'fulfilled' ? (campusRes.value.data || campusRes.value || []) : [];
      setCampuses(Array.isArray(campusList) ? campusList : []);

      const sessionList = sessRes.status === 'fulfilled' ? (sessRes.value.data?.data || []) : [];
      setSessions(sessionList);

      const classList = classRes.status === 'fulfilled' ? (classRes.value.data?.data || []) : [];
      setClasses(classList);

      const houseList = houseRes.status === 'fulfilled' ? (houseRes.value.data?.data || []) : [];
      setHouses(houseList);

      // Populate form data from student
      setFormData({
        franchise: student.franchise?._id || student.franchise || '',
        academicSession: student.academicSession?._id || student.academicSession || '',
        schoolClass: student.schoolClass?._id || student.schoolClass || '',
        section: student.section?._id || student.section || '',
        house: student.house?._id || student.house || '',
        admissionNumber: student.admissionNumber || student.studentId || '',
        rollNumber: student.rollNumber || '',
        admissionDate: student.admissionDate ? new Date(student.admissionDate).toISOString().split('T')[0] : '',
        category: student.category || 'General',
        isRTE: !!student.isRTE,
        status: student.status || 'active',

        firstName: student.personalInfo?.firstName || '',
        lastName: student.personalInfo?.lastName || '',
        gender: student.personalInfo?.gender || 'Male',
        dateOfBirth: student.personalInfo?.dateOfBirth ? new Date(student.personalInfo.dateOfBirth).toISOString().split('T')[0] : '',
        bloodGroup: student.personalInfo?.bloodGroup || 'B+',
        aadhaarNumber: student.personalInfo?.aadhaarNumber || '',
        email: student.contactInfo?.email || student.user?.email || '',
        phone: student.contactInfo?.mobile || student.user?.mobile || '',

        fatherName: student.personalInfo?.fatherName || '',
        fatherPhone: student.guardianInfo?.mobile || '',
        fatherOccupation: '',
        motherName: student.personalInfo?.motherName || '',
        motherPhone: '',
        motherOccupation: '',
        guardianName: student.guardianInfo?.name || '',
        guardianPhone: student.guardianInfo?.mobile || '',
        guardianRelation: student.guardianInfo?.relation || 'Parent',

        address: student.contactInfo?.address?.street || '',
        city: student.contactInfo?.address?.city || 'Jabalpur',
        state: student.contactInfo?.address?.state || 'Madhya Pradesh',
        pincode: student.contactInfo?.address?.pincode || '482001',

        lastQualification: student.academicInfo?.lastQualification || '',
        schoolOrCollege: student.academicInfo?.schoolOrCollege || '',
        boardOrUniversity: student.academicInfo?.boardOrUniversity || 'CBSE',
        yearOfPassing: student.academicInfo?.yearOfPassing || '',
        percentage: student.academicInfo?.percentage || '',

        photo: student.personalInfo?.photo || ''
      });

      // Existing document previews
      if (student.documents) {
        setFilePreviews({
          aadhaarCardFront: student.documents.aadhaarCardFront?.url ? toAbsoluteUrl(student.documents.aadhaarCardFront.url) : null,
          aadhaarCardBack: student.documents.aadhaarCardBack?.url ? toAbsoluteUrl(student.documents.aadhaarCardBack.url) : null,
          signature: student.documents.signature?.url ? toAbsoluteUrl(student.documents.signature.url) : null,
          lastMarksheet: student.documents.lastMarksheet?.url ? toAbsoluteUrl(student.documents.lastMarksheet.url) : null
        });
      }

      if (student.personalInfo?.photo) {
        setPhotoPreview(toAbsoluteUrl(student.personalInfo.photo));
      }
    } catch (error) {
      toast.error('Failed to load student details');
      console.error('Error fetching student details:', error);
    } finally {
      setFetchingData(false);
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

  const handleDocFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      const file = files[0];
      setDocFiles(prev => ({ ...prev, [name]: file }));

      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreviews(prev => ({ ...prev, [name]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFile = (name) => {
    setDocFiles(prev => ({ ...prev, [name]: null }));
    setFilePreviews(prev => ({ ...prev, [name]: null }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Photo size must be less than 5MB');
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
        status: formData.status,

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
        percentage: formData.percentage ? Number(formData.percentage) : undefined
      };

      await api.put(`/students/${id}`, studentPayload);

      // Upload photo if new photo selected
      if (photoFile) {
        const photoFormData = new FormData();
        photoFormData.append('photo', photoFile);
        await api.post(`/students/${id}/photo`, photoFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      // Upload any new documents
      for (const docType in docFiles) {
        if (docFiles[docType]) {
          const docFormData = new FormData();
          docFormData.append('document', docFiles[docType]);
          docFormData.append('docType', docType);
          await api.post(`/students/${id}/documents`, docFormData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      }

      toast.success('Student profile updated successfully!');
      navigate(`/admin/students/${id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update student profile');
      console.error('Error updating student:', error);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <Layout>
        <PageLoading message="Loading student details..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <PageHeader
          title={`Edit Student: ${formData.firstName} ${formData.lastName}`}
          subtitle={`Admission No: ${formData.admissionNumber || 'N/A'} • Class: ${selectedClass?.name || 'Class'}`}
          icon={FiUser}
          actions={(
            <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate(`/admin/students/${id}`)}>
              Back to Profile
            </Button>
          )}
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          <FormPageLayout>
            
            {/* Section 1: Academic Enrollment */}
            <FormSection title="School Academic Enrollment" icon={FiLayers}>
              <FormGrid>
                <div>
                  <label className="form-label">School Campus *</label>
                  <select
                    name="franchise"
                    required
                    value={formData.franchise}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="">Select campus</option>
                    {campuses.map(c => (
                      <option key={c._id} value={c._id}>{c.name} {c.code ? `(${c.code})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Academic Session *</label>
                  <select
                    name="academicSession"
                    required
                    value={formData.academicSession}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="">Select session</option>
                    {sessions.map(s => (
                      <option key={s._id} value={s._id}>{s.sessionName} {s.isCurrent ? '(Current)' : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Class *</label>
                  <select
                    name="schoolClass"
                    required
                    value={formData.schoolClass}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="">Select Class</option>
                    {classes.map(cls => (
                      <option key={cls._id} value={cls._id}>{cls.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Section *</label>
                  <select
                    name="section"
                    required
                    value={formData.section}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="">Select Section</option>
                    {availableSections.map(sec => (
                      <option key={sec._id} value={sec._id}>Section {sec.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Roll Number</label>
                  <input
                    type="text"
                    name="rollNumber"
                    value={formData.rollNumber}
                    onChange={handleChange}
                    placeholder="e.g. 15"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="form-label">Admission Number *</label>
                  <input
                    type="text"
                    name="admissionNumber"
                    required
                    value={formData.admissionNumber}
                    onChange={handleChange}
                    className="input-field font-mono"
                  />
                </div>

                <div>
                  <label className="form-label">Admission Date</label>
                  <input
                    type="date"
                    name="admissionDate"
                    value={formData.admissionDate}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="form-label">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="input-field"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="form-label">School House</label>
                  <select
                    name="house"
                    value={formData.house}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="">None / Not Assigned</option>
                    {houses.map(h => (
                      <option key={h._id} value={h._id}>{h.name} ({h.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Enrollment Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="active">Active (Enrolled)</option>
                    <option value="transferred">Transferred (TC Issued)</option>
                    <option value="withdrawn">Withdrawn</option>
                    <option value="alumni">Alumni / Graduated</option>
                  </select>
                </div>
              </FormGrid>
            </FormSection>

            {/* Section 2: Personal Information */}
            <FormSection title="Student Personal Information" icon={FiUser}>
              <FormGrid>
                <div>
                  <label className="form-label">First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="form-label">Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="form-label">Gender *</label>
                  <select
                    name="gender"
                    required
                    value={formData.gender}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="form-label">Blood Group</label>
                  <select
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleChange}
                    className="input-field"
                  >
                    {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>

                <div>
                  <label className="form-label">Aadhaar Number</label>
                  <input
                    type="text"
                    name="aadhaarNumber"
                    maxLength={12}
                    value={formData.aadhaarNumber}
                    onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                    className="input-field font-mono"
                  />
                </div>

                <div>
                  <label className="form-label">Portal Email *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    disabled={user.role !== 'super_admin'}
                    value={formData.email}
                    onChange={handleChange}
                    className="input-field"
                  />
                  {user.role !== 'super_admin' && (
                    <span className="text-[11px] text-slate-400">Email can only be modified by Super Admin</span>
                  )}
                </div>

                <div>
                  <label className="form-label">Primary Mobile Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="input-field"
                  />
                </div>
              </FormGrid>
            </FormSection>

            {/* Section 3: Parents & Guardian Details */}
            <FormSection title="Parents & Guardian Details" icon={FiShield}>
              <FormGrid>
                <div>
                  <label className="form-label">Father's Name</label>
                  <input
                    type="text"
                    name="fatherName"
                    value={formData.fatherName}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="form-label">Father's Mobile</label>
                  <input
                    type="tel"
                    name="fatherPhone"
                    maxLength={10}
                    value={formData.fatherPhone}
                    onChange={(e) => setFormData({ ...formData, fatherPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="form-label">Mother's Name</label>
                  <input
                    type="text"
                    name="motherName"
                    value={formData.motherName}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="form-label">Guardian Emergency Contact</label>
                  <input
                    type="text"
                    name="guardianName"
                    value={formData.guardianName}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="form-label">Guardian Phone</label>
                  <input
                    type="tel"
                    name="guardianPhone"
                    maxLength={10}
                    value={formData.guardianPhone}
                    onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="form-label">Relation with Guardian</label>
                  <select
                    name="guardianRelation"
                    value={formData.guardianRelation}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="Parent">Parent</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                  </select>
                </div>
              </FormGrid>
            </FormSection>

            {/* Section 4: Residential Address */}
            <FormSection title="Residential Address" icon={FiHome}>
              <FormGrid>
                <div className="md:col-span-2">
                  <label className="form-label">Street Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows="2"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="form-label">State</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="form-label">Pincode</label>
                  <input
                    type="text"
                    name="pincode"
                    maxLength={6}
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    className="input-field font-mono"
                  />
                </div>
              </FormGrid>
            </FormSection>

            {/* Section 5: Previous School Record */}
            <FormSection title="Previous School Background" icon={FiAward}>
              <FormGrid>
                <div>
                  <label className="form-label">Previous School Name</label>
                  <input
                    type="text"
                    name="schoolOrCollege"
                    value={formData.schoolOrCollege}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="form-label">Board / Affiliation</label>
                  <input
                    type="text"
                    name="boardOrUniversity"
                    value={formData.boardOrUniversity}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="form-label">Passing Year</label>
                  <input
                    type="number"
                    name="yearOfPassing"
                    value={formData.yearOfPassing}
                    onChange={handleChange}
                    className="input-field font-mono"
                  />
                </div>

                <div>
                  <label className="form-label">Percentage / GPA</label>
                  <input
                    type="number"
                    step="0.1"
                    name="percentage"
                    value={formData.percentage}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
              </FormGrid>
            </FormSection>

            {/* Section 6: Documents & Identity Proofs */}
            <FormSection title="Student Identity Documents" icon={FiFileText}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <DocumentUploadPreview 
                  name="aadhaarCardFront" 
                  label="Aadhaar (Front)" 
                  fileName={docFiles.aadhaarCardFront?.name} 
                  onChange={handleDocFileChange} 
                  onRemove={() => handleRemoveFile('aadhaarCardFront')} 
                  accept="image/*,.pdf"
                />
                <DocumentUploadPreview 
                  name="aadhaarCardBack" 
                  label="Aadhaar (Back)" 
                  fileName={docFiles.aadhaarCardBack?.name} 
                  onChange={handleDocFileChange} 
                  onRemove={() => handleRemoveFile('aadhaarCardBack')} 
                  accept="image/*,.pdf"
                />
                <DocumentUploadPreview 
                  name="signature" 
                  label="Parent / Student Signature" 
                  fileName={docFiles.signature?.name} 
                  onChange={handleDocFileChange} 
                  onRemove={() => handleRemoveFile('signature')} 
                  accept="image/*,.pdf"
                />
                <DocumentUploadPreview 
                  name="lastMarksheet" 
                  label="Previous School Marksheet" 
                  fileName={docFiles.lastMarksheet?.name} 
                  onChange={handleDocFileChange} 
                  onRemove={() => handleRemoveFile('lastMarksheet')} 
                  accept="image/*,.pdf"
                />
              </div>

              {Object.values(filePreviews).some(p => p) && (
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Saved Document Previews</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {Object.entries(filePreviews).map(([name, preview]) => preview && (
                      <div key={name} className="relative group border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-1">
                        <img src={preview} alt={name} className="w-full h-24 object-contain rounded-lg" />
                        <span className="block text-center text-[10px] text-slate-500 font-medium mt-1 truncate capitalize">
                          {name.replace(/([A-Z])/g, ' $1')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </FormSection>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(`/admin/students/${id}`)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                icon={FiSave}
              >
                Save Student Record
              </Button>
            </div>

          </FormPageLayout>
        </form>
      </div>
    </Layout>
  );
};

export default EditStudent;
