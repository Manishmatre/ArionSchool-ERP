const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const SchoolBranding = require('../models/SchoolBranding');
const SchoolCampus = require('../models/SchoolCampus');

test('Tenant Branding Isolation: School A and School B maintain distinct visual identities', () => {
  const schoolAId = new mongoose.Types.ObjectId();
  const schoolBId = new mongoose.Types.ObjectId();

  // School A: St. Xavier's High School (Emerald Green)
  const brandingA = new SchoolBranding({
    franchise: schoolAId,
    identity: {
      schoolName: "St. Xavier's High School",
      shortName: 'SXHS',
      motto: 'Semper Sursum',
      affiliationBoard: 'ICSE',
      address: {
        street: 'Cantonment Road',
        city: 'Jabalpur',
        state: 'Madhya Pradesh',
        pincode: '482001'
      }
    },
    visual: {
      logoUrl: '/uploads/st-xaviers-logo.png',
      primaryColor: '#064e3b',
      secondaryColor: '#059669',
      accentColor: '#34d399'
    },
    login: {
      welcomeTitle: "Welcome to St. Xavier's High School",
      showPlatformAttribution: true
    },
    whiteLabel: {
      enabled: false,
      subdomain: 'stxaviers'
    }
  });

  // School B: Delhi Public School (Royal Navy)
  const brandingB = new SchoolBranding({
    franchise: schoolBId,
    identity: {
      schoolName: 'Delhi Public School',
      shortName: 'DPS',
      motto: 'Service Before Self',
      affiliationBoard: 'CBSE',
      address: {
        street: 'Nagpur Road',
        city: 'Jabalpur',
        state: 'Madhya Pradesh',
        pincode: '482003'
      }
    },
    visual: {
      logoUrl: '/uploads/dps-logo.png',
      primaryColor: '#0f172a',
      secondaryColor: '#2563eb',
      accentColor: '#0ea5e9'
    },
    login: {
      welcomeTitle: 'Welcome to Delhi Public School',
      showPlatformAttribution: false // Mode 2: Complete White-label
    },
    whiteLabel: {
      enabled: true,
      subdomain: 'dps-jbp',
      customDomain: 'portal.dpsjabalpur.edu.in'
    }
  });

  // Verify School A
  const errA = brandingA.validateSync();
  assert.equal(errA, undefined, 'School A branding must validate cleanly');
  assert.equal(brandingA.identity.schoolName, "St. Xavier's High School");
  assert.equal(brandingA.visual.primaryColor, '#064e3b');
  assert.equal(brandingA.login.showPlatformAttribution, true);

  // Verify School B
  const errB = brandingB.validateSync();
  assert.equal(errB, undefined, 'School B branding must validate cleanly');
  assert.equal(brandingB.identity.schoolName, 'Delhi Public School');
  assert.equal(brandingB.visual.primaryColor, '#0f172a');
  assert.equal(brandingB.login.showPlatformAttribution, false);

  // Verify Strict Separation
  assert.notEqual(brandingA.franchise.toString(), brandingB.franchise.toString());
  assert.notEqual(brandingA.visual.primaryColor, brandingB.visual.primaryColor);
  assert.notEqual(brandingA.identity.affiliationBoard, brandingB.identity.affiliationBoard);
  assert.notEqual(brandingA.whiteLabel.subdomain, brandingB.whiteLabel.subdomain);
});
