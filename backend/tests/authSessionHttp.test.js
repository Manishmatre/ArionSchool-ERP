const test = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config();
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const LoginActivity = require('../models/LoginActivity');

test('live auth APIs accept case-insensitive email, validate credentials, and revoke logout sessions', {
  skip: process.env.RUN_AUTH_HTTP_INTEGRATION !== '1'
}, async () => {
  assert.equal(process.env.NODE_ENV, 'development', 'Refusing to create auth fixtures outside development');
  assert.ok(process.env.MONGODB_URI && process.env.JWT_SECRET);
  const suffix = `authit${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const email = `${suffix}@example.com`;
  let user;
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000, connectTimeoutMS: 15000 });

  try {
    user = await User.create({ name: 'Auth Integration', email, password: 'AuthTestPassword123!', role: 'student', isActive: true });
    const base = `http://127.0.0.1:${process.env.PORT || 5000}/api/auth`;
    const invalid = await fetch(`${base}/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: email.toUpperCase(), password: 'WrongPassword123!' })
    });
    assert.equal(invalid.status, 401, 'invalid credentials must be rejected');
    console.log('PASS invalid credentials: HTTP 401');

    const login = await fetch(`${base}/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: email.toUpperCase(), password: 'AuthTestPassword123!' })
    });
    assert.equal(login.status, 200, 'valid case-insensitive email login');
    const loginBody = await login.json();
    assert.ok(loginBody.token);
    console.log('PASS valid uppercase-email login: HTTP 200');

    const authHeaders = { Authorization: `Bearer ${loginBody.token}` };
    const me = await fetch(`${base}/me`, { headers: authHeaders });
    assert.equal(me.status, 200, 'new token must load authenticated user');
    console.log('PASS authenticated /me: HTTP 200');

    const logout = await fetch(`${base}/logout`, { method: 'POST', headers: authHeaders });
    assert.equal(logout.status, 200, 'logout should revoke token family');
    console.log('PASS logout: HTTP 200');

    const afterLogout = await fetch(`${base}/me`, { headers: authHeaders });
    assert.equal(afterLogout.status, 401, 'revoked token must no longer access protected API');
    console.log('PASS revoked token /me: HTTP 401');

    const secondLogin = await fetch(`${base}/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: email, password: 'AuthTestPassword123!' })
    });
    assert.equal(secondLogin.status, 200);
    const secondLoginBody = await secondLogin.json();
    const invalidReset = await fetch(`${base}/reset-password/not-a-valid-token`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'AuthResetPassword456!' })
    });
    assert.equal(invalidReset.status, 400, 'invalid password reset token must be rejected');

    const expiredToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(expiredToken).digest('hex');
    user.resetPasswordExpire = new Date(Date.now() - 1000);
    await user.save({ validateBeforeSave: false });
    const expiredReset = await fetch(`${base}/reset-password/${expiredToken}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'AuthResetPassword456!' })
    });
    assert.equal(expiredReset.status, 400, 'expired password reset token must be rejected');

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = new Date(Date.now() + 5 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const reset = await fetch(`${base}/reset-password/${resetToken}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'AuthResetPassword456!' })
    });
    assert.equal(reset.status, 200, 'valid password reset token must update the password');
    const resetBody = await reset.json();
    const staleAfterReset = await fetch(`${base}/me`, {
      headers: { Authorization: `Bearer ${secondLoginBody.token}` }
    });
    assert.equal(staleAfterReset.status, 401, 'password reset must revoke pre-reset sessions');
    const activeAfterReset = await fetch(`${base}/me`, {
      headers: { Authorization: `Bearer ${resetBody.token}` }
    });
    assert.equal(activeAfterReset.status, 200, 'reset response token must be current');
    console.log('PASS password reset revokes old token and issues current token');
  } finally {
    if (user?._id) {
      await LoginActivity.deleteMany({ user: user._id });
      await User.deleteOne({ _id: user._id });
    }
    await mongoose.disconnect();
  }
});
