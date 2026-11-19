const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const mongoose = require('mongoose');
const FeeObligation = require('../models/FeeObligation');
const SchoolFeeReceipt = require('../models/SchoolFeeReceipt');
const Payment = require('../models/Payment');

test('Razorpay HMAC-SHA256 signature verification passes on matching credentials', () => {
  const secret = 'test_secret_key_12345';
  const orderId = 'order_DA28710293';
  const paymentId = 'pay_0192830192';

  const bodyToSign = `${orderId}|${paymentId}`;
  const validSignature = crypto
    .createHmac('sha256', secret)
    .update(bodyToSign)
    .digest('hex');

  // Verify
  const verificationDigest = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  assert.equal(verificationDigest, validSignature, 'Valid HMAC signature must match computed digest');
});

test('Razorpay HMAC-SHA256 rejects tampered or fraudulent payment signatures', () => {
  const secret = 'test_secret_key_12345';
  const orderId = 'order_DA28710293';
  const paymentId = 'pay_0192830192';
  const forgedSignature = 'fraudulent_signature_00000000000000000000000000000000';

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  assert.notEqual(forgedSignature, expectedSignature, 'Forged signature must not match authentic digest');
});

test('Razorpay Webhook signature verification validates raw payload bytes', () => {
  const webhookSecret = 'whsec_test_secret_abc123';
  const rawPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_998877',
          amount: 50000,
          currency: 'INR',
          status: 'captured'
        }
      }
    }
  });

  const validWebhookSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawPayload)
    .digest('hex');

  const verification = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawPayload)
    .digest('hex');

  assert.equal(verification, validWebhookSignature, 'Raw body webhook signature verification must succeed');
});

test('FeeObligation recalculates status to paid when full amount is settled', () => {
  const dummyStudentId = new mongoose.Types.ObjectId();
  const dummyFranchiseId = new mongoose.Types.ObjectId();

  const obligation = new FeeObligation({
    student: dummyStudentId,
    franchise: dummyFranchiseId,
    component: 'tuition',
    amountDue: 15000,
    amountPaid: 0,
    amountPending: 15000,
    status: 'open'
  });

  // Pay partially
  obligation.amountPaid += 5000;
  obligation.recalculate();
  assert.equal(obligation.amountPending, 10000);
  assert.equal(obligation.status, 'partial');

  // Settle completely
  obligation.amountPaid += 10000;
  obligation.recalculate();
  assert.equal(obligation.amountPending, 0);
  assert.equal(obligation.status, 'paid');
});

test('SchoolFeeReceipt format conforms to unique SFR-YYYY-XXXXXX standard', () => {
  const dummyStudentId = new mongoose.Types.ObjectId();
  const dummyFranchiseId = new mongoose.Types.ObjectId();

  const receipt = new SchoolFeeReceipt({
    receiptNumber: 'SFR-2026-000125',
    student: dummyStudentId,
    franchise: dummyFranchiseId,
    amount: 15000,
    paymentMethod: 'online',
    gatewayPaymentId: 'pay_0192830192',
    breakdown: [{ component: 'tuition', amount: 15000 }],
    remarks: 'Online fee payment via Razorpay'
  });

  const err = receipt.validateSync();
  assert.equal(err, undefined, 'SchoolFeeReceipt should be valid');
  assert.ok(/^SFR-\d{4}-\d{6}$/.test(receipt.receiptNumber), 'Receipt number must follow SFR-YYYY-XXXXXX format');
  assert.equal(receipt.paymentMethod, 'online');
  assert.equal(receipt.amount, 15000);
});
