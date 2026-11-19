const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

// 1. Test FeePolicy with School Components
test('FeePolicy calculates total fee including school tuition, annual, and lab charges', () => {
  const FeePolicy = require('../models/FeePolicy');
  const dummyFranchise = new mongoose.Types.ObjectId();
  const dummyClass = new mongoose.Types.ObjectId();

  const policy = new FeePolicy({
    scope: 'school_class',
    franchise: dummyFranchise,
    schoolClass: dummyClass,
    frequency: 'quarterly',
    components: {
      tuitionFee: 12000,
      annualCharges: 3000,
      labFee: 1500,
      sportsFee: 500
    }
  });

  // Trigger pre-save hook
  policy.validateSync();
  const total = (policy.components.tuitionFee || 0) +
    (policy.components.annualCharges || 0) +
    (policy.components.labFee || 0) +
    (policy.components.sportsFee || 0);

  assert.equal(total, 17000, 'Sum of components should equal 17000');
  assert.equal(policy.frequency, 'quarterly');
});

// 2. Test FeeObligation with School Components
test('FeeObligation validates tuition and hostel components', () => {
  const FeeObligation = require('../models/FeeObligation');
  const dummyId = new mongoose.Types.ObjectId();

  const tuitionOb = new FeeObligation({
    student: dummyId,
    franchise: dummyId,
    component: 'tuition',
    amountDue: 5000,
    amountPending: 5000,
    dueDate: new Date('2025-05-10')
  });
  assert.equal(tuitionOb.validateSync(), undefined, 'Tuition obligation should be valid');

  const hostelOb = new FeeObligation({
    student: dummyId,
    franchise: dummyId,
    component: 'hostel',
    amountDue: 8000,
    amountPending: 8000
  });
  assert.equal(hostelOb.validateSync(), undefined, 'Hostel obligation should be valid');
});

// 3. Test SchoolFeeReceipt Schema
test('SchoolFeeReceipt validates unique receipt format and breakdown', () => {
  const SchoolFeeReceipt = require('../models/SchoolFeeReceipt');
  const dummyId = new mongoose.Types.ObjectId();

  const receipt = new SchoolFeeReceipt({
    receiptNumber: 'REC-2025-0001',
    student: dummyId,
    franchise: dummyId,
    amount: 5500,
    paymentMethod: 'upi',
    breakdown: [
      { component: 'Tuition Fee', amount: 5000 },
      { component: 'Late Fine', amount: 500 }
    ]
  });

  assert.equal(receipt.validateSync(), undefined, 'Receipt should be valid');
  assert.equal(receipt.receiptNumber, 'REC-2025-0001');
  assert.equal(receipt.breakdown.length, 2);
});

// 4. Test Vendor & Inventory Stock Threshold
test('InventoryItem validates stock threshold and unit costs', () => {
  const InventoryItem = require('../models/InventoryItem');
  const dummyId = new mongoose.Types.ObjectId();

  const item = new InventoryItem({
    name: 'Physics Lab Beaker 500ml',
    code: 'LAB-BEAK-500',
    category: 'lab_equipment',
    unit: 'pcs',
    quantityOnHand: 25,
    minimumStockThreshold: 10,
    unitCost: 120,
    franchise: dummyId
  });

  assert.equal(item.validateSync(), undefined, 'Inventory item should pass validation');
  assert.equal(item.quantityOnHand > item.minimumStockThreshold, true, 'Stock is above threshold');
});

// 5. Test Hostel Building and Room Occupancy
test('HostelRoom manages capacity and occupancy thresholds', () => {
  const HostelRoom = require('../models/HostelRoom');
  const dummyId = new mongoose.Types.ObjectId();

  const room = new HostelRoom({
    building: dummyId,
    roomNumber: 'B-101',
    roomType: 'double',
    capacity: 2,
    currentOccupancy: 1,
    monthlyFee: 4500,
    franchise: dummyId
  });

  assert.equal(room.validateSync(), undefined, 'Hostel room should pass validation');
  assert.equal(room.currentOccupancy < room.capacity, true, 'Room should have space available');
});
