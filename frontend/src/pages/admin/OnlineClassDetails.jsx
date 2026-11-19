import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiEdit2, FiVideo, FiClock, FiUsers, FiInfo, FiPaperclip, FiUserCheck } from 'react-icons/fi';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { getOnlineClass, addClassMaterial } from '../../api/onlineClassApi';
import { useAuth } from '../../context/AuthContext';
import {
  Card, CardHeader, StatCard, Badge, StatusBadge, Button, PageLoading, EmptyState,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell,
} from '../../components/ui';

const OnlineClassDetails = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [onlineClass, setOnlineClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchClassDetails();
  }, [classId]);

  // Listen for real-time participant updates
  useEffect(() => {
    const handleParticipantJoined = (event) => {
      const data = event.detail;
      
      if (data.classId === classId) {
        // Refresh class details to show new participant
        fetchClassDetails();
      }
    };

    const handleParticipantLeft = (event) => {
      const data = event.detail;
      
      if (data.classId === classId) {
        // Refresh class details to update participant list
        fetchClassDetails();
      }
    };

    window.addEventListener('class-participant-joined', handleParticipantJoined);
    window.addEventListener('class-participant-left', handleParticipantLeft);
    
    return () => {
      window.removeEventListener('class-participant-joined', handleParticipantJoined);
      window.removeEventListener('class-participant-left', handleParticipantLeft);
    };
  }, [classId]);

  const fetchClassDetails = async () => {
    try {
      setLoading(true);
      const response = await getOnlineClass(classId);
      console.log('Online class data:', response.data);
      console.log('Instructor data:', response.data.instructor);
      setOnlineClass(response.data);
    } catch (error) {
      console.error('Error fetching online class details:', error);
      toast.error('Failed to fetch class details');
    } finally {
      setLoading(false);
    }
  };

  const handleMaterialUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a file to upload.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('material', selectedFile);

    try {
      const response = await addClassMaterial(classId, formData);
      setOnlineClass(prev => ({ ...prev, materials: response.data }));
      toast.success('Material uploaded successfully!');
      setSelectedFile(null);
      e.target.reset(); // Reset the form
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload material.');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Online Class Details" subtitle="View class information and materials" icon={FiVideo} />
        <PageLoading message="Loading class details..." />
      </Layout>
    );
  }

  if (!onlineClass) {
    return (
      <Layout>
        <PageHeader title="Online Class Details" subtitle="View class information and materials" icon={FiVideo} />
        <Card>
          <EmptyState
            icon={FiVideo}
            title="Online Class not found"
            action={<Button icon={FiArrowLeft} onClick={() => navigate(`${routePrefix}/online-classes`)}>Back to Online Classes</Button>}
          />
        </Card>
      </Layout>
    );
  }

  const routePrefix = user.role === 'super_admin' ? '/admin' : '/school';
  const canEditClass = ['super_admin', 'school_admin'].includes(user.role);

  const instructorName = (() => {
    const instructor = onlineClass.instructor;
    if (!instructor) return 'N/A';
    if (instructor.personalInfo) {
      const firstName = instructor.personalInfo.firstName || '';
      const lastName = instructor.personalInfo.lastName || '';
      if (firstName || lastName) return `${firstName} ${lastName}`.trim();
    }
    if (instructor.name) return instructor.name;
    if (instructor.firstName || instructor.lastName) return `${instructor.firstName || ''} ${instructor.lastName || ''}`.trim();
    if (typeof instructor === 'string') return instructor;
    return 'N/A';
  })();

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title={onlineClass.title}
          subtitle={onlineClass.course?.title}
          icon={FiVideo}
          actions={(
            <>
              <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate(`${routePrefix}/online-classes`)}>
                <span className="hidden sm:inline">Back</span>
              </Button>
              {canEditClass && (
                <Button icon={FiEdit2} onClick={() => navigate(`${routePrefix}/online-classes/${classId}/edit`)}>
                  Edit Class
                </Button>
              )}
            </>
          )}
        />

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={onlineClass.status} />
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Scheduled Date" tone="info" icon={FiVideo} value={new Date(onlineClass.scheduledDate).toLocaleDateString()} />
          <StatCard title="Time & Duration" tone="warning" icon={FiClock} value={`${new Date(onlineClass.scheduledDate).toLocaleTimeString()} (${onlineClass.duration} mins)`} />
          <StatCard title="Instructor" tone="purple" icon={FiUsers} value={instructorName} />
          <StatCard title="Participants" tone="success" icon={FiUserCheck} value={`${onlineClass.participants.length} / ${onlineClass.maxParticipants}`} />
        </div>

        {/* Tabs */}
        <Card padded={false} className="overflow-hidden">
          <div className="border-b border-slate-200">
            <div className="flex flex-wrap gap-3 px-4 sm:px-6">
              <button onClick={() => setActiveTab('overview')} className={`py-4 px-2 border-b-2 font-medium transition-colors ${activeTab === 'overview' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><FiInfo className="inline mr-2"/>Overview</button>
              {user.role !== 'student' && (
                <button onClick={() => setActiveTab('participants')} className={`py-4 px-2 border-b-2 font-medium transition-colors ${activeTab === 'participants' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><FiUsers className="inline mr-2"/>Participants ({onlineClass.participants.length})</button>
              )}
              <button onClick={() => setActiveTab('materials')} className={`py-4 px-2 border-b-2 font-medium transition-colors ${activeTab === 'materials' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><FiPaperclip className="inline mr-2"/>Materials ({onlineClass.materials.length})</button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">Class Details</h3>
                <p className="text-slate-600">{onlineClass.description}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-slate-700">
                    <div><strong>Course:</strong> {onlineClass.course?.title}</div>
                    <div><strong>Platform:</strong> {onlineClass.platform}</div>
                    <div><strong>Meeting ID:</strong> {onlineClass.meetingId}</div>
                    <div><strong>Password:</strong> {onlineClass.password}</div>
                    <div><strong>Meeting Link:</strong> <a href={onlineClass.meetingLink} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">{onlineClass.meetingLink}</a></div>
                </div>
                {onlineClass.notes && <div className="text-slate-700"><strong>Notes:</strong><p>{onlineClass.notes}</p></div>}
              </div>
            )}
            {activeTab === 'participants' && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Participants ({onlineClass.participants.length})</h3>
                {onlineClass.participants.length === 0 ? (
                  <EmptyState icon={FiUsers} title="No participants have joined this class yet." />
                ) : (
                  <TableWrapper>
                    <Table>
                      <TableHead>
                        <tr>
                          <TableHeader>Student</TableHeader>
                          <TableHeader>Joined At</TableHeader>
                          <TableHeader>Left At</TableHeader>
                          <TableHeader>Duration</TableHeader>
                        </tr>
                      </TableHead>
                      <TableBody>
                        {onlineClass.participants.map(p => {
                          const student = p.student;
                          const studentName = (() => {
                            if (!student) return 'N/A';
                            if (student.personalInfo) {
                              const firstName = student.personalInfo.firstName || '';
                              const lastName = student.personalInfo.lastName || '';
                              if (firstName || lastName) return `${firstName} ${lastName}`.trim();
                            }
                            if (student.name) return student.name;
                            if (student.fullName) return student.fullName;
                            return 'N/A';
                          })();
                          return (
                            <TableRow key={p._id}>
                              <TableCell className="!whitespace-normal">
                                <div className="font-medium text-slate-900">{studentName}</div>
                                <div className="text-slate-500">{p.student?.email || 'N/A'}</div>
                              </TableCell>
                              <TableCell className="text-slate-500">{new Date(p.joinedAt).toLocaleString()}</TableCell>
                              <TableCell className="text-slate-500">{p.leftAt ? new Date(p.leftAt).toLocaleString() : 'Still in class'}</TableCell>
                              <TableCell className="text-slate-500">{p.duration ? `${p.duration} mins` : '-'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableWrapper>
                )}
              </div>
            )}
            {activeTab === 'materials' && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Class Materials ({onlineClass.materials.length})</h3>
                
                {/* Upload Form for Admins/Instructors */}
                {(user.role === 'super_admin' || ['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) || user.id === onlineClass.instructor?._id) && (
                  <div className="mb-6 p-4 border border-slate-200 rounded-lg bg-slate-50">
                    <h4 className="font-semibold text-slate-800 mb-2">Upload New Material</h4>
                    <form onSubmit={handleMaterialUpload} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                      <input 
                        type="file" 
                        onChange={(e) => setSelectedFile(e.target.files[0])} 
                        className="flex-grow p-2 border border-slate-300 rounded-lg"
                        required 
                      />
                      <Button type="submit" loading={uploading} disabled={uploading}>
                        {uploading ? 'Uploading...' : 'Upload'}
                      </Button>
                    </form>
                  </div>
                )}

                {onlineClass.materials.length === 0 ? (
                  <EmptyState icon={FiPaperclip} title="No materials have been uploaded for this class yet." />
                ) : (
                  <ul className="space-y-3">
                    {onlineClass.materials.map(material => (
                      <li key={material._id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-slate-200">
                        <div className="flex items-center">
                          <FiPaperclip className="mr-3 text-slate-500" />
                          <span className="text-slate-800 font-medium">{material.name}</span>
                        </div>
                        <Button as="a" href={material.url} target="_blank" rel="noopener noreferrer" variant="success" className="!px-3 !py-1 !text-sm">Download</Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default OnlineClassDetails;
