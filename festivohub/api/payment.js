const crypto = require('crypto');
const config = require('../config');

// Razorpay signature verification uses HMAC-SHA256 of (order_id + "|" + payment_id)
// with the key secret. This needs no SDK and verifies server-side only.
function razorpayVerifySignature({ order_id, payment_id, signature }) {
  const secret = config.payment.razorpayKeySecret;
  if (!secret) return { ok: false, reason: 'Gateway not configured' };
  const expected = crypto
    .createHmac('sha256', secret)
    .update(order_id + '|' + payment_id)
    .digest('hex');
  return { ok: expected === signature, reason: expected === signature ? 'ok' : 'Signature mismatch' };
}

// Stripe-style: verify with the webhook signature using its timestamp + raw payload.
function stripeVerifySignature(payload, signature, timestamp, secret) {
  if (!secret) return { ok: false, reason: 'Gateway not configured' };
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  return { ok: crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature)), reason: 'ok' };
}

// Create a payment order. In test mode (no real keys), returns a locally-scoped
// order_id used to track state server-side; the booking is NOT marked paid here.
function createPaymentOrder(amountPaise) {
  const provider = config.payment.provider;
  const mode = config.payment.mode;
  if (provider === 'stripe' && config.payment.stripeSecretKey) {
    // Integrate Stripe SDK / API here. Returns a PaymentIntent id.
    return { gateway: 'stripe', order_id: 'pi_test_' + crypto.randomBytes(8).toString('hex') };
  }
  if (provider === 'razorpay' && config.payment.razorpayKeyId && config.payment.razorpayKeySecret) {
    // Integrate Razorpay Orders API here. Returns a Razorpay order id.
    return { gateway: 'razorpay', order_id: 'order_' + crypto.randomBytes(8).toString('hex'), amount: amountPaise };
  }
  // TEST mode: deterministic local order id so payment state is tracked server-side.
  return { gateway: 'test', order_id: 'test_' + crypto.randomBytes(8).toString('hex'), mode };
}

module.exports = { createPaymentOrder, razorpayVerifySignature, stripeVerifySignature };