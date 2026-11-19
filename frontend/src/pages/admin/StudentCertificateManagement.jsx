import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import {
  getStudentCertificateTemplates,
  deleteStudentCertificateTemplate,
  getGeneratedStudentCertificates,
  downloadGeneratedStudentCertificate,
  getStudentCertificateBlobUrl,
  deleteStudentCertificate
} from '../../api/studentCertificateApi';
import { getAllFranchises } from '../../api/campusApi';
import { toast } from 'react-toastify';
import { FiDownload, FiPlus, FiEdit2, FiTrash2, FiEye, FiFileText, FiSettings, FiAward, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { toAbsoluteUrl } from '../../utils/url';
import {
  StatCard, PageLoading, LoadingSpinner, FilterBar, FilterBarActions, SearchInput, SelectField,
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  IconButton, Badge, Modal, Card,
} from '../../components/ui';

const StudentCertificateManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [generatedCertificates, setGeneratedCertificates] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [certsLoading, setCertsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [activeTab, setActiveTab] = useState('generated');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [generatedCertificatesCurrentPage, setGeneratedCertificatesCurrentPage] = useState(1);
  const [totalGeneratedCertificates, setTotalGeneratedCertificates] = useState(0);
  const [totalGeneratedPages, setTotalGeneratedPages] = useState(1);
  const [stats, setStats] = useState({ total: 0, active: 0, revoked: 0 });
  const [preview, setPreview] = useState({ isOpen: false, url: '', title: '' });

  const [generatedCertsFilters, setGeneratedCertsFilters] = useState({
    search: '',
    status: 'all'
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Fetch initial data (only generated certificates & schools to load fast)
  useEffect(() => {
    getAllFranchises().then(res => setFranchises(res.data || [])).catch(() => {});
  }, []);

  // Debounce search and reset pagination when the query changes.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(generatedCertsFilters.search.trim());
      setGeneratedCertificatesCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [generatedCertsFilters.search]);

  useEffect(() => {
    fetchGeneratedCertificates();
  }, [generatedCertificatesCurrentPage, generatedCertsFilters.status, debouncedSearch, itemsPerPage]);

  // Load templates only when templates tab is selected
  useEffect(() => {
    if (activeTab === 'templates' && templates.length === 0) {
      loadTemplates();
    }
  }, [activeTab]);

  const fetchGeneratedCertificates = async () => {
    setCertsLoading(true);
    try {
      const generatedRes = await getGeneratedStudentCertificates({
        page: generatedCertificatesCurrentPage,
        limit: itemsPerPage,
        search: debouncedSearch || undefined,
        status: generatedCertsFilters.status
      });

      const certsData = generatedRes.data || [];
      setGeneratedCertificates(certsData);
      setTotalGeneratedCertificates(generatedRes.total !== undefined ? generatedRes.total : certsData.length);
      setTotalGeneratedPages(generatedRes.totalPages || Math.ceil((generatedRes.total || certsData.length) / itemsPerPage) || 1);
      if (generatedRes.activeCount !== undefined) {
        setStats({ total: generatedRes.total, active: generatedRes.activeCount, revoked: generatedRes.revokedCount });
      }
    } catch (error) {
      console.error('Error fetching generated certificates:', error);
      toast.error('Failed to load certificates');
    } finally {
      setLoading(false);
      setCertsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const templatesRes = await getStudentCertificateTemplates();
      setTemplates(templatesRes.data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchData = async () => {
    fetchGeneratedCertificates();
    if (activeTab === 'templates') {
      loadTemplates();
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await deleteStudentCertificateTemplate(templateId);
      toast.success('Template deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleEditTemplate = (templateId) => {
    const basePath = ['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) ? '/school' : '/admin';
    navigate(`${basePath}/student-certificates/templates/edit/${templateId}`);
  };

  const handlePreviewCertificate = async (certificateId, studentName) => {
    try {
      setBusy(true);
      const url = await getStudentCertificateBlobUrl(certificateId);

      // We need the metadata from the list to populate the preview modal properly
      const certificate = generatedCertificates.find(cert => cert._id === certificateId);

      setPreview({
        isOpen: true,
        url: url, // This is already a blob URL from the API utility
        title: studentName,
        id: certificateId,
        // Since we excluded 'file' from list, we rely on the blob URL for the image
        file: null,
        qrCode: certificate?.qrCode,
        issueDate: certificate?.issueDate,
        status: certificate?.status,
        verificationCode: certificate?.verificationCode
      });
    } catch (error) {
      toast.error('Failed to load preview');
      console.error('Preview error:', error);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCertificate = async (certificateId, studentName) => {
    if (!window.confirm(`Are you sure you want to delete the certificate for ${studentName}?`)) {
      return;
    }

    try {
      await deleteStudentCertificate(certificateId);
      toast.success('Certificate deleted successfully');
      fetchData(); // Refresh the list
    } catch (error) {
      console.error('Error deleting certificate:', error);
      toast.error('Failed to delete certificate');
    }
  };

  const handleDownloadGeneratedCertificate = async (certificateId, studentName) => {
    setDownloading(certificateId);
    try {
      await downloadGeneratedStudentCertificate(certificateId, `Certificate_${studentName.replace(/ /g, '_')}.png`);
      toast.success('Certificate downloaded successfully');
    } catch (error) {
      toast.error('Failed to download certificate');
      console.error('Download error:', error);
    } finally {
      setDownloading(null);
    }
  };

  // Pagination logic for templates
  const totalPages = Math.ceil(templates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTemplates = templates.slice(startIndex, endIndex);

  // Server paginated certificates
  const paginatedGeneratedCertificates = generatedCertificates;

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  const activeCount = generatedCertificates.filter((c) => c.status === 'active' || !c.status).length;
  const revokedCount = generatedCertificates.filter((c) => c.status === 'revoked').length;

  const goToGenerate = () => {
    const generateRoute = ['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role)
      ? '/school/certificates/generate'
      : '/admin/student-certificates/generate';
    navigate(generateRoute);
  };

  const goToNewTemplate = () => {
    const basePath = ['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) ? '/school' : '/admin';
    navigate(`${basePath}/student-certificates/templates/new`);
  };

  const tabClass = (tab) =>
    `py-3 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-2 transition-colors ${
      activeTab === tab
        ? 'border-primary-500 text-primary-600'
        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
    }`;

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Student Certificate Management" subtitle="Manage student completion certificates and templates" icon={FiAward} />
        <PageLoading message="Loading certificates..." />
      </Layout>
    );
  }

  return (
    <Layout>
      {busy && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-pop px-5 py-4 flex items-center gap-3">
            <LoadingSpinner size="sm" />
            <span className="text-sm font-medium text-slate-700">Please wait...</span>
          </div>
        </div>
      )}
      <div className="space-y-5">
        <PageHeader
          title="Student Certificate Management"
          subtitle="Manage student completion certificates and templates"
          icon={FiAward}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Certificates" tone="info" icon={FiAward} value={stats.total || totalGeneratedCertificates} />
          <StatCard title="Active" tone="success" icon={FiCheckCircle} value={stats.active} />
          <StatCard title="Revoked" tone="danger" icon={FiXCircle} value={stats.revoked} />
          <StatCard title="Templates" tone="purple" icon={FiFileText} value={templates.length} />
        </div>

        <Card padded={false}>
          <div className="border-b border-slate-200 px-4 sm:px-5">
            <nav className="-mb-px flex space-x-6 overflow-x-auto">
              <button type="button" onClick={() => setActiveTab('generated')} className={tabClass('generated')}>
                <FiFileText /> Generated Certificates
              </button>
              {user.role === 'super_admin' && (
                <button type="button" onClick={() => setActiveTab('templates')} className={tabClass('templates')}>
                  <FiSettings /> Manage Templates
                </button>
              )}
            </nav>
          </div>

          {activeTab === 'generated' && (
            <div className="p-4 sm:p-5 space-y-4">
              <FilterBar>
                <SearchInput
                  className="flex-1 max-w-md"
                  value={generatedCertsFilters.search}
                  onChange={(e) => setGeneratedCertsFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Search by student name or ID..."
                />
                <FilterBarActions>
                  <SelectField
                    value={generatedCertsFilters.status}
                    onChange={(e) => setGeneratedCertsFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="min-w-[130px]"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="revoked">Revoked</option>
                  </SelectField>
                  <Button icon={FiPlus} onClick={goToGenerate}>Generate Certificate</Button>
                </FilterBarActions>
              </FilterBar>

              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeader>Student</TableHeader>
                      <TableHeader>Course</TableHeader>
                      <TableHeader>Certificate ID</TableHeader>
                      <TableHeader>Issue Date</TableHeader>
                      <TableHeader>Actions</TableHeader>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {certsLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-12 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <LoadingSpinner size="md" />
                            <span className="text-xs text-slate-500">Loading certificates...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : paginatedGeneratedCertificates.length === 0 ? (
                      <TableEmpty colSpan={5} title="No certificates found" description="Try adjusting your filters or generate a new certificate." />
                    ) : (
                      paginatedGeneratedCertificates.map((certificate) => {
                        const studentName = `${certificate.student?.personalInfo.firstName} ${certificate.student?.personalInfo.lastName}`;
                        return (
                          <TableRow key={certificate._id}>
                            <TableCell className="!whitespace-normal">
                              <div className="text-sm font-medium text-slate-800">{studentName}</div>
                              <div className="text-xs text-slate-500">{certificate.student?.studentId}</div>
                            </TableCell>
                            <TableCell>{certificate.course?.title}</TableCell>
                            <TableCell>
                              <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                                {certificate.certificateNumber || 'N/A'}
                              </span>
                            </TableCell>
                            <TableCell>{new Date(certificate.issueDate).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-0.5">
                                <IconButton icon={FiEye} variant="primary" title="Preview" onClick={() => handlePreviewCertificate(certificate._id, studentName)} />
                                <IconButton icon={FiDownload} variant="success" title={downloading === certificate._id ? 'Downloading...' : 'Download'} disabled={downloading === certificate._id} onClick={() => handleDownloadGeneratedCertificate(certificate._id, `${certificate.student?.personalInfo.firstName}_${certificate.student?.personalInfo.lastName}`)} />
                                <IconButton icon={FiTrash2} variant="danger" title="Delete" onClick={() => handleDeleteCertificate(certificate._id, studentName)} />
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                <Pagination
                  currentPage={generatedCertificatesCurrentPage}
                  totalPages={totalGeneratedPages}
                  onPageChange={setGeneratedCertificatesCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={totalGeneratedCertificates}
                  onItemsPerPageChange={(newItemsPerPage) => {
                    setItemsPerPage(newItemsPerPage);
                    setGeneratedCertificatesCurrentPage(1);
                  }}
                />
              </TableWrapper>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="section-title">Certificate Templates</h3>
                <Button icon={FiPlus} onClick={goToNewTemplate}>Add Template</Button>
              </div>

              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeader>Template</TableHeader>
                      <TableHeader>Description</TableHeader>
                      <TableHeader>Course Type</TableHeader>
                      <TableHeader>Fields</TableHeader>
                      <TableHeader>Target</TableHeader>
                      <TableHeader>Created</TableHeader>
                      <TableHeader>Actions</TableHeader>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {paginatedTemplates.length === 0 ? (
                      <TableEmpty colSpan={7} title="No templates found" description="Get started by creating your first certificate template." />
                    ) : (
                      paginatedTemplates.map((template) => (
                        <TableRow key={template._id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <img className="h-10 w-10 rounded object-cover border border-slate-200 flex-shrink-0" src={toAbsoluteUrl(template.templateImage)} alt={template.name} />
                              <span className="text-sm font-medium text-slate-800">{template.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="!whitespace-normal max-w-xs text-slate-500">{template.description || 'No description'}</TableCell>
                          <TableCell><Badge variant="primary">{template.courseType || 'custom'}</Badge></TableCell>
                          <TableCell>{template.fields?.length || 0}</TableCell>
                          <TableCell>
                            <Badge variant={template.targetType === 'main_branch' ? 'primary' : 'success'}>
                              {template.targetType === 'main_branch' ? 'Main Campus' : 'Branch Campus'}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(template.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-0.5">
                              <IconButton icon={FiEdit2} variant="primary" title="Edit Template" onClick={() => handleEditTemplate(template._id)} />
                              <IconButton icon={FiTrash2} variant="danger" title="Delete Template" onClick={() => handleDeleteTemplate(template._id)} />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  itemsPerPage={itemsPerPage}
                  totalItems={templates.length}
                  onItemsPerPageChange={handleItemsPerPageChange}
                />
              </TableWrapper>
            </div>
          )}
        </Card>
      </div>

      {/* Preview Modal */}
      <Modal
        open={preview.isOpen}
        onClose={() => setPreview({ isOpen: false, url: '', title: '' })}
        title={`Certificate Preview: ${preview.title || ''}`}
        size="full"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPreview({ isOpen: false, url: '', title: '' })}>Close</Button>
            <Button icon={FiDownload} onClick={() => handleDownloadGeneratedCertificate(preview.id, preview.title || 'Certificate')}>Download</Button>
          </>
        }
      >
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 flex justify-center bg-slate-100 rounded-lg p-3">
            <img
              src={preview.url}
              alt="Certificate Preview"
              className="max-w-full h-auto border border-slate-200 rounded shadow-sm"
              onError={(e) => console.error('Image load error:', e)}
            />
          </div>
          {preview.qrCode && (
            <div className="w-full lg:w-64 flex-shrink-0">
              <h4 className="text-sm font-medium text-slate-800 mb-2">Verification QR Code</h4>
              <div className="border border-slate-200 rounded p-2 bg-white">
                <img src={preview.qrCode} alt="Verification QR Code" className="w-full" />
              </div>
              <p className="text-xs text-slate-500 text-center mt-3">Scan to verify certificate</p>
              <div className="text-xs text-slate-400 bg-slate-50 rounded p-2 mt-2 font-mono break-all">
                {`${window.location.origin}/verify-certificate?student=${preview.id}`}
              </div>
            </div>
          )}
        </div>
        <div className="mt-4 text-sm text-slate-600 border-t border-slate-200 pt-4 space-y-1">
          <p>Issued: {preview.issueDate ? new Date(preview.issueDate).toLocaleDateString() : 'N/A'}</p>
          <p>Status: <span className={`font-medium ${preview.status === 'revoked' ? 'text-danger-600' : 'text-success-600'}`}>{preview.status || 'Active'}</span></p>
          {preview.verificationCode && (
            <p>Verification Code: <span className="font-mono font-medium">{preview.verificationCode}</span></p>
          )}
        </div>
      </Modal>
    </Layout>
  );
};

export default StudentCertificateManagement;
