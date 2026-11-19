/**
 * SES Educare - Centralized School ERP Branding
 * Organization: STARTOLOGY EDUCARE SERVICES PRIVATE LIMITED
 * Product: SES Educare School Management ERP
 */

export const SES_DEFAULT_BRANDING = {
  identity: {
    schoolName: 'SES Educare',
    shortName: 'SES',
    motto: 'One Platform. Complete School Management.',
    description: 'School management platform for students, families, staff and school leaders.',
    affiliationBoard: 'CBSE',
    registrationNumber: '',
    address: {
      street: 'Gariyaband Road, Rajim',
      city: 'Rajim',
      state: 'Chhattisgarh',
      pincode: '493885',
      country: 'India'
    },
    contact: {
      phone: '+91 91651 79272',
      email: 'seseducare@gmail.com',
      websiteUrl: 'https://seseducare.com'
    }
  },
  visual: {
    logoUrl: '',
    secondaryLogoUrl: '',
    loginLogoUrl: '',
    faviconUrl: '/favicon.ico',
    primaryColor: '#0f172a',    // Deep Navy Blue
    secondaryColor: '#2563eb',  // Royal Blue
    accentColor: '#0ea5e9',     // Cyan / Sky Blue
    backgroundColor: '#f8fafc', // Clean White / Light Grey
    headerColor: '#0f172a',
    sidebarColor: '#0f172a',
    themeMode: 'brand-chrome'
  },
  login: {
    welcomeTitle: 'Welcome to SES Educare',
    welcomeSubtitle: 'Unified School Management ERP Platform',
    bannerImageUrl: '',
    bgImageUrl: '',
    showPlatformAttribution: true
  },
  whiteLabel: {
    enabled: false,
    customDomain: '',
    subdomain: '',
    status: 'active'
  },
  attribution: {
    productName: 'SES Educare',
    developerCompany: 'STARTOLOGY EDUCARE SERVICES PRIVATE LIMITED',
    poweredByText: 'Powered by SES Educare',
    copyright: `© ${new Date().getFullYear()} SES Educare. All rights reserved.`
  }
};

export default SES_DEFAULT_BRANDING;
