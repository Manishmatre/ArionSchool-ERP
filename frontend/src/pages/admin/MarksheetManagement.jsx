import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import { 
  getMarksheetTemplates, 
  deleteMarksheetTemplate, 
  getGeneratedMarksheets, 
  downloadMarksheet, 
  deleteMarksheet, 
  getMarksheetBlobUrl 
} from '../../api/marksheetApi';
import { toast } from 'react-toastify';
import { FiDownload, FiPlus, FiEdit2, FiTrash2, FiEye, FiFileText, FiSettings, FiPrinter } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { toAbsoluteUrl } from '../../utils/url';
import {
  LoadingSpinner, PageLoading, Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  IconButton, Badge, Modal, Card, SearchInput,
} from '../../components/ui';

const MarksheetManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Loading states: initial full-page loader vs inline table loader
  const [initialLoading, setInitialLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [previewLoadingId, setPreviewLoadingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  // Data states
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [generatedMarksheets, setGeneratedMarksheets] = useState([]);
  const [activeTab, setActiveTab] = useState('generated');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [generatedPage, setGeneratedPage] = useState(1);
  const [totalGenerated, setTotalGenerated] = useState(0);
  const [totalGeneratedPages, setTotalGeneratedPages] = useState(1);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Preview state
  const [preview, setPreview] = useState({ isOpen: false, file: null, title: '', marksheetNumber: '', issueDate: '' });

  // Debounce search query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
      setGeneratedPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch marksheets on page change or debounced search change
  useEffect(() => {
    fetchGeneratedMarksheets();
    fetchTemplates();
  }, [generatedPage, debouncedQuery]);

  // Load templates only when templates tab is clicked
  useEffect(() => {
    if (activeTab === 'templates' && templates.length === 0) fetchTemplates();
  }, [activeTab]);

  const fetchGeneratedMarksheets = async () => {
    if (initialLoading) {
      // First load: handled by initialLoading
    } else {
      setTableLoading(true);
    }

    try {
      const res = await getGeneratedMarksheets({
        page: generatedPage,
        limit: 10,
        search: debouncedQuery || undefined
      });
      const data = res.data;
      setGeneratedMarksheets(data.data || []);
      setTotalGenerated(data.total ?? (data.data || []).length);
      setTotalGeneratedPages(data.totalPages ?? 1);
    } catch (error) {
      console.error('Error fetching marksheets:', error);
      toast.error('Failed to load marksheet data');
    } finally {
      setInitialLoading(false);
      setTableLoading(false);
    }
  };

  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const res = await getMarksheetTemplates();
      setTemplates(res.data.data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handlePreviewMarksheet = async (marksheet) => {
    try {
      setPreviewLoadingId(marksheet._id);
      const res = await getMarksheetBlobUrl(marksheet._id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'image/png' }));
      setPreview({
        isOpen: true,
        url: url,
        title: `${marksheet.student?.personalInfo?.firstName || ''} ${marksheet.student?.personalInfo?.lastName || ''}`,
        marksheetNumber: marksheet.marksheetNumber,
        issueDate: marksheet.issueDate,
        id: marksheet._id
      });
    } catch (error) {
      toast.error('Failed to load preview');
      console.error('Preview error:', error);
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const handleDownloadMarksheet = async (marksheetId, marksheetNumber) => {
    try {
      setDownloadingId(marksheetId);
      const res = await downloadMarksheet(marksheetId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Marksheet_${marksheetNumber || 'document'}.png`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Marksheet downloaded successfully');
    } catch (error) {
      toast.error('Failed to download marksheet');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadFromPreview = async () => {
    if (!preview.id) return;
    await handleDownloadMarksheet(preview.id, preview.marksheetNumber);
  };

  const handlePrintPreview = () => {
    if (!preview.url) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Allow pop-ups to print the marksheet');
      return;
    }

    printWindow.document.title = `Marksheet_${preview.marksheetNumber || 'document'}`;
    const style = printWindow.document.createElement('style');
    style.textContent = '@page { size: A4 portrait; margin: 0; } html, body { margin: 0; width: 210mm; height: 297mm; } img { display: block; width: 210mm; height: 297mm; object-fit: fill; }';
    printWindow.document.head.appendChild(style);
    const image = printWindow.document.createElement('img');
    image.alt = 'Marksheet';
    image.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
    image.src = preview.url;
    printWindow.document.body.appendChild(image);
    printWindow.onafterprint = () => printWindow.close();
  };

  const closePreview = () => {
    if (preview.url) {
      window.URL.revokeObjectURL(preview.url);
    }
    setPreview({ isOpen: false, url: '', title: '', marksheetNumber: '', issueDate: '' });
  };

  const handleDeleteMarksheet = async (marksheetId) => {
    if (!window.confirm('Are you sure you want to delete this marksheet?')) return;
    try {
      await deleteMarksheet(marksheetId);
      toast.success('Marksheet deleted successfully');
      fetchGeneratedMarksheets();
    } catch (error) {
      toast.error('Failed to delete marksheet');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await deleteMarksheetTemplate(templateId);
      toast.success('Template deleted successfully');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const handleEditTemplate = (templateId) => {
    const basePath = user.role === 'super_admin' ? '/admin' : '/school';
    navigate(`${basePath}/marksheet-templates/edit/${templateId}`);
  };

  const totalPages = Math.ceil(templates.length / itemsPerPage);
  const paginatedTemplates = templates.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const tabClass = (tab) =>
    `py-3 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-2 transition-colors ${
      activeTab === tab
        ? 'border-primary-500 text-primary-600'
        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
    }`;

  // Unified standard Page Loading when initially navigating to page
  if (initialLoading) {
    return (
      <Layout>
        <PageHeader
          title="Marksheet Management"
          subtitle="Manage student marksheets and templates"
          icon={FiFileText}
        />
        <PageLoading message="Loading marksheets..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader
          title="Marksheet Management"
          subtitle="Manage student marksheets and templates"
          icon={FiFileText}
        />

        <Card padded={false}>
          <div className="border-b border-slate-200 px-4 sm:px-5">
            <nav className="-mb-px flex space-x-6 overflow-x-auto">
              <button type="button" onClick={() => setActiveTab('generated')} className={tabClass('generated')}>
                <FiFileText /> Generated Marksheets
              </button>
              {['super_admin', 'school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) && (
                <button type="button" onClick={() => templates[0] ? handleEditTemplate(templates[0]._id) : navigate(user.role === 'super_admin' ? '/admin/marksheet-templates/new' : '/school/marksheet-templates/new')} className={tabClass('templates')}>
                  <FiSettings /> Manage Templates
                </button>
              )}
            </nav>
          </div>

          {activeTab === 'generated' && (
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <SearchInput
                  className="flex-1 max-w-md"
                  placeholder="Search by student name, ID or marksheet no..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button 
                  icon={FiPlus} 
                  onClick={() => navigate(user.role === 'super_admin' ? '/admin/generate-marksheet' : '/school/generate-marksheet')}
                >
                  Generate Marksheet
                </Button>
              </div>

              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeader>Student</TableHeader>
                      <TableHeader>Course</TableHeader>
                      <TableHeader>Marksheet No.</TableHeader>
                      <TableHeader>Issue Date</TableHeader>
                      <TableHeader>Actions</TableHeader>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {tableLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-12 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <LoadingSpinner size="md" />
                            <span className="text-xs text-slate-500">Loading marksheets...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : generatedMarksheets.length === 0 ? (
                      <TableEmpty colSpan={5} title="No marksheets found" description="Generate a marksheet to get started." />
                    ) : (
                      generatedMarksheets.map((marksheet) => (
                        <TableRow key={marksheet._id}>
                          <TableCell className="!whitespace-normal">
                            <div className="text-sm font-medium text-slate-800">
                              {marksheet.student?.personalInfo?.firstName || 'Unknown'} {marksheet.student?.personalInfo?.lastName || ''}
                            </div>
                            <div className="text-xs text-slate-500">{marksheet.student?.studentId || 'N/A'}</div>
                          </TableCell>
                          <TableCell>{marksheet.course?.title || 'N/A'}</TableCell>
                          <TableCell>
                            <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                              {marksheet.marksheetNumber || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>{marksheet.issueDate ? new Date(marksheet.issueDate).toLocaleDateString() : 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <IconButton 
                                icon={FiEye} 
                                variant="primary" 
                                title="Preview" 
                                disabled={previewLoadingId === marksheet._id}
                                onClick={() => handlePreviewMarksheet(marksheet)} 
                              />
                              <IconButton
                                icon={FiDownload}
                                variant="success"
                                title={downloadingId === marksheet._id ? 'Downloading...' : 'Download'}
                                disabled={downloadingId === marksheet._id}
                                onClick={() => handleDownloadMarksheet(marksheet._id, marksheet.marksheetNumber)}
                              />
                              <IconButton
                                icon={FiTrash2}
                                variant="danger"
                                title="Delete"
                                onClick={() => handleDeleteMarksheet(marksheet._id)}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                <Pagination
                  currentPage={generatedPage}
                  totalPages={totalGeneratedPages}
                  onPageChange={setGeneratedPage}
                  itemsPerPage={10}
                  totalItems={totalGenerated}
                />
              </TableWrapper>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex justify-end">
                <Button icon={FiSettings} onClick={() => templates[0] ? handleEditTemplate(templates[0]._id) : navigate(user.role === 'super_admin' ? '/admin/marksheet-templates/new' : '/school/marksheet-templates/new')}>
                  Manage Template
                </Button>
              </div>

              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeader>Template</TableHeader>
                      <TableHeader>Description</TableHeader>
                      <TableHeader>Course Type</TableHeader>
                      <TableHeader>Target</TableHeader>
                      <TableHeader>Created</TableHeader>
                      <TableHeader>Actions</TableHeader>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {templatesLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-12 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <LoadingSpinner size="md" />
                            <span className="text-xs text-slate-500">Loading templates...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : paginatedTemplates.length === 0 ? (
                      <TableEmpty colSpan={6} title="No templates found" description="Create a marksheet template to get started." />
                    ) : (
                      paginatedTemplates.slice(0, 1).map((template) => (
                        <TableRow key={template._id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {template.templateImage ? (
                                <img
                                  className="h-10 w-10 rounded object-cover border border-slate-200 flex-shrink-0"
                                  src={toAbsoluteUrl(template.templateImage)}
                                  alt={template.name}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded bg-slate-100 flex items-center justify-center border border-slate-200">
                                  <FiFileText className="text-slate-400" />
                                </div>
                              )}
                              <span className="text-sm font-medium text-slate-800">{template.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="!whitespace-normal max-w-xs text-slate-500">
                            {template.description || 'No description'}
                          </TableCell>
                          <TableCell><Badge variant="primary">{template.courseType || 'custom'}</Badge></TableCell>
                          <TableCell>
                            <Badge variant={template.targetType === 'main_branch' ? 'primary' : 'success'}>
                              {template.targetType === 'main_branch' ? 'Main Campus' : 'Branch Campus'}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(template.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-0.5">
                              <IconButton icon={FiEdit2} variant="primary" title="Edit Template" onClick={() => handleEditTemplate(template._id)} />
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
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={templates.length}
                  onItemsPerPageChange={setItemsPerPage}
                />
              </TableWrapper>
            </div>
          )}
        </Card>
      </div>

      {/* Preview Modal */}
      <Modal
        open={preview.isOpen}
        onClose={closePreview}
        title={`Marksheet Preview: ${preview.title || ''}`}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={closePreview}>Close</Button>
            <Button icon={FiPrinter} onClick={handlePrintPreview}>Print A4</Button>
            <Button icon={FiDownload} onClick={handleDownloadFromPreview}>Download PNG</Button>
          </>
        }
      >
        <div className="flex justify-center bg-slate-100 rounded-lg p-3">
          <img
            src={preview.url}
            alt="Marksheet Preview"
            className="max-w-full h-auto border border-slate-200 rounded shadow-sm"
          />
        </div>
        <div className="mt-4 text-sm text-slate-600 border-t border-slate-200 pt-4 space-y-1">
          <p>Marksheet No.: <span className="font-mono font-medium">{preview.marksheetNumber}</span></p>
          <p>Issued: {preview.issueDate ? new Date(preview.issueDate).toLocaleDateString() : 'N/A'}</p>
        </div>
      </Modal>
    </Layout>
  );
};

export default MarksheetManagement;
