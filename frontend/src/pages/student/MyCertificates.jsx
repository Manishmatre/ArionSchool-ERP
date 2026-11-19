import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { FiDownload, FiAward } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { downloadGeneratedStudentCertificate } from '../../api/studentCertificateApi';
import { PageLoading, EmptyState, Card, Button } from '../../components/ui';

const MyCertificates = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.studentProfile) {
      fetchCertificates();
    } else if (user) {
      setLoading(false);
    }
  }, [user]);

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const response = await api.get('/student-certificates/my');
      if (response.data.success) {
        setCertificates(response.data.data);
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        toast.error('Failed to fetch certificates');
        console.error(error);
      }
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (certificate) => {
    try {
      toast.info('Downloading certificate...');
      const courseTitle = certificate.course?.title ? certificate.course.title.replace(/ /g, '_') : 'Course';
      const filename = `Certificate_${courseTitle}.png`;
      await downloadGeneratedStudentCertificate(certificate._id, filename);
      toast.success('Certificate downloaded successfully!');
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast.error('Failed to download certificate.');
    }
  };

  const cert = certificates[0];

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader title="My Certificate" subtitle="View and download your certificate" icon={FiAward} />

        {loading ? (
          <PageLoading message="Loading certificate..." />
        ) : certificates.length === 0 ? (
          <Card className="card-pad">
            <EmptyState icon={FiAward} title="No certificates available yet" description="Complete a course to earn your certificate." />
          </Card>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="rounded-2xl shadow-elevated overflow-hidden border border-slate-200 bg-white">
              <div className="bg-gradient-to-r from-primary-600 to-purple-600 p-5 text-white flex items-center justify-between">
                <h2 className="text-xl font-bold">Certificate of Completion</h2>
                <div className="bg-white/20 rounded-full p-2.5"><FiAward className="text-2xl" /></div>
              </div>

              <div className="p-6 space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-slate-800">{cert.course?.title}</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Certificate Number</p>
                    <p className="text-base font-mono font-semibold text-slate-800">{cert.certificateNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Date Issued</p>
                    <p className="text-base font-semibold text-slate-800">
                      {new Date(cert.issueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Grade Achieved</p>
                    <p className="text-xl font-bold text-success-600">{cert.grade && cert.grade !== 'N/A' ? cert.grade : 'Pass'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Status</p>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-success-500 rounded-full" />
                      <span className="text-base font-semibold text-success-600">Completed</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    <p>Download your certificate</p>
                    <p className="mt-1">Valid for lifetime • Verifiable online</p>
                  </div>
                  <Button icon={FiDownload} onClick={() => handleDownload(cert)}>Download Certificate</Button>
                </div>
              </div>

              <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-success-500 rounded-full" /> Authentic Certificate
                </div>
                <div>ID: {cert._id}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MyCertificates;
