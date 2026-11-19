import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { FiAward, FiArrowLeft, FiCalendar } from 'react-icons/fi';
import { getAllStudents, getStudentEnrolledCourses } from '../../api/studentApi';
import { getAllFranchises } from '../../api/campusApi';
import { getStudentCertificateTemplates, generateStudentCertificate, downloadGeneratedStudentCertificate } from '../../api/studentCertificateApi';
import CustomFieldsForm from '../../components/template-editor/CustomFieldsForm';
import { getCustomTextFields } from '../../components/template-editor/templateFieldUtils';
import { useAuth } from '../../context/AuthContext';
import {
  Button, FormPageLayout, FormSection, FormGrid, SelectField,
} from '../../components/ui';

const GenerateStudentCertificate = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [studentCourses, setStudentCourses] = useState({});
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [franchiseFilter, setFranchiseFilter] = useState('');
  
  const [formData, setFormData] = useState({
    studentId: '',
    courseId: '',
    templateId: '',
    issueDate: new Date().toISOString().slice(0, 10),
  });
  const [customFieldValues, setCustomFieldValues] = useState({});

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (formData.studentId) {
      fetchStudentCourses(formData.studentId);
    } else {
      setStudentCourses({});
      setFormData(prev => ({ ...prev, courseId: '', templateId: '' }));
      setFilteredTemplates([]);
    }
  }, [formData.studentId]);

  useEffect(() => {
    if (formData.courseId) {
      const enrollment = studentCourses[formData.studentId]?.find(e => e.course?._id === formData.courseId);
      const student = students.find(s => s._id === formData.studentId);
      
      if (enrollment?.course && student) {
        const courseTitle = enrollment.course.title;
        
        // For Super Admin, show ALL templates for this course (both Main Branch and School)
        // For School Admin, only show templates matching the student's branch type
        let matchingTemplates;
        
        if (user?.role === 'super_admin') {
          // Super Admin can see and choose ANY template for the course
          matchingTemplates = templates.filter(t => 
            t.courseType === courseTitle
          );
        } else {
          // School admin - filter by student's branch type
          const isMainBranch = student.franchise?.isMainBranch || false;
          const targetType = isMainBranch ? 'main_branch' : 'franchise';
          
          matchingTemplates = templates.filter(t => 
            t.courseType === courseTitle && 
            (t.targetType === targetType || !t.targetType)
          );
        }
        
        console.log(`📋 Templates found for "${courseTitle}":`, matchingTemplates.length);
        console.log('Available templates:', matchingTemplates.map(t => ({ name: t.name, targetType: t.targetType })));
        
        setFilteredTemplates(matchingTemplates);
        if (formData.templateId !== 'default' && !matchingTemplates.some(t => t._id === formData.templateId)) {
          setFormData(prev => ({ ...prev, templateId: '' }));
        }
      } else {
        setFilteredTemplates([]);
        setFormData(prev => ({ ...prev, templateId: '' }));
      }
    } else {
      setFilteredTemplates([]);
    }
  }, [formData.courseId, studentCourses, templates, user, students, formData.studentId]);

  useEffect(() => {
    setCustomFieldValues({});
  }, [formData.templateId]);

  const selectedTemplate = filteredTemplates.find((t) => t._id === formData.templateId)
    || templates.find((t) => t._id === formData.templateId);
  const selectedStudent = students.find((student) => student._id === formData.studentId);
  const defaultTemplateLabel = selectedStudent?.franchise?.isMainBranch
    ? 'Default Certificate - Main Branch'
    : 'Default Certificate - Franchise';

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      if (['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role)) {
        // For school admin, only fetch students and templates
        const [studentsRes, templatesRes] = await Promise.all([
          getAllStudents({ picker: true, limit: 100 }),
          getStudentCertificateTemplates(),
        ]);
        setStudents(studentsRes.data || []);
        setTemplates(templatesRes.data || []);
      } else {
        // For super admin, fetch everything
        const [studentsRes, templatesRes, franchisesRes] = await Promise.all([
          getAllStudents({ picker: true, limit: 100 }),
          getStudentCertificateTemplates(),
          getAllFranchises(),
        ]);
        setStudents(studentsRes.data || []);
        setTemplates(templatesRes.data || []);
        setFranchises(franchisesRes.data || []);
      }
    } catch (error) {
      toast.error('Failed to fetch data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentCourses = async (studentId) => {
    try {
      const enrolledRes = await getStudentEnrolledCourses(studentId);
      setStudentCourses(prev => ({
        ...prev,
        [studentId]: enrolledRes.data || []
      }));
    } catch (error) {
      console.error('Error fetching student courses:', error);
      setStudentCourses(prev => ({
        ...prev,
        [studentId]: []
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.studentId || !formData.courseId || !formData.templateId) {
      toast.error('Please select a student, course, and template');
      return;
    }

    const customFields = getCustomTextFields(selectedTemplate?.fields);
    for (let i = 0; i < customFields.length; i += 1) {
      const field = customFields[i];
      if (!customFieldValues[field.fieldName]?.trim()) {
        const label = customFields.length > 1 ? `custom text field ${i + 1}` : 'value to print';
        toast.error(`Please enter ${label}`);
        return;
      }
    }

    setLoading(true);
    try {
      const result = await generateStudentCertificate(formData.studentId, {
        courseId: formData.courseId,
        templateId: formData.templateId,
        issueDate: formData.issueDate,
        customFieldValues
      });

      toast.success('Certificate generated successfully!');
      navigate(['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) ? '/school/certificates' : '/admin/student-certificates');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate certificate');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const searchLower = searchTerm.toLowerCase();
    const firstName = student.personalInfo?.firstName?.toLowerCase() || '';
    const lastName = student.personalInfo?.lastName?.toLowerCase() || '';
    const studentId = student.studentId?.toLowerCase() || '';
    const email = (student.personalInfo?.email || student.email || '').toLowerCase();
    
    const matchesSearch = firstName.includes(searchLower) ||
                   lastName.includes(searchLower) ||
                   studentId.includes(searchLower) ||
                   email.includes(searchLower);
    
    // For super admin, apply school filter if selected
    if (user.role === 'super_admin' && franchiseFilter) {
      const studentFranchiseId = student.franchise?._id ? student.franchise._id : student.franchise;
      return matchesSearch && studentFranchiseId === franchiseFilter;
    }
    
    // For school admin, backend already filtered, just apply search
    return matchesSearch;
  });

  // Debug logging
  console.log('Students data:', students);
  console.log('User info:', user);
  console.log('Filtered students count:', filteredStudents.length);

  const backTo = ['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) ? '/school/certificates' : '/admin/student-certificates';

  return (
    <Layout>
      <PageHeader 
        title="Generate Student Certificate" 
        subtitle="Create a new completion certificate for a student"
        icon={FiAward}
        actions={(
          <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate(backTo)}>
            Back to Management
          </Button>
        )}
      />

      <form onSubmit={handleSubmit}>
        <FormPageLayout
          footer={(
            <Button type="submit" loading={loading} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Certificate'}
            </Button>
          )}
        >
          <FormSection title="Certificate Details" icon={FiAward}>
            <FormGrid cols={2}>
              {user.role === 'super_admin' && (
                <SelectField
                  label="Filter by Campus"
                  value={franchiseFilter}
                  onChange={(e) => setFranchiseFilter(e.target.value)}
                >
                  <option value="">All Campuses</option>
                  {franchises.map(franchise => (
                    <option key={franchise._id} value={franchise._id}>
                      {franchise.name} ({franchise.code})
                    </option>
                  ))}
                </SelectField>
              )}
              <SelectField
                label="Student *"
                name="studentId"
                value={formData.studentId}
                onChange={handleInputChange}
                required
                className={['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) ? 'md:col-span-2' : ''}
              >
                <option value="">Select a Student</option>
                {filteredStudents.map(student => (
                  <option key={student._id} value={student._id}>
                    {student.personalInfo?.firstName} {student.personalInfo?.lastName} ({student.studentId}) - {student.personalInfo?.email || student.email || ''}
                  </option>
                ))}
              </SelectField>
            </FormGrid>

            <SelectField
              label="Course *"
              name="courseId"
              value={formData.courseId}
              onChange={handleInputChange}
              required
              disabled={!formData.studentId}
              className="mt-4"
            >
              <option value="">Select a Course</option>
              {(studentCourses[formData.studentId] || []).map((enrollment) => (
                <option key={enrollment.enrollmentId || enrollment._id} value={enrollment.course?._id}>
                  {enrollment.course?.courseCode ? `${enrollment.course.courseCode} - ${enrollment.course.title}` : enrollment.course?.title || 'Unknown Course'}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Template *"
              name="templateId"
              value={formData.templateId}
              onChange={handleInputChange}
              required
              disabled={!formData.courseId}
              className="mt-4"
            >
              <option value="">Select a Template</option>
              <option value="default">{defaultTemplateLabel}</option>
              {filteredTemplates.map(template => (
                <option key={template._id} value={template._id}>
                  {template.name} ({template.courseType}) - {template.targetType === 'main_branch' ? 'Main Branch' : 'Franchise'}
                </option>
              ))}
              {filteredTemplates.length === 0 && (
                <option value="" disabled>No templates available for this course</option>
              )}
            </SelectField>

            <div className="mt-4">
              <label htmlFor="certificate-issue-date" className="block text-sm font-medium text-slate-700 mb-1">
                Certificate Date *
              </label>
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="certificate-issue-date"
                  type="date"
                  name="issueDate"
                  value={formData.issueDate}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-slate-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">Choose an earlier date when issuing a back-dated certificate.</p>
            </div>

            <div className="mt-4">
              <CustomFieldsForm
                template={selectedTemplate}
                values={customFieldValues}
                onChange={setCustomFieldValues}
              />
            </div>
          </FormSection>
        </FormPageLayout>
      </form>
    </Layout>
  );
};

export default GenerateStudentCertificate;
