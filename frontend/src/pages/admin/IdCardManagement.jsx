import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { getIdCardTemplates, deleteIdCardTemplate, getGeneratedIdCards, downloadIdCard, getIdCardBlobUrl, deleteIdCard } from '../../api/idCardApi';
import { toast } from 'react-toastify';
import { FiDownload, FiPlus, FiEdit2, FiTrash2, FiSettings, FiFileText, FiEye, FiLoader, FiCreditCard } from 'react-icons/fi';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';
import { toAbsoluteUrl } from '../../utils/url';
import {
  PageLoading, LoadingSpinner, FilterBar, SearchInput,
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  IconButton, Modal, Card,
} from '../../components/ui';

const IdCardManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [generatedIdCards, setGeneratedIdCards] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('generated');
  const [downloading, setDownloading] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [preview, setPreview] = useState({ isOpen: false, url: '', title: '', isBlob: false });
  const [paginationInfo, setPaginationInfo] = useState(null);
  const searchInitialized = useRef(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [generatedCardsCurrentPage, setGeneratedCardsCurrentPage] = useState(1);

  const [filters, setFilters] = useState({ search: '' });

  const fetchData = async (page = 1, search = '', limit = itemsPerPage, { initial = false } = {}) => {
    if (initial) {
      setInitialLoading(true);
    } else {
      setListLoading(true);
    }

    try {
      if (['super_admin', 'school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role)) {
        const requests = [getGeneratedIdCards(page, limit, search)];
        if (initial || activeTab === 'templates') {
          requests.unshift(getIdCardTemplates());
        }
        const results = await Promise.all(requests);
        if (requests.length === 2) {
          setTemplates(results[0].data || []);
          setGeneratedIdCards(results[1].data || []);
          setPaginationInfo(results[1].pagination);
        } else {
          setGeneratedIdCards(results[0].data || []);
          setPaginationInfo(results[0].pagination);
        }
      } else {
        const generatedRes = await getGeneratedIdCards(page, limit, search);
        setGeneratedIdCards(generatedRes.data || []);
        setPaginationInfo(generatedRes.pagination);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      if (initial) {
        setInitialLoading(false);
      } else {
        setListLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData(1, '', itemsPerPage, { initial: true });

    return () => {
      if (preview.url && preview.isBlob) {
        window.URL.revokeObjectURL(preview.url);
      }
    };
  }, []);

  useEffect(() => {
    if (!searchInitialized.current) {
      searchInitialized.current = true;
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setGeneratedCardsCurrentPage(1);
      fetchData(1, filters.search);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filters.search]);

  useEffect(() => {
    if (!preview.isOpen && preview.url && preview.isBlob) {
      window.URL.revokeObjectURL(preview.url);
    }
  }, [preview.isOpen, preview.url, preview.isBlob]);

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }
    setDeletingId(templateId);
    try {
      await deleteIdCardTemplate(templateId);
      setTemplates((prev) => prev.filter((t) => t._id !== templateId));
      toast.success('Template deleted successfully');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCard = async (cardId, studentName) => {
    if (!window.confirm(`Are you sure you want to delete the ID card for ${studentName}?`)) {
      return;
    }
    setDeletingId(cardId);
    try {
      await deleteIdCard(cardId);
      setGeneratedIdCards((prev) => prev.filter((c) => c._id !== cardId));
      setPaginationInfo((prev) => (prev ? { ...prev, total: Math.max(0, prev.total - 1) } : prev));
      toast.success('ID Card deleted successfully');
    } catch (error) {
      console.error('Error deleting ID card:', error);
      toast.error('Failed to delete ID Card');
    } finally {
      setDeletingId(null);
    }
  };

  const handlePreviewCard = async (card, studentName) => {
    try {
      if (card.fileUrl) {
        setPreview({ isOpen: true, url: toAbsoluteUrl(card.fileUrl), title: studentName, isBlob: false });
        return;
      }
      const url = await getIdCardBlobUrl(card._id);
      setPreview({ isOpen: true, url, title: studentName, isBlob: true });
    } catch (error) {
      toast.error('Failed to load preview');
      console.error('Preview error:', error);
    }
  };

  const handleDownloadCard = async (cardId, studentName) => {
    setDownloading(cardId);
    try {
      await downloadIdCard(cardId, `ID_Card_${studentName.replace(/ /g, '_')}.png`);
      toast.success('ID Card downloaded successfully');
    } catch (error) {
      toast.error('Failed to download ID Card');
      console.error('Download error:', error);
    } finally {
      setDownloading(null);
    }
  };

  const filteredTemplates = templates.filter((t) => t.name.toLowerCase().includes(filters.search.toLowerCase()));
  const paginatedTemplates = filteredTemplates.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleGeneratedPageChange = (page) => {
    setGeneratedCardsCurrentPage(page);
    fetchData(page, filters.search);
  };

  const closePreview = () => {
    setPreview({ isOpen: false, url: '', title: '', isBlob: false });
  };

  const ListSpinner = () => (
    <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-xl">
      <LoadingSpinner size="lg" />
    </div>
  );

  const tabClass = (tab) =>
    `py-3 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-2 transition-colors ${
      activeTab === tab
        ? 'border-primary-500 text-primary-600'
        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
    }`;

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader
          title="ID Card Management"
          subtitle="Generate and manage student ID cards"
          icon={FiCreditCard}
        />

        {initialLoading ? (
          <PageLoading message="Loading ID cards..." />
        ) : (
          <Card padded={false}>
            <div className="border-b border-slate-200 px-4 sm:px-5">
              <nav className="-mb-px flex space-x-6 overflow-x-auto">
                <button type="button" onClick={() => setActiveTab('generated')} className={tabClass('generated')}>
                  <FiFileText /> Generated ID Cards
                </button>
                {['super_admin', 'school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) && (
                  <button type="button" onClick={() => templates[0] ? navigate(user.role === 'super_admin' ? `/admin/id-cards/templates/${templates[0]._id}/edit` : `/school/id-cards/templates/${templates[0]._id}/edit`) : navigate(user.role === 'super_admin' ? '/admin/id-cards/templates/new' : '/school/id-cards/templates/new')} className={tabClass('templates')}>
                    <FiSettings /> Manage Templates
                  </button>
                )}
              </nav>
            </div>

            {activeTab === 'generated' && (
              <div className="p-4 sm:p-5 space-y-4 relative">
                {listLoading && <ListSpinner />}
                <FilterBar>
                  <SearchInput
                    className="flex-1 max-w-md"
                    value={filters.search}
                    onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                    placeholder="Search by student name or ID..."
                  />
                  <Button
                    className="md:ml-auto"
                    icon={FiPlus}
                    onClick={() => {
                      const generateRoute = ['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role)
                        ? '/school/id-cards/generate'
                        : '/admin/id-cards/generate';
                      navigate(generateRoute);
                    }}
                  >
                    Generate ID Card
                  </Button>
                </FilterBar>

                <TableWrapper>
                  <Table>
                    <TableHead>
                      <tr>
                        <TableHeader>Student</TableHeader>
                        <TableHeader>Template</TableHeader>
                        <TableHeader>Issue Date</TableHeader>
                        <TableHeader>Actions</TableHeader>
                      </tr>
                    </TableHead>
                    <TableBody>
                      {generatedIdCards.length === 0 ? (
                        <TableEmpty colSpan={4} title="No ID cards found" description="Try adjusting your search or generate a new ID card." />
                      ) : (
                        generatedIdCards.map((card) => {
                          const studentName = `${card.student?.personalInfo.firstName} ${card.student?.personalInfo.lastName}`;
                          return (
                            <TableRow key={card._id} className={deletingId === card._id ? 'opacity-50' : ''}>
                              <TableCell className="!whitespace-normal">
                                <div className="text-sm font-medium text-slate-800">{studentName}</div>
                                <div className="text-xs text-slate-500">{card.student?.studentId}</div>
                              </TableCell>
                              <TableCell>{card.template?.name}</TableCell>
                              <TableCell>{new Date(card.issueDate).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-0.5">
                                  <IconButton icon={FiEye} variant="primary" title="Preview" onClick={() => handlePreviewCard(card, studentName)} />
                                  <IconButton icon={FiDownload} variant="success" title={downloading === card._id ? 'Downloading...' : 'Download'} disabled={downloading === card._id} onClick={() => handleDownloadCard(card._id, `${card.student?.personalInfo.firstName}_${card.student?.personalInfo.lastName}`)} />
                                  <IconButton icon={deletingId === card._id ? FiLoader : FiTrash2} variant="danger" title="Delete" disabled={deletingId === card._id} onClick={() => handleDeleteCard(card._id, studentName)} />
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                  <Pagination
                    currentPage={generatedCardsCurrentPage}
                    totalPages={paginationInfo?.pages || 1}
                    onPageChange={handleGeneratedPageChange}
                    itemsPerPage={itemsPerPage}
                    totalItems={paginationInfo?.total || generatedIdCards.length}
                    onItemsPerPageChange={(size) => {
                      setItemsPerPage(size);
                      setGeneratedCardsCurrentPage(1);
                      fetchData(1, filters.search, size);
                    }}
                  />
                </TableWrapper>
              </div>
            )}

            {['super_admin', 'school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) && activeTab === 'templates' && (
              <div className="p-4 sm:p-5 space-y-4 relative">
                {listLoading && <ListSpinner />}
                <FilterBar>
                  <SearchInput
                    className="flex-1 max-w-md"
                    value={filters.search}
                    onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                    placeholder="Search templates..."
                  />
                  <Button className="md:ml-auto" icon={FiSettings} onClick={() => templates[0] ? navigate(user.role === 'super_admin' ? `/admin/id-cards/templates/${templates[0]._id}/edit` : `/school/id-cards/templates/${templates[0]._id}/edit`) : navigate(user.role === 'super_admin' ? '/admin/id-cards/templates/new' : '/school/id-cards/templates/new')}>Manage Template</Button>
                </FilterBar>

                <TableWrapper>
                  <Table>
                    <TableHead>
                      <tr>
                        <TableHeader>Template</TableHeader>
                        <TableHeader>Description</TableHeader>
                        <TableHeader>Fields</TableHeader>
                        <TableHeader>Created</TableHeader>
                        <TableHeader>Actions</TableHeader>
                      </tr>
                    </TableHead>
                    <TableBody>
                      {paginatedTemplates.length === 0 ? (
                        <TableEmpty colSpan={5} title="No templates found" description="Get started by creating your first ID card template." />
                      ) : (
                        paginatedTemplates.slice(0, 1).map((template) => (
                          <TableRow key={template._id} className={deletingId === template._id ? 'opacity-50' : ''}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <img className="h-10 w-10 rounded object-cover border border-slate-200 flex-shrink-0" src={toAbsoluteUrl(template.templateImage)} alt={template.name} loading="lazy" />
                                <span className="text-sm font-medium text-slate-800">{template.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="!whitespace-normal max-w-xs text-slate-500">{template.description || 'N/A'}</TableCell>
                            <TableCell>{template.fields?.length ?? '—'}</TableCell>
                            <TableCell>{new Date(template.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-0.5">
                                <IconButton icon={FiEdit2} variant="primary" title="Edit Template" onClick={() => navigate(user.role === 'super_admin' ? `/admin/id-cards/templates/${template._id}/edit` : `/school/id-cards/templates/${template._id}/edit`)} />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(filteredTemplates.length / itemsPerPage)}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    totalItems={filteredTemplates.length}
                    onItemsPerPageChange={setItemsPerPage}
                  />
                </TableWrapper>
              </div>
            )}
          </Card>
        )}
      </div>

      <Modal
        open={preview.isOpen}
        onClose={closePreview}
        title={`ID Card Preview: ${preview.title || ''}`}
        size="lg"
        footer={<Button variant="secondary" onClick={closePreview}>Close</Button>}
      >
        <div className="flex justify-center bg-slate-100 rounded-lg p-3">
          <img src={preview.url} alt="ID Card Preview" className="max-w-full h-auto mx-auto" />
        </div>
      </Modal>
    </Layout>
  );
};

export default IdCardManagement;
