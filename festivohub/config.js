module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  mongodb: {
    uri: process.env.MONGODB_URI,
    db: process.env.DB_NAME || 'festivohub',
    tlsAllowInvalidCertificates: process.env.TLS_ALLOW_INVALID === 'true',
  },
  jwtSecret: process.env.JWT_SECRET || 'festivohub_secret_key_2026',
  allowedAdmins: process.env.ALLOWED_ADMINS ? process.env.ALLOWED_ADMINS.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean) : ['parmarprachi@gmail.com', 'bhaktiraj1110@gmail.com'],
  // Payment gateway (Razorpay/Stripe). Never expose these to the frontend.
  payment: {
    provider: process.env.PAYMENT_PROVIDER || 'razorpay', // 'razorpay' | 'stripe' | 'test'
    mode: process.env.PAYMENT_MODE || 'test',            // 'test' | 'sandbox' | 'live'
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  },
  platform: {
    name: process.env.PLATFORM_NAME || 'FestivoHub',
    contactEmail: process.env.CONTACT_EMAIL || 'support@festivohub.in',
    contactPhone: process.env.CONTACT_PHONE || '',
    currency: process.env.CURRENCY || 'INR',
    currencySymbol: process.env.CURRENCY_SYMBOL || '\u20B9',
    commissionPercent: parseFloat(process.env.PLATFORM_COMMISSION || '10'), // e.g. 10%
    bookingFee: parseFloat(process.env.BOOKING_FEE || '0'),
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: process.env.SMTP_PORT || '587',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || '',
  },
};