import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import SubNavTabs from '../../components/SubNavTabs';
import {
  FiTruck, FiNavigation, FiPlus, FiAlertTriangle, FiPhone, FiCheck, FiCompass
} from 'react-icons/fi';
import transportApi from '../../api/transportApi';
import {
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge
} from '../../components/ui';

const TransportGPS = () => {
  const [activeTab, setActiveTab] = useState('fleet');
  const [loading, setLoading] = useState(true);

  // Fleet & Routes
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [liveFleet, setLiveFleet] = useState([]);

  // Modals
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    busNumber: 'Bus 01',
    vehicleNumber: 'DL-01-AB-1234',
    capacity: 40,
    driverName: '',
    driverMobile: '',
    driverLicenseNumber: '',
    gpsDeviceId: 'GPS-BUS-01',
    status: 'active'
  });

  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routeForm, setRouteForm] = useState({
    routeName: '',
    vehicle: '',
    monthlyFee: 1500,
    stops: [
      { stopName: 'Main Crossing', pickupTime: '07:15 AM', dropTime: '02:45 PM' }
    ]
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadLiveFleet, 10000); // 10s live GPS refresh
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vehRes, routeRes] = await Promise.all([
        transportApi.getVehicles(),
        transportApi.getRoutes()
      ]);
      setVehicles(vehRes.data?.data || []);
      setRoutes(routeRes.data?.data || []);
      await loadLiveFleet();
    } catch (err) {
      console.error(err);
      toast.error('Failed to load transport data');
    } finally {
      setLoading(false);
    }
  };

  const loadLiveFleet = async () => {
    try {
      const res = await transportApi.getLiveFleet();
      setLiveFleet(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    try {
      await transportApi.createVehicle(vehicleForm);
      toast.success('Vehicle added to school fleet');
      setShowVehicleModal(false);
      setVehicleForm({
        busNumber: `Bus 0${vehicles.length + 2}`,
        vehicleNumber: '',
        capacity: 40,
        driverName: '',
        driverMobile: '',
        driverLicenseNumber: '',
        gpsDeviceId: `GPS-BUS-0${vehicles.length + 2}`,
        status: 'active'
      });
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to add vehicle');
    }
  };

  const handleCreateRoute = async (e) => {
    e.preventDefault();
    try {
      await transportApi.createRoute(routeForm);
      toast.success('Transport route configured');
      setShowRouteModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create route');
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Transport, GPS & Fleet Management"
        subtitle="School bus fleet directory, route pickup points, live GPS telemetry tracking, and driver safety monitoring."
      />

      {/* Tabs */}
      <SubNavTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'fleet', label: 'Vehicle Fleet', icon: FiTruck, badge: vehicles.length },
          { id: 'routes', label: 'Routes & Stops', icon: FiNavigation, badge: routes.length },
          { id: 'live', label: 'Live GPS Telemetry', icon: FiCompass, badge: liveFleet.length }
        ]}
      />

      {/* TAB 1: FLEET */}
      {activeTab === 'fleet' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-semibold text-gray-800">
              Registered School Vehicles
            </h3>
            <Button
              onClick={() => setShowVehicleModal(true)}
              className="flex items-center space-x-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <FiPlus className="w-4 h-4" />
              <span>Add Vehicle</span>
            </Button>
          </div>

          <TableWrapper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Bus / Vehicle</TableHeader>
                  <TableHeader>Reg. Number</TableHeader>
                  <TableHeader>Capacity</TableHeader>
                  <TableHeader>Driver & Contact</TableHeader>
                  <TableHeader>GPS Device</TableHeader>
                  <TableHeader>Status</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {vehicles.length === 0 ? (
                  <TableEmpty colSpan={6} message="No vehicles registered in fleet." />
                ) : (
                  vehicles.map(v => (
                    <TableRow key={v._id}>
                      <TableCell className="font-bold text-gray-900">
                        {v.busNumber}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {v.vehicleNumber}
                      </TableCell>
                      <TableCell className="text-xs">
                        {v.capacity} Seats
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900 block">
                          {v.driverName}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center space-x-1">
                          <FiPhone className="w-3 h-3" />
                          <span>{v.driverMobile}</span>
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-indigo-600">
                        {v.gpsDeviceId || 'Not Installed'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={v.status === 'active' ? 'success' : 'warning'}
                          text={v.status?.toUpperCase()}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableWrapper>
        </div>
      )}

      {/* TAB 2: ROUTES */}
      {activeTab === 'routes' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-semibold text-gray-800">
              Transport Routes & Scheduled Stops
            </h3>
            <Button
              onClick={() => {
                if (vehicles.length > 0) setRouteForm(prev => ({ ...prev, vehicle: vehicles[0]._id }));
                setShowRouteModal(true);
              }}
              className="flex items-center space-x-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <FiPlus className="w-4 h-4" />
              <span>Create Route</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routes.map(r => (
              <div key={r._id} className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-gray-900">{r.routeName}</h4>
                    <span className="text-xs text-indigo-600 font-semibold">
                      Assigned: {r.vehicle?.busNumber || 'Unassigned'}
                    </span>
                  </div>
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded">
                    ₹{r.monthlyFee}/month
                  </span>
                </div>

                <div className="space-y-1.5 border-t pt-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                    Stops & Timings ({r.stops?.length || 0})
                  </span>
                  {r.stops?.map((stop, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs text-gray-600">
                      <span>{idx + 1}. {stop.stopName}</span>
                      <span className="font-mono text-gray-400">
                        {stop.pickupTime} / {stop.dropTime}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: LIVE GPS TELEMETRY */}
      {activeTab === 'live' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {liveFleet.map(({ vehicle, lastKnownLocation }) => {
              const isOverSpeed = lastKnownLocation?.isOverSpeed;
              const hasGps = !!lastKnownLocation;

              return (
                <div
                  key={vehicle._id}
                  className={`p-4 rounded-xl border shadow-sm ${
                    isOverSpeed
                      ? 'bg-red-50/50 border-red-300'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-gray-900">
                        {vehicle.busNumber}
                      </h4>
                      <span className="text-xs text-gray-400 font-mono">{vehicle.vehicleNumber}</span>
                    </div>
                    {isOverSpeed && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded flex items-center space-x-1">
                        <FiAlertTriangle className="w-3 h-3" />
                        <span>OVERSPEED</span>
                      </span>
                    )}
                  </div>

                  {hasGps ? (
                    <div className="space-y-2 mt-3 pt-2 border-t text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current Speed:</span>
                        <span className={`font-bold font-mono text-sm ${isOverSpeed ? 'text-red-600' : 'text-emerald-600'}`}>
                          {lastKnownLocation.speedKmh} km/h
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Coordinates:</span>
                        <span className="font-mono text-[11px]">
                          {lastKnownLocation.latitude?.toFixed(4)}, {lastKnownLocation.longitude?.toFixed(4)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Driver:</span>
                        <span className="font-semibold">{vehicle.driverName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Last Telemetry:</span>
                        <span>{new Date(lastKnownLocation.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-gray-400">
                      No active GPS telemetry received yet for {vehicle.gpsDeviceId || 'Device'}.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CREATE VEHICLE MODAL */}
      {showVehicleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Register Vehicle in Fleet
            </h3>
            <form onSubmit={handleCreateVehicle} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Bus / Fleet Number
                  </label>
                  <input
                    type="text"
                    required
                    value={vehicleForm.busNumber}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, busNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Registration No.
                  </label>
                  <input
                    type="text"
                    required
                    value={vehicleForm.vehicleNumber}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Seating Capacity
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="80"
                    value={vehicleForm.capacity}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    GPS Device Tracker ID
                  </label>
                  <input
                    type="text"
                    value={vehicleForm.gpsDeviceId}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, gpsDeviceId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Driver Name
                  </label>
                  <input
                    type="text"
                    required
                    value={vehicleForm.driverName}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, driverName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Driver Mobile
                  </label>
                  <input
                    type="tel"
                    required
                    value={vehicleForm.driverMobile}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, driverMobile: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowVehicleModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Register Vehicle
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ROUTE MODAL */}
      {showRouteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Create Transport Route
            </h3>
            <form onSubmit={handleCreateRoute} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Route Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Route 4 - Civil Lines & North Campus"
                  value={routeForm.routeName}
                  onChange={(e) => setRouteForm({ ...routeForm, routeName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Assigned Vehicle
                  </label>
                  <select
                    value={routeForm.vehicle}
                    onChange={(e) => setRouteForm({ ...routeForm, vehicle: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  >
                    {vehicles.map(v => (
                      <option key={v._id} value={v._id}>{v.busNumber} ({v.vehicleNumber})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Monthly Transport Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={routeForm.monthlyFee}
                    onChange={(e) => setRouteForm({ ...routeForm, monthlyFee: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRouteModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Save Route
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default TransportGPS;
