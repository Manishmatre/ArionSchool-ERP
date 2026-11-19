import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { FiCreditCard, FiDownload, FiEye, FiRefreshCw } from 'react-icons/fi';
import { downloadIdCard } from '../../api/idCardApi';
import { useAuth } from '../../context/AuthContext';
import { toAbsoluteUrl } from '../../utils/url';
import api from '../../api/axios';
import { PageLoading, Card, Button, EmptyState } from '../../components/ui';

const MyIdCard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [idCardUrl, setIdCardUrl] = useState(null);
  const [hasIdCard, setHasIdCard] = useState(false);
  const [generatedCardId, setGeneratedCardId] = useState(null);

  useEffect(() => {
    if (user?.studentProfile) {
      fetchStudentIdCard();
    }
  }, [user]);

  // Load the (auth-protected) card image blob separately so it never blocks
  // the initial page render — the page shell shows instantly like the certificate page.
  const loadIdCardImage = async (cardId) => {
    try {
      const blobResponse = await api.get(`/id-cards/download/${cardId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([blobResponse.data]));
      setIdCardUrl(url);
    } catch (error) {
      console.error('Error loading ID card image:', error);
      toast.error('Failed to load ID card image');
    }
  };

  const fetchStudentIdCard = async () => {
    setLoading(true);
    try {
      const response = await api.get('/id-cards/my');
      if (response.data.success && response.data.data) {
        const card = response.data.data;
        setGeneratedCardId(card._id);
        setHasIdCard(true);
        setLoading(false);
        if (card.fileUrl) {
          setIdCardUrl(toAbsoluteUrl(card.fileUrl));
        } else {
          // Fetch the image in the background without blocking the page
          loadIdCardImage(card._id);
        }
        return;
      }
      setHasIdCard(false);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error fetching student ID card:', error);
        toast.error('Failed to load ID card information');
      }
      setHasIdCard(false);
    } finally {
      setLoading(false);
    }
  };

  const downloadIdCardFile = async () => {
    try {
      setDownloading(true);
      const studentName = user?.studentProfile?.personalInfo?.firstName && user?.studentProfile?.personalInfo?.lastName
        ? `${user.studentProfile.personalInfo.firstName}_${user.studentProfile.personalInfo.lastName}_ID_Card`
        : 'Student_ID_Card';
      if (generatedCardId) {
        await downloadIdCard(generatedCardId, `${studentName}.png`);
        toast.success('ID card downloaded successfully!');
      } else {
        toast.error('ID card not available for download');
      }
    } catch (error) {
      console.error('Error downloading ID card:', error);
      toast.error('Failed to download ID card');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <PageHeader title="My ID Card" subtitle="View and download your student identification card" icon={FiCreditCard} />
        <PageLoading message="Loading ID card..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader title="My ID Card" subtitle="View and download your student identification card" icon={FiCreditCard} />

        <Card className="card-pad">
          <div className="flex flex-col items-center">
            {hasIdCard ? (
              <>
                <div className="mb-6 w-full max-w-2xl">
                  <h3 className="section-title mb-4 text-center">Your Student ID Card</h3>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 flex items-center justify-center" style={{ minHeight: '260px' }}>
                    {idCardUrl ? (
                      <img src={idCardUrl} alt="Student ID Card" className="w-full h-auto" style={{ maxHeight: '600px', objectFit: 'contain' }} loading="eager" />
                    ) : (
                      <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
                        <FiRefreshCw className="text-2xl animate-spin" />
                        <span className="text-sm">Loading ID card image...</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button icon={FiDownload} loading={downloading} disabled={downloading || !idCardUrl} onClick={downloadIdCardFile}>
                    {downloading ? 'Downloading...' : 'Download ID Card'}
                  </Button>
                  <Button as="a" href={idCardUrl || undefined} target="_blank" rel="noopener noreferrer" variant="success" icon={FiEye} disabled={!idCardUrl}>Open in New Tab</Button>
                  <Button variant="secondary" icon={FiRefreshCw} onClick={fetchStudentIdCard}>Refresh</Button>
                </div>
              </>
            ) : (
              <EmptyState
                icon={FiCreditCard}
                title="No ID Card Generated"
                description="Your student ID card hasn't been generated yet. Please contact your school administration or class teacher to generate your ID card."
              />
            )}
          </div>
        </Card>

        <div className="bg-primary-50 rounded-2xl p-6">
          <h3 className="section-title text-primary-800 mb-3">ID Card Information</h3>
          <ul className="space-y-2 text-primary-700 text-sm">
            {[
              'Your student ID card is an official document for identification purposes',
              'Keep your ID card safe and present it when required',
              'You can download and print your ID card whenever needed',
              'Contact administration if you need any corrections to your ID card',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-primary-600 mt-1">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default MyIdCard;
