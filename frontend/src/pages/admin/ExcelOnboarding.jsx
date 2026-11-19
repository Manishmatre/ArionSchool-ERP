import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import {
  FiUploadCloud, FiCheckCircle, FiAlertCircle, FiFileText, FiDownload, FiCheck
} from 'react-icons/fi';
import onboardingApi from '../../api/onboardingApi';
import academicApi from '../../api/academicApi';
import {
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty
} from '../../components/ui';

const ExcelOnboarding = () => {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [csvText, setCsvText] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const res = await academicApi.getSessions();
      const sessList = res.data?.data || [];
      setSessions(sessList);
      if (sessList.length > 0) {
        setSelectedSession(sessList[0]._id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoadSample = () => {
    const sample = `firstName,lastName,className,rollNumber,fatherName,mobileNumber,gender,bloodGroup\nAarav,Sharma,Class 1,101,Rajesh Sharma,9876543210,male,B+\nDiya,Patel,Class 1,102,Sanjay Patel,9876543211,female,O+\nKabir,Verma,Class 2,201,Vikram Verma,9876543212,male,A+\nAnanya,Singh,Class 2,202,Manoj Singh,9876543213,female,AB+`;
    setCsvText(sample);
    toast.info('Sample student CSV loaded into editor');
  };

  const handlePreview = async () => {
    if (!csvText.trim()) {
      toast.error('Please paste CSV rows or upload a file first');
      return;
    }

    setAnalyzing(true);
    try {
      // Parse CSV client-side into JSON objects
      const lines = csvText.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const vals = lines[i].split(',').map(v => v.trim());
        const rowObj = {};
        headers.forEach((h, idx) => {
          rowObj[h] = vals[idx] || '';
        });
        rows.push(rowObj);
      }

      const res = await onboardingApi.preview({ rows });
      setPreviewData(res.data?.data);
      toast.success(`Validated ${rows.length} rows`);
    } catch (err) {
      console.error(err);
      toast.error('Validation failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCommit = async () => {
    if (!previewData || previewData.validCount === 0) {
      toast.error('No valid rows available to import');
      return;
    }

    setCommitting(true);
    try {
      const validRows = previewData.preview.filter(p => p.isValid);
      const res = await onboardingApi.commit({
        rows: validRows,
        academicSessionId: selectedSession
      });
      toast.success(res.data?.message || 'Import successful!');
      setPreviewData(null);
      setCsvText('');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Commit import failed');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Excel Bulk Import & Onboarding"
        subtitle="Bulk student & staff registration engine with column pre-validation, error detection, and safe rollback."
      />

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <div className="flex items-center space-x-3">
            <label className="text-xs font-semibold text-gray-700">
              Target Academic Session:
            </label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-xs bg-gray-50 font-medium"
            >
              {sessions.map(s => (
                <option key={s._id} value={s._id}>{s.sessionName}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadSample}
              className="text-xs flex items-center space-x-1"
            >
              <FiDownload className="w-3.5 h-3.5" />
              <span>Load Sample CSV</span>
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Paste CSV Data (Columns: firstName, lastName, className, rollNumber, fatherName, mobileNumber, gender, bloodGroup)
          </label>
          <textarea
            rows={6}
            placeholder="firstName,lastName,className,rollNumber,fatherName,mobileNumber,gender..."
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-xs font-mono bg-gray-50"
          />
        </div>

        <div className="flex justify-between items-center">
          <Button
            onClick={handlePreview}
            disabled={analyzing}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center space-x-2"
          >
            <FiUploadCloud className="w-4 h-4" />
            <span>{analyzing ? 'Validating Columns...' : 'Parse & Validate Rows'}</span>
          </Button>

          {previewData && (
            <div className="flex items-center space-x-4 text-xs font-semibold">
              <span className="text-emerald-600">✓ {previewData.validCount} Valid</span>
              <span className="text-red-600">✗ {previewData.errorCount} Errors</span>
              <Button
                onClick={handleCommit}
                disabled={committing || previewData.validCount === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center space-x-1"
              >
                <FiCheck className="w-3.5 h-3.5" />
                <span>{committing ? 'Importing...' : `Commit Import (${previewData.validCount} Students)`}</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* PREVIEW VALIDATION TABLE */}
      {previewData && (
        <div>
          <h4 className="text-sm font-bold text-gray-800 mb-3">
            Pre-Import Validation Preview ({previewData.preview.length} Rows)
          </h4>
          <TableWrapper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Row #</TableHeader>
                  <TableHeader>Student Name</TableHeader>
                  <TableHeader>Class</TableHeader>
                  <TableHeader>Roll</TableHeader>
                  <TableHeader>Father Name</TableHeader>
                  <TableHeader>Mobile</TableHeader>
                  <TableHeader>Validation Status</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewData.preview.map(row => (
                  <TableRow
                    key={row.rowNumber}
                    className={row.isValid ? 'bg-emerald-50/20' : 'bg-red-50/20'}
                  >
                    <TableCell className="font-mono text-xs">{row.rowNumber}</TableCell>
                    <TableCell className="font-semibold text-gray-900">
                      {row.data.firstName} {row.data.lastName}
                    </TableCell>
                    <TableCell className="text-xs">{row.data.className}</TableCell>
                    <TableCell className="font-mono text-xs">{row.data.rollNumber}</TableCell>
                    <TableCell className="text-xs">{row.data.fatherName}</TableCell>
                    <TableCell className="font-mono text-xs">{row.data.mobileNumber || row.data.fatherMobile}</TableCell>
                    <TableCell>
                      {row.isValid ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800">
                          READY TO IMPORT
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          {row.errors.map((err, idx) => (
                            <span key={idx} className="block text-[10px] font-bold text-red-600">
                              • {err}
                            </span>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        </div>
      )}
    </Layout>
  );
};

export default ExcelOnboarding;
