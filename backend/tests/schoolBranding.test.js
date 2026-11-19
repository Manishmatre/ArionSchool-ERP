const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const SchoolBranding = require('../models/SchoolBranding');

test('SchoolBranding model defaults to Arion School official identity', () => {
  const branding = new SchoolBranding();

  assert.equal(branding.identity.schoolName, 'Arion School');
  assert.equal(branding.identity.shortName, 'Arion');
  assert.equal(branding.identity.motto, 'One Platform. Complete School Management.');
  assert.equal(branding.visual.primaryColor, '#0f172a');
  assert.equal(branding.visual.secondaryColor, '#2563eb');
  assert.equal(branding.visual.accentColor, '#0ea5e9');
  assert.equal(branding.login.showPlatformAttribution, true);
  assert.equal(branding.whiteLabel.enabled, false);
});

test('SchoolBranding supports custom white-label tenant identity and colors', () => {
  const campusId = new mongoose.Types.ObjectId();
  const branding = new SchoolBranding({
    franchise: campusId,
    identity: {
      schoolName: 'Delhi Public School',
      shortName: 'DPS',
      motto: 'Service Before Self',
      affiliationBoard: 'CBSE',
      address: {
        street: 'Sector 4',
        city: 'Jabalpur',
        state: 'Madhya Pradesh',
        pincode: '482001'
      }
    },
    visual: {
      logoUrl: '/uploads/dps-logo.png',
      primaryColor: '#004d40',
      secondaryColor: '#00796b',
      accentColor: '#4db6ac'
    },
    whiteLabel: {
      enabled: true,
      subdomain: 'dps-jabalpur',
      customDomain: 'portal.dpsjabalpur.edu.in'
    },
    login: {
      welcomeTitle: 'Welcome to Delhi Public School',
      showPlatformAttribution: false
    }
  });

  const err = branding.validateSync();
  assert.equal(err, undefined, 'Custom white-label branding must pass validation');
  assert.equal(branding.identity.schoolName, 'Delhi Public School');
  assert.equal(branding.visual.primaryColor, '#004d40');
  assert.equal(branding.whiteLabel.subdomain, 'dps-jabalpur');
  assert.equal(branding.login.showPlatformAttribution, false);
});
