import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import {
  FiFileText, FiAward, FiPlus, FiPrinter, FiSearch, FiCheck, FiFilter
} from 'react-icons/fi';
import schoolCertificateApi from '../../api/schoolCertificateApi';
import studentApi from '../../api/studentApi';
import {
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge
} from '../../components/ui';
import { useBranding } from '../../context/BrandingContext';

const SchoolTransferCertificates = () => {
  const { branding, schoolName } = useBranding();
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [students, setStudents] = useState([]);

  // Selected Certificate for Printable Preview
  const [selectedCert, setSelectedCert] = useState(null);

  // Form State
  const [certForm, setCertForm] = useState({
    studentId: '',
    certificateType: 'transfer_certificate',
    reasonForLeaving: 'Parental transfer / relocation',
    conduct: 'Good',
    promotedToClass: 'Promoted to Next Higher Grade',
    duesCleared: true,
    totalWorkingDays: 220,
    totalDaysPresent: 204,
    remarks: 'Clear of all school library books and laboratory dues.'
  });

  useEffect(() => {
    loadCertificates();
    loadStudents();
  }, [typeFilter]);

  const loadCertificates = async () => {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter) params.certificateType = typeFilter;
      const res = await schoolCertificateApi.getCertificates(params);
      setCertificates(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const res = await studentApi.getAllStudents({ limit: 100 });
      setStudents(res.data?.data || []);
      if (res.data?.data?.length > 0) {
        setCertForm(prev => ({ ...prev, studentId: res.data.data[0]._id }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleIssue = async (e) => {
    e.preventDefault();
    try {
      const res = await schoolCertificateApi.issueCertificate(certForm);
      toast.success(res.data?.message || 'Certificate issued');
      setShowIssueModal(false);
      setSelectedCert(res.data?.data);
      loadCertificates();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to issue certificate');
    }
  };

  return (
    <Layout>
      <PageHeader
        title="School Transfer Certificates (TC) & Bonafide"
        subtitle="CBSE & State Board compliant School Transfer Certificates, Character, Study, and Bonafide Certificates with QR verification."
      />

      {/* Control Bar - High Contrast Light Theme */}
      <div 
        style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
        className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3"
      >
        <div className="flex items-center space-x-3">
          <label htmlFor="certificate-type-filter" className="sr-only">Filter by Certificate Type</label>
          <select
            id="certificate-type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ backgroundColor: '#ffffff', color: '#1e293b' }}
            className="px-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-xs cursor-pointer min-w-[240px]"
          >
            <option value="" style={{ backgroundColor: '#ffffff', color: '#1e293b' }}>All Certificate Types</option>
            <option value="transfer_certificate" style={{ backgroundColor: '#ffffff', color: '#1e293b' }}>Transfer Certificate (TC)</option>
            <option value="bonafide" style={{ backgroundColor: '#ffffff', color: '#1e293b' }}>Bonafide Certificate</option>
            <option value="character" style={{ backgroundColor: '#ffffff', color: '#1e293b' }}>Character Certificate</option>
            <option value="migration" style={{ backgroundColor: '#ffffff', color: '#1e293b' }}>Migration Certificate</option>
            <option value="leaving" style={{ backgroundColor: '#ffffff', color: '#1e293b' }}>School Leaving Certificate</option>
          </select>
        </div>

        <Button
          onClick={() => setShowIssueModal(true)}
          className="flex items-center justify-center space-x-2 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"
        >
          <FiPlus className="w-4 h-4" />
          <span>Issue School Certificate</span>
        </Button>
      </div>

      {/* Certificate Table */}
      <TableWrapper>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Certificate #</TableHeader>
              <TableHeader>Student Name</TableHeader>
              <TableHeader>Admission #</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Class</TableHeader>
              <TableHeader>Issue Date</TableHeader>
              <TableHeader>Conduct</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {certificates.length === 0 ? (
              <TableEmpty colSpan={8} message="No certificates issued yet." />
            ) : (
              certificates.map(cert => (
                <TableRow key={cert._id}>
                  <TableCell className="font-mono text-xs font-bold text-indigo-600">
                    {cert.certificateNumber}
                  </TableCell>
                  <TableCell className="font-semibold text-gray-900">
                    {cert.student?.personalInfo?.firstName} {cert.student?.personalInfo?.lastName}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-gray-400">
                    {cert.student?.admissionNumber || cert.student?.studentId}
                  </TableCell>
                  <TableCell className="capitalize text-xs font-medium">
                    {cert.certificateType?.replace('_', ' ')}
                  </TableCell>
                  <TableCell className="text-xs">
                    {cert.schoolClass?.name || 'Class'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(cert.issueDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-emerald-600">
                    {cert.conduct}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => setSelectedCert(cert)}
                      className="p-1 text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 text-xs font-semibold"
                    >
                      <FiPrinter className="w-3.5 h-3.5" />
                      <span>Print / Preview</span>
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableWrapper>

      {/* ISSUE CERTIFICATE MODAL */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Issue Official School Certificate
            </h3>
            <form onSubmit={handleIssue} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Select Student
                </label>
                <select
                  value={certForm.studentId}
                  onChange={(e) => setCertForm({ ...certForm, studentId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  required
                >
                  <option value="">-- Choose Student --</option>
                  {students.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.personalInfo?.firstName} {s.personalInfo?.lastName} ({s.admissionNumber || s.studentId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Certificate Type
                  </label>
                  <select
                    value={certForm.certificateType}
                    onChange={(e) => setCertForm({ ...certForm, certificateType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="transfer_certificate">Transfer Certificate (TC)</option>
                    <option value="bonafide">Bonafide Certificate</option>
                    <option value="character">Character Certificate</option>
                    <option value="leaving">School Leaving Certificate</option>
                    <option value="migration">Migration Certificate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Student Conduct
                  </label>
                  <select
                    value={certForm.conduct}
                    onChange={(e) => setCertForm({ ...certForm, conduct: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Very Good">Very Good</option>
                    <option value="Good">Good</option>
                    <option value="Satisfactory">Satisfactory</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reason for Leaving School
                </label>
                <input
                  type="text"
                  required
                  value={certForm.reasonForLeaving}
                  onChange={(e) => setCertForm({ ...certForm, reasonForLeaving: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Promotion Status
                  </label>
                  <input
                    type="text"
                    value={certForm.promotedToClass}
                    onChange={(e) => setCertForm({ ...certForm, promotedToClass: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Total Working Days / Present
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Working"
                      value={certForm.totalWorkingDays}
                      onChange={(e) => setCertForm({ ...certForm, totalWorkingDays: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-900"
                    />
                    <input
                      type="number"
                      placeholder="Present"
                      value={certForm.totalDaysPresent}
                      onChange={(e) => setCertForm({ ...certForm, totalDaysPresent: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  General Remarks
                </label>
                <input
                  type="text"
                  value={certForm.remarks}
                  onChange={(e) => setCertForm({ ...certForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowIssueModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Issue & Generate Certificate
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE PREVIEW MODAL */}
      {selectedCert && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-8 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            {/* School Header */}
            <div className="text-center border-b pb-4 mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 uppercase">
                {branding?.schoolName || schoolName || 'SES Educare'}
              </h2>
              <p className="text-xs text-gray-500 tracking-wider">
                {branding?.affiliation || 'Affiliated to CBSE / State Board of Education'}
              </p>
              <div className="mt-3 inline-block px-4 py-1 bg-primary-50 rounded-full border border-primary-200 text-primary-700 font-bold uppercase text-xs tracking-widest">
                {selectedCert.certificateType?.replace('_', ' ')}
              </div>
            </div>

            {/* Certificate Details Grid */}
            <div className="space-y-3 text-xs leading-relaxed text-gray-800 mb-8">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Certificate Serial No:</span>
                <span className="font-mono font-bold text-indigo-600">{selectedCert.certificateNumber}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Admission / Student ID:</span>
                <span className="font-mono font-semibold">{selectedCert.student?.admissionNumber || selectedCert.student?.studentId}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Pupil's Full Name:</span>
                <span className="font-bold text-sm text-gray-900">
                  {selectedCert.student?.personalInfo?.firstName} {selectedCert.student?.personalInfo?.lastName}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Father's / Guardian's Name:</span>
                <span className="font-semibold">{selectedCert.student?.personalInfo?.fatherName || 'Father'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Class in which pupil last studied:</span>
                <span className="font-semibold">{selectedCert.schoolClass?.name || 'Class'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Total Working Days / Attendance:</span>
                <span>{selectedCert.totalDaysPresent || 204} days present out of {selectedCert.totalWorkingDays || 220} days</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Reason for leaving the school:</span>
                <span>{selectedCert.reasonForLeaving}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">General Conduct & Character:</span>
                <span className="font-bold text-emerald-600">{selectedCert.conduct}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Date of Issue:</span>
                <span>{new Date(selectedCert.issueDate).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Signature Block */}
            <div className="flex justify-between items-end pt-12 text-center text-xs text-gray-500">
              <div className="border-t border-gray-400 w-32 pt-2">Class Teacher</div>
              <div className="border-t border-gray-400 w-32 pt-2">Administrative Clerk</div>
              <div className="border-t border-gray-400 w-32 pt-2 font-bold text-gray-800">
                Principal Stamp & Signature
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-8 flex justify-end space-x-3 print:hidden">
              <Button
                variant="outline"
                onClick={() => setSelectedCert(null)}
              >
                Close
              </Button>
              <Button
                onClick={() => window.print()}
                className="flex items-center space-x-1"
              >
                <FiPrinter className="w-4 h-4" />
                <span>Print Certificate</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default SchoolTransferCertificates;
