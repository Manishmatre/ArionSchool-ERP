import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import SubNavTabs from '../../components/SubNavTabs';
import {
  FiBox, FiActivity, FiCpu, FiPlus, FiArrowDownLeft,
  FiArrowUpRight, FiAlertCircle, FiSearch, FiCheck
} from 'react-icons/fi';
import inventoryApi from '../../api/inventoryApi';
import {
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge, IconButton
} from '../../components/ui';

const SchoolInventory = () => {
  const [activeTab, setActiveTab] = useState('items');
  const [loading, setLoading] = useState(true);

  // Data
  const [items, setItems] = useState([]);
  const [assets, setAssets] = useState([]);

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);

  // Forms
  const [itemForm, setItemForm] = useState({
    name: '',
    code: '',
    category: 'stationery',
    unit: 'pcs',
    quantityOnHand: 0,
    minimumStockThreshold: 10,
    unitCost: 0,
    location: ''
  });

  const [stockForm, setStockForm] = useState({
    itemId: '',
    transactionType: 'inward',
    quantity: '',
    unitPrice: '',
    recipientName: '',
    department: '',
    notes: ''
  });

  const [assetForm, setAssetForm] = useState({
    name: '',
    assetTag: '',
    category: 'furniture',
    purchaseCost: '',
    location: '',
    condition: 'good',
    depreciationRatePercent: 10
  });

  useEffect(() => {
    loadTabContent();
  }, [activeTab]);

  const loadTabContent = async () => {
    setLoading(true);
    try {
      if (activeTab === 'items') {
        const res = await inventoryApi.getItems();
        setItems(res?.data?.data || []);
      } else if (activeTab === 'assets') {
        const res = await inventoryApi.getAssets();
        setAssets(res?.data?.data || []);
      }
    } catch (err) {
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    try {
      await inventoryApi.createItem({
        ...itemForm,
        quantityOnHand: Number(itemForm.quantityOnHand || 0),
        minimumStockThreshold: Number(itemForm.minimumStockThreshold || 10),
        unitCost: Number(itemForm.unitCost || 0)
      });
      toast.success('Inventory item registered');
      setShowItemModal(false);
      setItemForm({ name: '', code: '', category: 'stationery', unit: 'pcs', quantityOnHand: 0, minimumStockThreshold: 10, unitCost: 0, location: '' });
      loadTabContent();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error creating item');
    }
  };

  const handleStockMovement = async (e) => {
    e.preventDefault();
    try {
      await inventoryApi.recordStockMovement({
        ...stockForm,
        quantity: Number(stockForm.quantity),
        unitPrice: Number(stockForm.unitPrice || 0)
      });
      toast.success(`Stock ${stockForm.transactionType} recorded successfully`);
      setShowStockModal(false);
      setStockForm({ itemId: '', transactionType: 'inward', quantity: '', unitPrice: '', recipientName: '', department: '', notes: '' });
      loadTabContent();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error recording stock movement');
    }
  };

  const handleCreateAsset = async (e) => {
    e.preventDefault();
    try {
      await inventoryApi.createAsset({
        ...assetForm,
        purchaseCost: Number(assetForm.purchaseCost || 0),
        depreciationRatePercent: Number(assetForm.depreciationRatePercent || 10)
      });
      toast.success('School asset registered successfully');
      setShowAssetModal(false);
      setAssetForm({ name: '', assetTag: '', category: 'furniture', purchaseCost: '', location: '', condition: 'good', depreciationRatePercent: 10 });
      loadTabContent();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error creating asset');
    }
  };

  return (
    <Layout>
      <div className="space-y-6 pb-12">
        <PageHeader
          title="School Inventory & Asset Management"
          subtitle="Stock management, consumable inward/outward logs, lab equipment, and fixed asset registers."
        >
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                if (items.length > 0) {
                  setStockForm((prev) => ({ ...prev, itemId: items[0]._id }));
                }
                setShowStockModal(true);
              }}
            >
              <FiActivity className="w-4 h-4 mr-1 text-primary-600" /> Record Movement
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (activeTab === 'assets') setShowAssetModal(true);
                else setShowItemModal(true);
              }}
            >
              <FiPlus className="w-4 h-4 mr-1" />
              {activeTab === 'assets' ? 'Register Asset' : 'Add Item'}
            </Button>
          </div>
        </PageHeader>

        {/* Tab Navigation */}
        <SubNavTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: 'items', label: 'Inventory Catalog', icon: FiBox, badge: items.length },
            { id: 'assets', label: 'School Asset Register', icon: FiCpu, badge: assets.length }
          ]}
        />

        {/* Tab 1: Inventory Catalog */}
        {activeTab === 'items' && (
          <div className="space-y-4">
            <TableWrapper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Item Code</TableHeader>
                    <TableHeader>Item Name</TableHeader>
                    <TableHeader>Category</TableHeader>
                    <TableHeader>Stock on Hand</TableHeader>
                    <TableHeader>Unit Cost</TableHeader>
                    <TableHeader>Location</TableHeader>
                    <TableHeader className="text-right">Stock Status</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.length === 0 ? (
                    <TableEmpty colSpan={7} message="No inventory items registered yet." />
                  ) : (
                    items.map((it) => {
                      const isLowStock = it.quantityOnHand <= it.minimumStockThreshold;
                      return (
                        <TableRow key={it._id}>
                          <TableCell className="font-mono text-xs font-bold text-primary-600">{it.code}</TableCell>
                          <TableCell className="font-bold text-gray-800">{it.name}</TableCell>
                          <TableCell className="capitalize text-xs font-medium text-gray-600">{it.category?.replace(/_/g, ' ')}</TableCell>
                          <TableCell className="font-semibold text-gray-800">
                            {it.quantityOnHand} {it.unit}
                          </TableCell>
                          <TableCell>₹{(it.unitCost || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-xs text-gray-500">{it.location || 'Central Store'}</TableCell>
                          <TableCell className="text-right">
                            {isLowStock ? (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 inline-flex items-center">
                                <FiAlertCircle className="w-3 h-3 mr-1" /> Low Stock
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">
                                In Stock
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableWrapper>
          </div>
        )}

        {/* Tab 2: Asset Register */}
        {activeTab === 'assets' && (
          <div className="space-y-4">
            <TableWrapper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Asset Tag</TableHeader>
                    <TableHeader>Asset Name</TableHeader>
                    <TableHeader>Category</TableHeader>
                    <TableHeader>Purchase Cost</TableHeader>
                    <TableHeader>Current Value</TableHeader>
                    <TableHeader>Condition</TableHeader>
                    <TableHeader>Location</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assets.length === 0 ? (
                    <TableEmpty colSpan={7} message="No fixed assets registered yet." />
                  ) : (
                    assets.map((ast) => (
                      <TableRow key={ast._id}>
                        <TableCell className="font-mono text-xs font-bold text-primary-600">{ast.assetTag}</TableCell>
                        <TableCell className="font-bold text-gray-800">{ast.name}</TableCell>
                        <TableCell className="capitalize text-xs font-medium text-gray-600">{ast.category?.replace(/_/g, ' ')}</TableCell>
                        <TableCell>₹{(ast.purchaseCost || 0).toLocaleString()}</TableCell>
                        <TableCell className="font-semibold text-emerald-600">₹{(ast.currentValue || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${
                            ast.condition === 'good' || ast.condition === 'new' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {ast.condition}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">{ast.location || 'Main Campus'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableWrapper>
          </div>
        )}

        {/* Modal: Add Item */}
        {showItemModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Register Inventory Item</h3>
              <form onSubmit={handleCreateItem} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Item Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. A4 Copy Paper, Test Tube 50ml"
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">SKU / Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. STN-PAP-01"
                      value={itemForm.code}
                      onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Category</label>
                    <select
                      value={itemForm.category}
                      onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="stationery">Stationery</option>
                      <option value="lab_equipment">Lab Equipment</option>
                      <option value="sports">Sports Gear</option>
                      <option value="books">Books & Textbooks</option>
                      <option value="uniform">Uniforms</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Unit</label>
                    <select
                      value={itemForm.unit}
                      onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="pcs">Pcs</option>
                      <option value="boxes">Boxes</option>
                      <option value="kg">Kg</option>
                      <option value="sets">Sets</option>
                      <option value="packets">Packets</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Initial Qty</label>
                    <input
                      type="number"
                      value={itemForm.quantityOnHand}
                      onChange={(e) => setItemForm({ ...itemForm, quantityOnHand: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Min Alert Qty</label>
                    <input
                      type="number"
                      value={itemForm.minimumStockThreshold}
                      onChange={(e) => setItemForm({ ...itemForm, minimumStockThreshold: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100">
                  <Button variant="outline" type="button" onClick={() => setShowItemModal(false)}>Cancel</Button>
                  <Button variant="primary" type="submit">Register Item</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Stock Movement */}
        {showStockModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Record Stock Inward / Outward</h3>
              <form onSubmit={handleStockMovement} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Select Item</label>
                  <select
                    required
                    value={stockForm.itemId}
                    onChange={(e) => setStockForm({ ...stockForm, itemId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select an Item</option>
                    {items.map((it) => (
                      <option key={it._id} value={it._id}>
                        {it.name} (Current: {it.quantityOnHand} {it.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Movement Type</label>
                    <select
                      value={stockForm.transactionType}
                      onChange={(e) => setStockForm({ ...stockForm, transactionType: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="inward">Inward (Purchase / Arrival)</option>
                      <option value="outward">Outward (Issue to Staff / Class)</option>
                      <option value="return">Return to Store</option>
                      <option value="adjustment">Stock Adjustment (Audit)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Quantity</label>
                    <input
                      type="number"
                      required
                      placeholder="Qty"
                      value={stockForm.quantity}
                      onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Recipient Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Physics Teacher"
                      value={stockForm.recipientName}
                      onChange={(e) => setStockForm({ ...stockForm, recipientName: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Department</label>
                    <input
                      type="text"
                      placeholder="e.g. Science Lab"
                      value={stockForm.department}
                      onChange={(e) => setStockForm({ ...stockForm, department: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100">
                  <Button variant="outline" type="button" onClick={() => setShowStockModal(false)}>Cancel</Button>
                  <Button variant="primary" type="submit">Record Movement</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Register Asset */}
        {showAssetModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Register School Asset</h3>
              <form onSubmit={handleCreateAsset} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Asset Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dell Core i5 Computer Lab Desktop"
                    value={assetForm.name}
                    onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Category</label>
                    <select
                      value={assetForm.category}
                      onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="computer">Computer / Laptop</option>
                      <option value="projector">Projector / Smart Board</option>
                      <option value="furniture">Furniture / Desk</option>
                      <option value="lab_apparatus">Lab Apparatus</option>
                      <option value="vehicle">Vehicle / Bus</option>
                      <option value="generator">Generator / Power</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Purchase Cost (₹)</label>
                    <input
                      type="number"
                      required
                      placeholder="Cost"
                      value={assetForm.purchaseCost}
                      onChange={(e) => setAssetForm({ ...assetForm, purchaseCost: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Computer Lab 1"
                      value={assetForm.location}
                      onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Condition</label>
                    <select
                      value={assetForm.condition}
                      onChange={(e) => setAssetForm({ ...assetForm, condition: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="new">New</option>
                      <option value="good">Good</option>
                      <option value="needs_repair">Needs Repair</option>
                      <option value="damaged">Damaged</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100">
                  <Button variant="outline" type="button" onClick={() => setShowAssetModal(false)}>Cancel</Button>
                  <Button variant="primary" type="submit">Register Asset</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SchoolInventory;
