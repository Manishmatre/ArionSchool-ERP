import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import SimpleLayout from '../components/SimpleLayout';
import { FiCheckCircle, FiXCircle, FiDownload, FiExternalLink, FiCalendar, FiUser, FiAward } from 'react-icons/fi';
import { Card, Button, Badge, PageLoading, EmptyState } from '../components/ui';

const CertificateVerification = () => {
  const [searchParams] = useSearchParams();
  const [verificationData, setVerificationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    verifyCertificate();
  }, [searchParams]);

  const verifyCertificate = async () => {
    try {
      setLoading(true);
      const student = searchParams.get('student');
      const franchise = searchParams.get('franchise');
      const marksheet = searchParams.get('marksheet');

      if (!student && !franchise && !marksheet) {
        setError('Invalid verification link. Please scan QR code again.');
        return;
      }

      const params = new URLSearchParams();
      if (student) params.append('student', student);
      if (franchise) params.append('franchise', franchise);
      if (marksheet) params.append('marksheet', marksheet);

      const response = await fetch(`/api/verify-certificate?${params}`);
      const data = await response.json();

      if (data.success) {
        setVerificationData(data.data);
      } else {
        setError(data.message || 'Certificate not found');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setError('Failed to load certificate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadCertificate = () => {
    if (verificationData) {
      const imageUrl = `/api/certificate/${verificationData.type}/${verificationData.certificate.id}/image`;
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `Certificate_${verificationData.certificate.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <SimpleLayout>
        <div className="min-h-screen flex items-center justify-center">
          <PageLoading message="Verifying certificate..." />
        </div>
      </SimpleLayout>
    );
  }

  if (error) {
    return (
      <SimpleLayout>
        <div className="max-w-md mx-auto px-4 py-16">
          <Card>
            <EmptyState
              icon={FiXCircle}
              title="Verification Failed"
              description={error}
            />
          </Card>
        </div>
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-slate-100">
          <div className="bg-gradient-to-r from-success-600 to-primary-600 px-6 py-4 flex items-center justify-center gap-3">
            <FiCheckCircle className="h-6 w-6 text-white" />
            <h3 className="text-xl font-semibold text-white text-center">
              {verificationData.type === 'marksheet' ? 'Marksheet Verified' : 'Certificate Verified'}
            </h3>
          </div>

          <div className="p-6">
            {verificationData.type === 'marksheet' ? (
              <div className="space-y-4 text-center">
                <h4 className="text-lg font-bold text-slate-900">Marksheet No. {verificationData.certificate.certificateNumber || 'N/A'}</h4>
                <h5 className="text-xl font-semibold text-slate-800">Student: {(verificationData.details.student.name || 'N/A').toUpperCase()}</h5>
                <p className="text-slate-700"><strong>Course:</strong> {verificationData.details.course.title || 'N/A'}</p>
                <p className="text-slate-700"><strong>Grade:</strong> {verificationData.certificate.grade || 'N/A'}</p>
                <p className="text-slate-700"><strong>Percentage:</strong> {verificationData.certificate.percentage ?? 'N/A'}{verificationData.certificate.percentage != null ? '%' : ''}</p>
                <p className="text-slate-700"><strong>Marks:</strong> {verificationData.details.totalObtainedMarks} / {verificationData.details.totalMarks}</p>
                <p className="text-slate-700"><strong>Date of Issue:</strong> {new Date(verificationData.certificate.issueDate).toLocaleDateString('en-IN')}</p>
                <Badge variant="success" icon={FiCheckCircle}>Marksheet Verified</Badge>
              </div>
            ) : verificationData.type === 'student' ? (
              <div className="space-y-4">
                <div className="text-center">
                  <h4 className="text-lg font-bold text-slate-900 mb-2">
                    Certificate No. {verificationData.certificate.certificateNumber || 'N/A'}
                  </h4>
                  <h4 className="text-lg font-bold text-slate-900 mb-2">Registration No. {verificationData.details.student.studentId || 'N/A'}</h4>
                  <h5 className="text-xl font-semibold text-slate-800 mb-4">Student's Name : {(verificationData.details.student.name || '').toUpperCase()}</h5>
                  <p className="text-slate-700 mb-2"><strong>Father/Husband :</strong> {(verificationData.details.student.fatherName || '').toUpperCase()}</p>
                  <p className="text-slate-700 mb-2"><strong>Course Code :</strong> {(verificationData.details.course.code || '').toUpperCase()}</p>
                  <p className="text-slate-700 mb-2"><strong>Grade :</strong> {(verificationData.certificate.grade || 'N/A')}{verificationData.certificate.percentage ? ` (${verificationData.certificate.percentage}%)` : ''}</p>
                  <p className="text-slate-700 mb-2"><strong>Date of Issue :</strong> {new Date(verificationData.certificate.issueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="text-slate-700"><strong>School Campus :</strong> {(verificationData.details.franchise.name || '').toUpperCase()}</p>
                </div>
                
                <div className="mt-6 flex justify-center">
                  <Badge variant="success" icon={FiCheckCircle}>Certificate Verified</Badge>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <h4 className="text-lg font-bold text-slate-900 mb-2">Campus Code: {verificationData.details.franchise.code || 'N/A'}</h4>
                  <h5 className="text-xl font-semibold text-slate-800 mb-4">Campus Name : {(verificationData.details.franchise.name || '').toUpperCase()}</h5>
                  <p className="text-slate-700 mb-2"><strong>Principal / Head :</strong> {(verificationData.details.franchise.ownerName || '').toUpperCase()}</p>
                  <p className="text-slate-700 mb-2"><strong>Email :</strong> {verificationData.details.franchise.email || 'N/A'}</p>
                  {verificationData.details.franchise.mobile && (
                    <p className="text-slate-700 mb-2"><strong>Mobile :</strong> {verificationData.details.franchise.mobile}</p>
                  )}
                  <p className="text-slate-700 mb-2"><strong>Address :</strong> {verificationData.details.franchise.address || 'N/A'}</p>
                  <p className="text-slate-700 mb-2"><strong>Date of Issue :</strong> {new Date(verificationData.certificate.issueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                
                <div className="mt-6 flex justify-center">
                  <Badge variant="success" icon={FiCheckCircle}>Certificate Verified</Badge>
                </div>
              </div>
            )}

            {verificationData.type !== 'marksheet' && <div className="mt-6 flex justify-center">
              <Button
                as="a"
                icon={FiExternalLink}
                href={`/api/certificate/${verificationData.type}/${verificationData.certificate.id}/image`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Certificate
              </Button>
            </div>}
          </div>
        </div>
      </div>
    </SimpleLayout>
  );
};

export default CertificateVerification;
