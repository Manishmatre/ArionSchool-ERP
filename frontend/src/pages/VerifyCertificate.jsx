import React, { useState } from 'react';
import SimpleLayout from '../components/SimpleLayout';
import { FiSearch, FiCheckCircle, FiXCircle, FiExternalLink, FiDownload } from 'react-icons/fi';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { Card, Button, Badge } from '../components/ui';

const CertificateVerificationPage = () => {
  const [verificationId, setVerificationId] = useState('');
  const [verificationType, setVerificationType] = useState('student'); // 'student' or 'school'
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verificationId.trim()) {
      toast.error('Please enter a Certificate ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // First try with the selected type
      let params = new URLSearchParams();
      params.append(verificationType, verificationId.trim());

      let response = await api.get(`/verify-certificate?${params}`);
      
      if (response.data.success) {
        setResult(response.data.data);
      } else {
        // If not found with selected type, try the other type as a fallback
        const otherType = verificationType === 'student' ? 'franchise' : 'student';
        params = new URLSearchParams();
        params.append(otherType, verificationId.trim());
        
        response = await api.get(`/verify-certificate?${params}`);
        if (response.data.success) {
          setResult(response.data.data);
          setVerificationType(otherType); // Update UI to match found type
        } else {
          setError(response.data.message || 'Certificate not found');
        }
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.response?.data?.message || 'Certificate verification failed. Please check the ID and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SimpleLayout>
      <div className="bg-slate-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-extrabold text-slate-900 mb-4">
              Certificate Verification
            </h1>
            <p className="text-lg text-slate-600">
              Verify the authenticity of student and school certificates issued by SES Educare.
            </p>
          </div>

          <Card className="mb-8">
            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Select Verification Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setVerificationType('student')}
                    className={`py-3 px-4 text-center rounded-xl border-2 transition-all duration-200 font-medium ${
                      verificationType === 'student'
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    Student Certificate
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerificationType('franchise')}
                    className={`py-3 px-4 text-center rounded-xl border-2 transition-all duration-200 font-medium ${
                      verificationType === 'franchise'
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    Campus Affiliation Certificate
                  </button>
                </div>
              </div>

              <div className="relative">
                <label htmlFor="certificateId" className="block text-sm font-semibold text-slate-700 mb-2">
                  Enter Certificate Number or Enrollment ID
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiSearch className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    id="certificateId"
                    value={verificationId}
                    onChange={(e) => setVerificationId(e.target.value)}
                    placeholder={verificationType === 'student' ? 'Certificate Number or Student ID' : 'Enter Campus Affiliation Certificate ID'}
                    className="block w-full pl-11 pr-4 py-4 border-2 border-slate-200 rounded-xl focus:ring-primary-500 focus:border-primary-500 text-slate-900 transition-colors"
                  />
                </div>
                {verificationType === 'student' && (
                  <p className="text-sm text-slate-500 mt-2">
                    Example: SES-CERT-20XX-XXXX or SES-ENR-20XX-XXXX
                  </p>
                )}
              </div>

              <Button type="submit" loading={loading} disabled={loading} className="w-full justify-center py-4 text-lg">
                {loading ? 'Verifying...' : 'Verify Certificate'}
              </Button>
            </form>
          </Card>

          {/* Results Section */}
          {error && (
            <div className="bg-danger-50 border-l-4 border-danger-500 p-6 rounded-xl animate-fadeIn">
              <div className="flex items-center">
                <FiXCircle className="h-8 w-8 text-danger-500 mr-4" />
                <div>
                  <h3 className="text-lg font-bold text-danger-800">Verification Failed</h3>
                  <p className="text-danger-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 animate-fadeIn">
              <div className="bg-gradient-to-r from-success-500 to-success-600 px-8 py-4 flex items-center gap-3">
                <FiCheckCircle className="h-6 w-6 text-white" />
                <h2 className="text-xl font-bold text-white uppercase tracking-wider">Authentic Certificate Verified</h2>
                <Badge variant="success" className="ml-auto bg-white/20 text-white">Verified</Badge>
              </div>
              
              <div className="p-8">
                {result.type === 'student' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <DetailRow label="Certificate Number" value={result.certificate.certificateNumber} />
                      <DetailRow label="Registration No." value={result.details.student.studentId} />
                      <DetailRow label="Enrollment ID" value={result.details.student.enrollmentNumber} />
                      <DetailRow label="Student Name" value={result.details.student.name} />
                      <DetailRow label="Father/Husband" value={result.details.student.fatherName} />
                      <DetailRow label="Course Name" value={result.details.course.title} />
                      <DetailRow label="Course Code" value={result.details.course.code} />
                    </div>
                    <div className="space-y-4">
                      <DetailRow label="Grade" value={result.certificate.grade} />
                      <DetailRow label="Percentage" value={result.certificate.percentage ? `${result.certificate.percentage}%` : 'N/A'} />
                      <DetailRow label="Issue Date" value={new Date(result.certificate.issueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
                      <DetailRow label="School Campus" value={result.details.franchise.name} />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <DetailRow label="Campus Code" value={result.details.franchise.code} />
                      <DetailRow label="Campus Name" value={result.details.franchise.name} />
                      <DetailRow label="Principal / Head" value={result.details.franchise.ownerName} />
                      <DetailRow label="Email" value={result.details.franchise.email} />
                    </div>
                    <div className="space-y-4">
                      <DetailRow label="Mobile" value={result.details.franchise.mobile} />
                      <DetailRow label="Issue Date" value={new Date(result.certificate.issueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
                      <div className="pt-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Address</label>
                        <p className="text-slate-900 font-medium">{result.details.franchise.address}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    as="a"
                    icon={FiExternalLink}
                    href={`/api/certificate/${result.type}/${result.certificate.id}/image`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Certificate
                  </Button>
                  <Button
                    as="a"
                    variant="secondary"
                    icon={FiDownload}
                    href={`/api/certificate/${result.type}/${result.certificate.id}/image`}
                    download={`Certificate_${result.certificate.id}.png`}
                  >
                    Download PNG
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </SimpleLayout>
  );
};

const DetailRow = ({ label, value }) => (
  <div>
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
    <p className="text-lg text-slate-900 font-semibold">{value || 'N/A'}</p>
  </div>
);

export default CertificateVerificationPage;
