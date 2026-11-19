import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { FiDownload, FiEye, FiFileText } from 'react-icons/fi';
import { PageLoading, Card, Button, Badge, EmptyState, Modal } from '../../components/ui';

const MyMarksheets = () => {
  const [marksheets, setMarksheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedMarksheet, setSelectedMarksheet] = useState(null);

  useEffect(() => {
    const fetchMarksheets = async () => {
      try {
        const response = await api.get('/marksheets/my');
        setMarksheets(response.data.data);
      } catch (error) {
        toast.error('Failed to fetch marksheets.');
      }
      setLoading(false);
    };
    fetchMarksheets();
  }, []);

  const handleDownload = async (id, marksheetNumber) => {
    try {
      const res = await api.get(`/marksheets/download/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Marksheet-${marksheetNumber || id}.png`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download marksheet.');
    }
  };

  const handlePreview = async (marksheet) => {
    try {
      const res = await api.get(`/marksheets/preview/${marksheet._id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      setPreviewUrl(url);
      setSelectedMarksheet(marksheet);
    } catch (error) {
      toast.error('Failed to load preview.');
    }
  };

  const closePreview = () => {
    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedMarksheet(null);
  };

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader title="My Marksheets" subtitle="View and download your marksheets" icon={FiFileText} />

        {loading ? (
          <PageLoading message="Loading marksheets..." />
        ) : marksheets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {marksheets.map((marksheet) => (
              <Card key={marksheet._id} hover className="!p-0 overflow-hidden">
                <div className="p-5">
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {marksheet.course?.title || marksheet.course?.name || 'Unknown Course'}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">Marksheet No.: <span className="font-mono">{marksheet.marksheetNumber || 'N/A'}</span></p>

                  <div className="space-y-2 my-5">
                    <p className="text-sm text-slate-600 flex justify-between">
                      <span>Issued on:</span>
                      <span className="font-medium text-slate-800">{new Date(marksheet.issueDate).toLocaleDateString()}</span>
                    </p>
                    <p className="text-sm text-slate-600 flex justify-between items-center">
                      <span>Grade:</span>
                      <Badge variant="primary">{marksheet.grade}</Badge>
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="secondary" icon={FiEye} className="flex-1 justify-center" onClick={() => handlePreview(marksheet)}>Preview</Button>
                    <Button icon={FiDownload} className="flex-1 justify-center" onClick={() => handleDownload(marksheet._id, marksheet.marksheetNumber)}>Download</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="card-pad">
            <EmptyState icon={FiFileText} title="No marksheets found" description="Your marksheets will appear here once issued." />
          </Card>
        )}
      </div>

      <Modal
        open={!!previewUrl}
        onClose={closePreview}
        title={`Marksheet Preview - ${selectedMarksheet?.course?.title || selectedMarksheet?.course?.name || ''}`}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={closePreview}>Close</Button>
            <Button icon={FiDownload} onClick={() => handleDownload(selectedMarksheet._id, selectedMarksheet.marksheetNumber)}>Download PNG</Button>
          </>
        }
      >
        <div className="flex justify-center bg-slate-100 rounded-xl p-4">
          {previewUrl && <img src={previewUrl} alt="Marksheet Preview" className="max-w-full h-auto shadow-lg border border-slate-200" />}
        </div>
      </Modal>
    </Layout>
  );
};

export default MyMarksheets;
