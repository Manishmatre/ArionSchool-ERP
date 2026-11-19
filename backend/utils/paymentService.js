const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance safely (only when keys exist)
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  try {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  } catch (err) {
    console.error('Failed to initialize Razorpay instance:', err.message);
  }
}

// Create Order
exports.createOrder = async (amount, currency = 'INR', receipt) => {
  if (!razorpay) {
    throw new Error('Payment gateway (Razorpay) is not configured with valid API keys.');
  }

  try {
    const options = {
      amount: Math.round(amount * 100), // amount in paise
      currency,
      receipt,
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    throw error;
  }
};

// Verify Payment Signature
exports.verifyPaymentSignature = (orderId, paymentId, signature) => {
  if (!process.env.RAZORPAY_KEY_SECRET) {
    console.error('Payment verification error: RAZORPAY_KEY_SECRET is not configured');
    return false;
  }

  try {
    const text = orderId + '|' + paymentId;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    return generated_signature === signature;
  } catch (error) {
    console.error('Payment verification error:', error);
    return false;
  }
};

// Verify Razorpay Webhook Signature
exports.verifyWebhookSignature = (rawBody, signature, secret) => {
  const webhookSecret = secret || process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!webhookSecret || !signature) return false;
  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
  } catch (err) {
    console.error('Webhook signature verification error:', err.message);
    return false;
  }
};
