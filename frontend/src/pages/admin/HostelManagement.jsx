import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import SubNavTabs from '../../components/SubNavTabs';
import {
  FiHome, FiGrid, FiUserCheck, FiPlus, FiPhone,
  FiUserMinus, FiCheckCircle, FiSearch
} from 'react-icons/fi';
import hostelApi from '../../api/hostelApi';
import {
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge, IconButton
} from '../../components/ui';

const HostelManagement = () => {
  const [activeTab, setActiveTab] = useState('buildings');
  const [loading, setLoading] = useState(true);

  // Data
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [allocations, setAllocations] = useState([]);

  // Modals
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);

  // Forms
  const [buildingForm, setBuildingForm] = useState({
    name: '',
    code: '',
    genderType: 'boys',
    wardenName: '',
    contactPhone: '',
    address: ''
  });

  const [roomForm, setRoomForm] = useState({
    building: '',
    roomNumber: '',
    roomType: 'double',
    capacity: 2,
    monthlyFee: 4000
  });

  const [allocateForm, setAllocateForm] = useState({
    studentId: '',
    buildingId: '',
    roomId: '',
    bedNumber: 'Bed 1',
    messPreference: 'veg',
    securityDeposit: 2000
  });

  useEffect(() => {
    loadTabContent();
  }, [activeTab]);

  const loadTabContent = async () => {
    setLoading(true);
    try {
      if (activeTab === 'buildings') {
        const res = await hostelApi.getBuildings();
        setBuildings(res?.data?.data || []);
      } else if (activeTab === 'rooms') {
        const res = await hostelApi.getRooms();
        setRooms(res?.data?.data || []);
      } else if (activeTab === 'allocations') {
        const res = await hostelApi.getAllocations({ status: 'active' });
        setAllocations(res?.data?.data || []);
      }
    } catch (err) {
      toast.error('Failed to load hostel data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBuilding = async (e) => {
    e.preventDefault();
    try {
      await hostelApi.createBuilding(buildingForm);
      toast.success('Hostel building added');
      setShowBuildingModal(false);
      setBuildingForm({ name: '', code: '', genderType: 'boys', wardenName: '', contactPhone: '', address: '' });
      loadTabContent();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error creating building');
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      await hostelApi.createRoom({
        ...roomForm,
        capacity: Number(roomForm.capacity || 2),
        monthlyFee: Number(roomForm.monthlyFee || 0)
      });
      toast.success('Hostel room added');
      setShowRoomModal(false);
      setRoomForm({ building: buildings[0]?._id || '', roomNumber: '', roomType: 'double', capacity: 2, monthlyFee: 4000 });
      loadTabContent();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error adding room');
    }
  };

  const handleAllocateBed = async (e) => {
    e.preventDefault();
    try {
      await hostelApi.allocateBed(allocateForm);
      toast.success('Student successfully allocated to hostel room');
      setShowAllocateModal(false);
      loadTabContent();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error allocating bed');
    }
  };

  const handleVacate = async (allocationId) => {
    if (!window.confirm('Vacate this student from the hostel room?')) return;
    try {
      await hostelApi.vacateBed(allocationId);
      toast.success('Room vacated successfully');
      loadTabContent();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error vacating room');
    }
  };

  return (
    <Layout>
      <div className="space-y-6 pb-12">
        <PageHeader
          title="Hostel & Residence Management"
          subtitle="Hostel blocks, room/bed allocations, mess charges, and student residency tracking."
        >
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={async () => {
                if (buildings.length === 0) {
                  const bRes = await hostelApi.getBuildings();
                  setBuildings(bRes?.data?.data || []);
                }
                if (rooms.length === 0) {
                  const rRes = await hostelApi.getRooms();
                  setRooms(rRes?.data?.data || []);
                }
                setShowAllocateModal(true);
              }}
            >
              <FiUserCheck className="w-4 h-4 mr-1 text-primary-600" /> Allocate Student
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (activeTab === 'rooms') setShowRoomModal(true);
                else setShowBuildingModal(true);
              }}
            >
              <FiPlus className="w-4 h-4 mr-1" />
              {activeTab === 'rooms' ? 'Add Room' : 'Add Hostel Building'}
            </Button>
          </div>
        </PageHeader>

        {/* Tab Navigation */}
        <SubNavTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: 'buildings', label: 'Hostel Buildings', icon: FiHome, badge: buildings.length },
            { id: 'rooms', label: 'Rooms & Beds', icon: FiGrid, badge: rooms.length },
            { id: 'allocations', label: 'Active Residents', icon: FiUserCheck, badge: allocations.length }
          ]}
        />

        {/* Tab 1: Buildings */}
        {activeTab === 'buildings' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {buildings.length === 0 ? (
                <div className="col-span-full bg-white p-12 text-center rounded-xl border border-gray-100">
                  <FiHome className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No hostel buildings registered yet.</p>
                </div>
              ) : (
                buildings.map((b) => (
                  <div key={b._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                        {b.code}
                      </span>
                      <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        {b.genderType} Hostel
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-gray-800 mt-2">{b.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">Warden: {b.wardenName || b.warden?.personalInfo?.firstName || 'Assigned Staff'}</p>

                    <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <span className="text-xs text-gray-400 block">Rooms</span>
                        <span className="font-bold text-gray-800">{b.roomsCount || 0}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 block">Capacity</span>
                        <span className="font-bold text-gray-800">{b.totalCapacity || 0}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 block">Occupied</span>
                        <span className="font-bold text-emerald-600">{b.currentOccupancy || 0}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Rooms */}
        {activeTab === 'rooms' && (
          <div className="space-y-4">
            <TableWrapper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Room Number</TableHeader>
                    <TableHeader>Building</TableHeader>
                    <TableHeader>Room Type</TableHeader>
                    <TableHeader>Capacity</TableHeader>
                    <TableHeader>Occupancy</TableHeader>
                    <TableHeader>Monthly Fee</TableHeader>
                    <TableHeader className="text-right">Status</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rooms.length === 0 ? (
                    <TableEmpty colSpan={7} message="No rooms registered yet." />
                  ) : (
                    rooms.map((r) => (
                      <TableRow key={r._id}>
                        <TableCell className="font-bold text-gray-800">Room {r.roomNumber}</TableCell>
                        <TableCell>{r.building?.name || 'Main Block'}</TableCell>
                        <TableCell className="capitalize text-xs">{r.roomType?.replace(/_/g, ' ')}</TableCell>
                        <TableCell>{r.capacity} Beds</TableCell>
                        <TableCell className="font-semibold text-gray-700">{r.currentOccupancy} / {r.capacity}</TableCell>
                        <TableCell className="font-semibold text-emerald-600">₹{(r.monthlyFee || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${
                            r.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {r.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableWrapper>
          </div>
        )}

        {/* Tab 3: Allocations */}
        {activeTab === 'allocations' && (
          <div className="space-y-4">
            <TableWrapper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Student</TableHeader>
                    <TableHeader>Admission / ID</TableHeader>
                    <TableHeader>Building & Room</TableHeader>
                    <TableHeader>Bed Assigned</TableHeader>
                    <TableHeader>Allocated Date</TableHeader>
                    <TableHeader>Mess Diet</TableHeader>
                    <TableHeader className="text-right">Action</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allocations.length === 0 ? (
                    <TableEmpty colSpan={7} message="No active hostel residents." />
                  ) : (
                    allocations.map((al) => (
                      <TableRow key={al._id}>
                        <TableCell className="font-bold text-gray-800">
                          {al.student?.personalInfo?.firstName} {al.student?.personalInfo?.lastName}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{al.student?.admissionNumber || al.student?.studentId}</TableCell>
                        <TableCell>{al.building?.name} - Rm {al.room?.roomNumber}</TableCell>
                        <TableCell className="font-semibold text-gray-700">{al.bedNumber || 'Bed 1'}</TableCell>
                        <TableCell>{new Date(al.allocatedDate).toLocaleDateString()}</TableCell>
                        <TableCell className="capitalize text-xs font-medium">{al.messPreference || 'Veg'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" onClick={() => handleVacate(al._id)}>
                            <FiUserMinus className="w-3.5 h-3.5 mr-1 text-red-500" /> Vacate
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableWrapper>
          </div>
        )}

        {/* Modal: Add Building */}
        {showBuildingModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Add Hostel Building</h3>
              <form onSubmit={handleCreateBuilding} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Building Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tagore Boys Hostel"
                    value={buildingForm.name}
                    onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. TBH-A"
                      value={buildingForm.code}
                      onChange={(e) => setBuildingForm({ ...buildingForm, code: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Gender Type</label>
                    <select
                      value={buildingForm.genderType}
                      onChange={(e) => setBuildingForm({ ...buildingForm, genderType: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="boys">Boys Hostel</option>
                      <option value="girls">Girls Hostel</option>
                      <option value="coed">Co-Ed</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Warden Name</label>
                    <input
                      type="text"
                      placeholder="Warden Name"
                      value={buildingForm.wardenName}
                      onChange={(e) => setBuildingForm({ ...buildingForm, wardenName: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Contact Phone</label>
                    <input
                      type="text"
                      placeholder="Phone"
                      value={buildingForm.contactPhone}
                      onChange={(e) => setBuildingForm({ ...buildingForm, contactPhone: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100">
                  <Button variant="outline" type="button" onClick={() => setShowBuildingModal(false)}>Cancel</Button>
                  <Button variant="primary" type="submit">Create Building</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Room */}
        {showRoomModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Add Hostel Room</h3>
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Hostel Building</label>
                  <select
                    required
                    value={roomForm.building}
                    onChange={(e) => setRoomForm({ ...roomForm, building: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Building</option>
                    {buildings.map((b) => (
                      <option key={b._id} value={b._id}>{b.name} ({b.genderType})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Room Number</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 101, 204"
                      value={roomForm.roomNumber}
                      onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Room Type</label>
                    <select
                      value={roomForm.roomType}
                      onChange={(e) => setRoomForm({ ...roomForm, roomType: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="single">Single Bed</option>
                      <option value="double">Double Sharing</option>
                      <option value="triple">Triple Sharing</option>
                      <option value="four_bed">4-Bed Room</option>
                      <option value="dormitory">Dormitory</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Capacity (Beds)</label>
                    <input
                      type="number"
                      required
                      value={roomForm.capacity}
                      onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Monthly Fee (₹)</label>
                    <input
                      type="number"
                      value={roomForm.monthlyFee}
                      onChange={(e) => setRoomForm({ ...roomForm, monthlyFee: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100">
                  <Button variant="outline" type="button" onClick={() => setShowRoomModal(false)}>Cancel</Button>
                  <Button variant="primary" type="submit">Add Room</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Allocate Bed */}
        {showAllocateModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Allocate Student to Hostel</h3>
              <form onSubmit={handleAllocateBed} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Student ID / MongoDB ID</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Student ID"
                    value={allocateForm.studentId}
                    onChange={(e) => setAllocateForm({ ...allocateForm, studentId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Hostel Room</label>
                  <select
                    required
                    value={allocateForm.roomId}
                    onChange={(e) => {
                      const selectedRoom = rooms.find((r) => r._id === e.target.value);
                      setAllocateForm({
                        ...allocateForm,
                        roomId: e.target.value,
                        buildingId: selectedRoom?.building?._id || selectedRoom?.building || ''
                      });
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select an Available Room</option>
                    {rooms.filter((r) => r.currentOccupancy < r.capacity).map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.building?.name} - Room {r.roomNumber} (Vacant: {r.capacity - r.currentOccupancy})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Bed Number</label>
                    <input
                      type="text"
                      placeholder="e.g. Bed 1"
                      value={allocateForm.bedNumber}
                      onChange={(e) => setAllocateForm({ ...allocateForm, bedNumber: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Mess Preference</label>
                    <select
                      value={allocateForm.messPreference}
                      onChange={(e) => setAllocateForm({ ...allocateForm, messPreference: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="veg">Vegetarian</option>
                      <option value="non_veg">Non-Vegetarian</option>
                      <option value="jain">Jain Food</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100">
                  <Button variant="outline" type="button" onClick={() => setShowAllocateModal(false)}>Cancel</Button>
                  <Button variant="primary" type="submit">Confirm Allocation</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default HostelManagement;
