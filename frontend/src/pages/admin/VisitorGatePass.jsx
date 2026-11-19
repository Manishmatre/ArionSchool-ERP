import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import {
  FiShield, FiUserCheck, FiPlus, FiPrinter, FiSearch, FiCheck, FiLogOut, FiUsers
} from 'react-icons/fi';
import visitorPassApi from '../../api/visitorPassApi';
import studentApi from '../../api/studentApi';
import staffApi from '../../api/staffApi';
import {
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge
} from '../../components/ui';

const VisitorGatePass = () => {
  const [loading, setLoading] = useState(true);
  const [passes, setPasses] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // New Pass Modal
  const [showModal, setShowModal] = useState(false);
  const [passForm, setPassForm] = useState({
    visitorName: '',
    mobileNumber: '',
    purpose: 'Parent Inquiry / Fee Payment',
    visitingPersonType: 'staff',
    personToMeet: 'Principal Office',
    idProofType: 'aadhaar',
    idProofNumber: '',
    numberOfPersons: 1,
    remarks: ''
  });

  // Selected Pass for Print View
  const [selectedPass, setSelectedPass] = useState(null);

  useEffect(() => {
    loadPasses();
  }, [statusFilter]);

  const loadPasses = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;
      const res = await visitorPassApi.getPasses(params);
      setPasses(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load visitor passes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePass = async (e) => {
    e.preventDefault();
    try {
      const res = await visitorPassApi.createPass(passForm);
      toast.success(res.data?.message || 'Visitor Pass issued');
      setShowModal(false);
      setSelectedPass(res.data?.data);
      setPassForm({
        visitorName: '',
        mobileNumber: '',
        purpose: 'Parent Inquiry / Fee Payment',
        visitingPersonType: 'staff',
        personToMeet: 'Principal Office',
        idProofType: 'aadhaar',
        idProofNumber: '',
        numberOfPersons: 1,
        remarks: ''
      });
      loadPasses();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to issue visitor pass');
    }
  };

  const handleCheckout = async (id) => {
    try {
      await visitorPassApi.checkoutPass(id);
      toast.success('Visitor marked as checked out');
      loadPasses();
    } catch (err) {
      toast.error('Failed to checkout visitor');
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Visitor Gate Pass & Campus Security"
        subtitle="Visitor registration, QR security gate passes, real-time entry/exit tracking, and campus safety clearance."
      />

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <FiSearch className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search visitor name or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadPasses()}
              className="pl-9 pr-3 py-2 border rounded-lg text-sm bg-gray-50"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-gray-50 font-medium"
          >
            <option value="">All Visitors</option>
            <option value="inside">Currently Inside Campus</option>
            <option value="checked_out">Checked Out History</option>
          </select>
        </div>

        <Button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <FiPlus className="w-4 h-4" />
          <span>Issue Gate Pass</span>
        </Button>
      </div>

      {/* Passes Table */}
      <TableWrapper>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Pass #</TableHeader>
              <TableHeader>Visitor Name</TableHeader>
              <TableHeader>Contact No.</TableHeader>
              <TableHeader>Person to Meet</TableHeader>
              <TableHeader>Purpose</TableHeader>
              <TableHeader>Check-in Time</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {passes.length === 0 ? (
              <TableEmpty colSpan={8} message="No visitor passes found." />
            ) : (
              passes.map(pass => (
                <TableRow key={pass._id}>
                  <TableCell className="font-mono text-xs font-bold text-indigo-600">
                    {pass.passNumber}
                  </TableCell>
                  <TableCell className="font-semibold text-gray-900">
                    {pass.visitorName}
                    {pass.numberOfPersons > 1 && (
                      <span className="ml-1 text-[11px] text-gray-400">
                        (+{pass.numberOfPersons - 1})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {pass.mobileNumber}
                  </TableCell>
                  <TableCell className="text-xs text-gray-700">
                    {pass.personToMeet || 'School Office'}
                  </TableCell>
                  <TableCell className="text-xs text-gray-600">
                    {pass.purpose}
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(pass.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={pass.status === 'inside' ? 'success' : 'info'}
                      text={pass.status === 'inside' ? 'ON CAMPUS' : 'CHECKED OUT'}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedPass(pass)}
                        className="text-xs p-1 text-indigo-600 hover:text-indigo-800"
                        title="Print Gate Pass"
                      >
                        <FiPrinter className="w-4 h-4" />
                      </button>
                      {pass.status === 'inside' && (
                        <button
                          onClick={() => handleCheckout(pass._id)}
                          className="text-xs px-2 py-0.5 bg-red-100 hover:bg-red-200 text-red-700 rounded font-medium"
                          title="Check Out"
                        >
                          Check Out
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableWrapper>

      {/* ISSUE PASS MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Issue Visitor Gate Pass
            </h3>
            <form onSubmit={handleCreatePass} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Visitor Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={passForm.visitorName}
                    onChange={(e) => setPassForm({ ...passForm, visitorName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={passForm.mobileNumber}
                    onChange={(e) => setPassForm({ ...passForm, mobileNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Person / Office to Meet
                  </label>
                  <input
                    type="text"
                    required
                    value={passForm.personToMeet}
                    onChange={(e) => setPassForm({ ...passForm, personToMeet: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Number of Persons
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={passForm.numberOfPersons}
                    onChange={(e) => setPassForm({ ...passForm, numberOfPersons: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Purpose of Visit
                </label>
                <input
                  type="text"
                  required
                  value={passForm.purpose}
                  onChange={(e) => setPassForm({ ...passForm, purpose: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    ID Proof Type
                  </label>
                  <select
                    value={passForm.idProofType}
                    onChange={(e) => setPassForm({ ...passForm, idProofType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  >
                    <option value="aadhaar">Aadhaar Card</option>
                    <option value="driving_license">Driving License</option>
                    <option value="voter_id">Voter ID</option>
                    <option value="pan_card">PAN Card</option>
                    <option value="other">Other ID</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    ID Proof Number (Last 4 digits)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 4589"
                    value={passForm.idProofNumber}
                    onChange={(e) => setPassForm({ ...passForm, idProofNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Issue Gate Pass
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT GATE PASS MODAL */}
      {selectedPass && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 text-center">
            <div className="border-b pb-3 mb-4">
              <h4 className="font-bold text-gray-900 uppercase tracking-wider text-sm">
                SES EDUCARE ACADEMY
              </h4>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                OFFICIAL VISITOR GATE PASS
              </p>
            </div>

            <div className="bg-indigo-50 p-3 rounded-lg mb-4">
              <span className="text-xs text-gray-500 block">Pass Number</span>
              <span className="text-lg font-mono font-bold text-indigo-600">
                {selectedPass.passNumber}
              </span>
            </div>

            <div className="text-left text-xs space-y-2 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-400">Visitor:</span>
                <span className="font-semibold">{selectedPass.visitorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Mobile:</span>
                <span className="font-mono">{selectedPass.mobileNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Meeting:</span>
                <span className="font-semibold">{selectedPass.personToMeet}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Purpose:</span>
                <span>{selectedPass.purpose}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Check-in:</span>
                <span>{new Date(selectedPass.checkInTime).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => setSelectedPass(null)}
              >
                Close
              </Button>
              <Button
                className="flex-1 text-xs flex items-center justify-center space-x-1"
                onClick={() => window.print()}
              >
                <FiPrinter className="w-3.5 h-3.5" />
                <span>Print Slip</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default VisitorGatePass;
