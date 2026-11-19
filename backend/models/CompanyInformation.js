const mongoose = require('mongoose');

const CompanyInformationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a company name'],
    trim: true,
  },
  legalName: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    default: 'Official Educational & Institute Management Organization',
  },
  address: {
    type: String,
  },
  addressDetails: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' }
  },
  phone: {
    type: String,
  },
  email: {
    type: String,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email'],
  },
  website: {
    type: String,
  },
  logo: {
    type: String, // URL to the primary logo image
  },
  superAdminSignature: {
    type: String, // URL/path to the super admin / CEO signature image
  },
  controllerSignature: {
    type: String, // URL/path to the examination controller signature image
  },
  companySeal: {
    type: String, // URL/path to the official company seal / stamp image
  },
  isoLogo: {
    type: String, // URL/path to ISO 9001:2015 certification logo
  },
  msmeLogo: {
    type: String, // URL/path to MSME registration logo
  },
  govtEmblem: {
    type: String, // URL/path to Government of India Emblem / MCA logo
  },
  skillIndiaLogo: {
    type: String, // URL/path to Skill India / NCVET logo
  },
  watermarkImage: {
    type: String, // URL/path to faint document watermark image
  },
  idCardHeaderBanner: {
    type: String, // URL/path to ID card top banner ribbon
  },
  cin: {
    type: String, // Corporate Identification Number (CIN)
  },
  isoNumber: {
    type: String, // ISO Certification number (e.g. ISO 9001:2015)
  },
  establishedYear: {
    type: String,
  },
  registrationNumber: {
    type: String,
  },
  gstNumber: {
    type: String,
  },
  panNumber: {
    type: String,
  },
  documents: [
    {
      name: String,
      url: String,
    },
  ],
  extraBadges: [
    {
      name: String,
      url: String,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('CompanyInformation', CompanyInformationSchema);
