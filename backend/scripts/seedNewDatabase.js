const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');
const SchoolCampus = require('../models/SchoolCampus');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const SchoolSubscription = require('../models/SchoolSubscription');
const SchoolBranding = require('../models/SchoolBranding');
const AcademicSession = require('../models/AcademicSession');
const SchoolClass = require('../models/SchoolClass');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const PlatformLead = require('../models/PlatformLead');
const PlatformConfig = require('../models/PlatformConfig');
const Notification = require('../models/Notification');
const CompanyInformation = require('../models/CompanyInformation');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in backend/.env');
  process.exit(1);
}

async function upsertUser(filter, data) {
  let user = await User.findOne(filter);
  if (!user) {
    user = await User.create(data);
    console.log(`  ✅ Created user: ${user.email} (${user.role})`);
  } else {
    console.log(`  ℹ️  Existing user: ${user.email} (${user.role})`);
  }
  return user;
}

async function seed() {
  try {
    console.log('🔌 Connecting to new MongoDB database...');
    await mongoose.connect(MONGODB_URI);
    console.log(`✅ Connected to MongoDB: ${mongoose.connection.host} / ${mongoose.connection.name}\n`);

    // 1. PLATFORM SUPER ADMIN & SCHOOL OWNER (MULTI-CAMPUS SUPER ADMIN)
    console.log('1️⃣  Seeding Platform Super Admin & School Owner Accounts...');
    const superAdmin = await upsertUser(
      { email: 'superadmin@arionschool.com' },
      {
        name: 'ArionexTech Super Admin',
        email: 'superadmin@arionschool.com',
        mobile: '9876543210',
        password: 'ArionAdmin@2026',
        role: 'super_admin',
        isActive: true
      }
    );

    await upsertUser(
      { email: 'owner@protonschool.edu.in' },
      {
        name: 'Dr. Vikramaditya Sharma (Chairman / Owner)',
        email: 'owner@protonschool.edu.in',
        mobile: '9826100100',
        password: 'Owner@2026',
        role: 'school_owner',
        isActive: true
      }
    );

    // 2. GLOBAL PLATFORM CONFIG
    console.log('\n2️⃣  Seeding Global Platform Configuration...');
    await PlatformConfig.findOneAndUpdate(
      { singletonKey: 'GLOBAL_PLATFORM_CONFIG' },
      {
        singletonKey: 'GLOBAL_PLATFORM_CONFIG',
        companyName: 'STARTOLOGY EDUCARE SERVICES PRIVATE LIMITED',
        productName: 'Arion School',
        primaryDomain: 'seseducare.com',
        appDomain: 'myapp.seseducare.com',
        adminConsoleDomain: 'admin.seseducare.com',
        supportEmail: 'seseducare@gmail.com',
        supportPhone: '+91 761 400 2026',
        defaultTrialDays: 14,
        allowSelfRegistration: true
      },
      { upsert: true, new: true }
    );

    // Company Information (for receipts / certificates fallback)
    const companyCount = await CompanyInformation.countDocuments();
    if (companyCount === 0) {
      await CompanyInformation.create({
        companyName: 'STARTOLOGY EDUCARE SERVICES PRIVATE LIMITED',
        email: 'seseducare@gmail.com',
        phone: '+91 91651 79272',
        address: 'Rajim, Gariyaband, Chhattisgarh, India',
        website: 'https://seseducare.com'
      }).catch(() => {});
    }

    // 3. SAAS SUBSCRIPTION PLANS
    console.log('\n3️⃣  Seeding SaaS Subscription Plans...');
    const plansData = [
      {
        name: 'Starter School',
        code: 'PLAN_STARTER',
        description: 'Essential School Management ERP for primary & standalone schools up to 400 students.',
        billingCycle: 'annual',
        price: 28800,
        currency: 'INR',
        maxStudents: 400,
        maxCampuses: 1,
        maxStaff: 40,
        storageLimitGb: 15,
        features: [
          'Student Admissions & Directory',
          'Fee Counter & Manual Receipts',
          'Daily Attendance & Report Cards',
          'Dedicated School Subdomain'
        ],
        trialDays: 14,
        isPopular: true,
        isActive: true
      },
      {
        name: 'Growth Campus',
        code: 'PLAN_GROWTH',
        description: 'Complete digital school suite with AI Copilot, Razorpay online payments, and parent mobile portal.',
        billingCycle: 'annual',
        price: 96000,
        currency: 'INR',
        maxStudents: 1500,
        maxCampuses: 2,
        maxStaff: 150,
        storageLimitGb: 100,
        features: [
          'Everything in Starter',
          'Razorpay Online Fee Desk & Auto-Reconciliation',
          'Teacher AI Copilot & Smart Assessments',
          'RFID Gate Attendance & Parent WhatsApp Bot',
          'Library, Transport & Staff Payroll'
        ],
        trialDays: 14,
        isPopular: false,
        isActive: true
      },
      {
        name: 'Enterprise Multi-Campus Trust',
        code: 'PLAN_ENTERPRISE',
        description: 'Unlimited multi-branch licensing for educational societies and school trusts with dedicated SLA.',
        billingCycle: 'annual',
        price: 240000,
        currency: 'INR',
        maxStudents: 0,
        maxCampuses: 25,
        maxStaff: 1000,
        storageLimitGb: 500,
        features: [
          'Unlimited Students & Multi-Campus Trust HQ',
          'Custom White-Label Domains & Mobile Apps',
          'Cross-Campus Transfers & Consolidated Accounting',
          'Dedicated Account Manager & API Webhooks'
        ],
        trialDays: 30,
        isPopular: false,
        isActive: true
      }
    ];

    const plans = {};
    for (const p of plansData) {
      let plan = await SubscriptionPlan.findOne({ code: p.code });
      if (!plan) {
        plan = await SubscriptionPlan.create(p);
        console.log(`  ✅ Created plan: ${plan.name}`);
      } else {
        console.log(`  ℹ️  Existing plan: ${plan.name}`);
      }
      plans[p.code] = plan;
    }

    // 4. SCHOOL CAMPUSES (MULTI-TENANT SCHOOLS)
    console.log('\n4️⃣  Seeding Demo Multi-Tenant Schools...');
    const schoolsSeed = [
      {
        name: 'Proton Public School',
        code: 'PPS-JBP',
        subdomain: 'proton',
        customDomain: 'portal.protonschool.edu.in',
        domainVerified: true,
        board: 'CBSE',
        affiliationNumber: '1030492',
        status: 'active',
        isMainBranch: true,
        planCode: 'PLAN_STARTER',
        subStatus: 'active',
        invoiceAmount: 12000,
        owner: { name: 'Dr. Arvind Mishra', email: 'principal@protonschool.edu.in', mobile: '9826100101', qualification: 'Ph.D. Education' },
        address: { street: '42 Civil Lines, Napier Town', city: 'Jabalpur', state: 'Madhya Pradesh', pincode: '482001', country: 'India' }
      },
      {
        name: "St. Xavier's International Academy",
        code: 'SXA-DEL',
        subdomain: 'stxaviers',
        customDomain: 'erp.stxaviersdelhi.org',
        domainVerified: true,
        board: 'ICSE',
        affiliationNumber: 'DL-20419',
        status: 'active',
        isMainBranch: false,
        planCode: 'PLAN_GROWTH',
        subStatus: 'active',
        invoiceAmount: 96000,
        owner: { name: 'Sr. Catherine Dsouza', email: 'principal@stxaviers.edu.in', mobile: '9811200202', qualification: 'M.Ed, M.A.' },
        address: { street: '18 Vasant Kunj Institutional Area', city: 'New Delhi', state: 'Delhi', pincode: '110070', country: 'India' }
      },
      {
        name: 'Green Valley Modern High School',
        code: 'GVM-BPL',
        subdomain: 'greenvalley',
        customDomain: '',
        domainVerified: false,
        board: 'CBSE',
        affiliationNumber: '1031188',
        status: 'active',
        isMainBranch: false,
        planCode: 'PLAN_STARTER',
        subStatus: 'trial',
        invoiceAmount: 0,
        owner: { name: 'Mr. Vikramaditya Rao', email: 'principal@greenvalley.edu.in', mobile: '9827300303', qualification: 'M.Sc, B.Ed' },
        address: { street: 'Plot 9, Arera Colony', city: 'Bhopal', state: 'Madhya Pradesh', pincode: '462016', country: 'India' }
      }
    ];

    const createdSchools = {};
    for (const s of schoolsSeed) {
      let campus = await SchoolCampus.findOne({ code: s.code });
      const plan = plans[s.planCode];

      if (!campus) {
        campus = await SchoolCampus.create({
          name: s.name,
          code: s.code,
          subdomain: s.subdomain,
          customDomain: s.customDomain,
          domainVerified: s.domainVerified,
          board: s.board,
          affiliationNumber: s.affiliationNumber,
          owner: s.owner,
          address: s.address,
          contactInfo: { phone: s.owner.mobile, email: s.owner.email },
          status: s.status,
          isMainBranch: s.isMainBranch,
          plan: plan._id,
          planExpiresAt: new Date(Date.now() + 365 * 86400000)
        });
        console.log(`  ✅ Created school: ${campus.name} (${campus.subdomain}.arionschool.com)`);
      } else {
        console.log(`  ℹ️  Existing school: ${campus.name}`);
      }

      // Principal / School Admin Login
      const adminUser = await upsertUser(
        { email: s.owner.email },
        {
          name: s.owner.name,
          email: s.owner.email,
          mobile: s.owner.mobile,
          password: 'School@2026',
          role: 'school_admin',
          franchise: campus._id,
          isActive: true
        }
      );

      if (!campus.admin) {
        campus.admin = adminUser._id;
        await campus.save();
      }

      // Subscription + Initial Paid Invoice
      let sub = await SchoolSubscription.findOne({ school: campus._id });
      if (!sub) {
        const now = new Date();
        const invoices = s.invoiceAmount > 0 ? [{
          invoiceNumber: `INV-ARION-2026-${s.code.replace(/[^A-Z0-9]/g, '')}`,
          amount: s.invoiceAmount,
          currency: 'INR',
          billingPeriodStart: now,
          billingPeriodEnd: new Date(now.getTime() + 365 * 86400000),
          paidAt: now,
          paymentMethod: 'razorpay',
          paymentReference: `pay_live_${s.subdomain}2026`,
          status: 'paid'
        }] : [];

        sub = await SchoolSubscription.create({
          school: campus._id,
          plan: plan._id,
          status: s.subStatus,
          trialStartsAt: now,
          trialEndsAt: new Date(now.getTime() + 14 * 86400000),
          currentPeriodStart: now,
          currentPeriodEnd: new Date(now.getTime() + 365 * 86400000),
          lastPaymentAt: s.invoiceAmount > 0 ? now : undefined,
          invoices
        });
      }

      // Branding
      const existingBrand = await SchoolBranding.findOne({ franchise: campus._id }).catch(() => null);
      if (!existingBrand) {
        await SchoolBranding.create({
          franchise: campus._id,
          identity: {
            schoolName: campus.name,
            shortName: campus.code,
            tagline: `${s.board} Affiliated K-12 Institution`,
            boardAffiliation: s.board,
            affiliationNumber: s.affiliationNumber
          },
          contact: {
            email: s.owner.email,
            phone: s.owner.mobile,
            address: `${s.address.street}, ${s.address.city}, ${s.address.state}`
          }
        }).catch(() => {});
      }

      // Academic Session
      let session = await AcademicSession.findOne({ franchise: campus._id, sessionName: '2026-2027' });
      if (!session) {
        session = await AcademicSession.create({
          sessionName: '2026-2027',
          startDate: new Date('2026-04-01'),
          endDate: new Date('2027-03-31'),
          isCurrent: true,
          franchise: campus._id,
          status: 'active',
          description: 'Academic Session 2026-2027'
        });
        campus.academicSession = session._id;
        await campus.save();
      }

      createdSchools[s.code] = { campus, session };
    }

    // 5. SEED ACADEMIC DATA, ROLE USERS & STUDENTS FOR PROTON PUBLIC SCHOOL
    console.log('\n5️⃣  Seeding Academic Structure & Role Accounts for Proton Public School...');
    const proton = createdSchools['PPS-JBP'].campus;
    const protonSession = createdSchools['PPS-JBP'].session;

    // Teacher, Accountant, Parent users
    const teacherUser = await upsertUser(
      { email: 'teacher@protonschool.edu.in' },
      {
        name: 'Mrs. Sunita Verma',
        email: 'teacher@protonschool.edu.in',
        mobile: '9826100102',
        password: 'Teacher@2026',
        role: 'teacher',
        franchise: proton._id,
        isActive: true
      }
    );

    await upsertUser(
      { email: 'accountant@protonschool.edu.in' },
      {
        name: 'Mr. Ramesh Kulkarni',
        email: 'accountant@protonschool.edu.in',
        mobile: '9826100103',
        password: 'Account@2026',
        role: 'accountant',
        franchise: proton._id,
        isActive: true
      }
    );

    const parentUser = await upsertUser(
      { email: 'parent@protonschool.edu.in' },
      {
        name: 'Mr. Rajesh Sharma',
        email: 'parent@protonschool.edu.in',
        mobile: '9826100104',
        password: 'Parent@2026',
        role: 'parent',
        franchise: proton._id,
        isActive: true
      }
    );

    // Classes & Sections
    const classNames = ['Class 8', 'Class 9', 'Class 10'];
    const classesMap = {};
    const sectionsMap = {};

    for (let i = 0; i < classNames.length; i++) {
      const cName = classNames[i];
      const cCode = `CLS-${8 + i}`;
      let cls = await SchoolClass.findOne({ franchise: proton._id, name: cName });
      if (!cls) {
        cls = await SchoolClass.create({
          name: cName,
          code: cCode,
          order: 8 + i,
          franchise: proton._id,
          academicSession: protonSession._id
        });
      }
      classesMap[cName] = cls;

      for (const secName of ['A', 'B']) {
        let sec = await Section.findOne({ schoolClass: cls._id, name: secName });
        if (!sec) {
          sec = await Section.create({
            name: secName,
            schoolClass: cls._id,
            franchise: proton._id,
            capacity: 40,
            roomNumber: `R-${8 + i}0${secName === 'A' ? 1 : 2}`
          });
        }
        sectionsMap[`${cName}-${secName}`] = sec;
      }
    }

    // Core Subjects
    const subjectsSeed = [
      { name: 'Mathematics', code: 'MATH-101', subjectType: 'theory' },
      { name: 'Science (Physics, Chem, Bio)', code: 'SCI-102', subjectType: 'both' },
      { name: 'English Language & Literature', code: 'ENG-103', subjectType: 'language' },
      { name: 'Social Science', code: 'SST-104', subjectType: 'theory' },
      { name: 'Computer Science & AI', code: 'CS-105', subjectType: 'both' }
    ];
    for (const subj of subjectsSeed) {
      const exists = await Subject.findOne({ franchise: proton._id, code: subj.code });
      if (!exists) {
        await Subject.create({
          ...subj,
          schoolClasses: Object.values(classesMap).map((c) => c._id),
          franchise: proton._id
        });
      }
    }

    // Seed 5 Students for Proton Public School
    const studentsSeed = [
      { firstName: 'Aarav', lastName: 'Sharma', email: 'student@protonschool.edu.in', mobile: '9826100105', adm: 'ADM-2026-001', cls: 'Class 10', sec: 'A', roll: '1001', father: 'Rajesh Sharma', mother: 'Anita Sharma', gender: 'Male', linkParent: true },
      { firstName: 'Priya', lastName: 'Patel', email: 'priya.patel@protonschool.edu.in', mobile: '9826100106', adm: 'ADM-2026-002', cls: 'Class 10', sec: 'A', roll: '1002', father: 'Suresh Patel', mother: 'Meena Patel', gender: 'Female' },
      { firstName: 'Rohan', lastName: 'Mehra', email: 'rohan.mehra@protonschool.edu.in', mobile: '9826100107', adm: 'ADM-2026-003', cls: 'Class 9', sec: 'A', roll: '0901', father: 'Deepak Mehra', mother: 'Kavita Mehra', gender: 'Male' },
      { firstName: 'Ananya', lastName: 'Verma', email: 'ananya.verma@protonschool.edu.in', mobile: '9826100108', adm: 'ADM-2026-004', cls: 'Class 9', sec: 'B', roll: '0915', father: 'Manoj Verma', mother: 'Pooja Verma', gender: 'Female' },
      { firstName: 'Kabir', lastName: 'Singh', email: 'kabir.singh@protonschool.edu.in', mobile: '9826100109', adm: 'ADM-2026-005', cls: 'Class 8', sec: 'A', roll: '0801', father: 'Harpreet Singh', mother: 'Simran Kaur', gender: 'Male' }
    ];

    for (const st of studentsSeed) {
      const stuUser = await upsertUser(
        { email: st.email },
        {
          name: `${st.firstName} ${st.lastName}`,
          email: st.email,
          mobile: st.mobile,
          password: 'Student@2026',
          role: 'student',
          franchise: proton._id,
          isActive: true
        }
      );

      let stuDoc = await Student.findOne({ enrollmentNumber: st.adm });
      if (!stuDoc) {
        stuDoc = await Student.create({
          user: stuUser._id,
          studentId: st.adm,
          enrollmentNumber: st.adm,
          admissionNumber: st.adm,
          session: '2026-2027',
          schoolClass: classesMap[st.cls]._id,
          section: sectionsMap[`${st.cls}-${st.sec}`]._id,
          academicSession: protonSession._id,
          parent: st.linkParent ? parentUser._id : undefined,
          rollNumber: st.roll,
          status: 'active',
          franchise: proton._id,
          personalInfo: {
            firstName: st.firstName,
            lastName: st.lastName,
            fatherName: st.father,
            motherName: st.mother,
            gender: st.gender
          },
          contactInfo: {
            email: st.email,
            mobile: st.mobile,
            address: {
              street: 'Civil Lines',
              city: 'Jabalpur',
              state: 'Madhya Pradesh',
              pincode: '482001',
              country: 'India'
            }
          }
        });
        console.log(`  ✅ Created student: ${st.firstName} ${st.lastName} (${st.cls}-${st.sec})`);
      }

      if (st.linkParent && !parentUser.linkedStudents.includes(stuDoc._id)) {
        parentUser.linkedStudents.push(stuDoc._id);
        await parentUser.save();
      }
    }

    // 6. Seed school onboarding leads for the platform CRM.
    console.log('\n6️⃣  Seeding School Onboarding Leads for the Platform CRM...');
    const leadsSeed = [
      {
        schoolName: 'Delhi Heritage Public School',
        contactName: 'Dr. Sanjay Tiwari',
        designation: 'Director',
        email: 'director@delhiheritage.edu.in',
        phone: '9810554433',
        city: 'Noida',
        state: 'Uttar Pradesh',
        studentCount: '1000-2500',
        board: 'CBSE',
        requestedSubdomain: 'delhiheritage',
        offerCode: 'SCHOOL_DEMO',
        source: 'landing_page',
        status: 'new',
        notes: 'Requested a product demo and RFID attendance overview for 1,400 students.'
      },
      {
        schoolName: 'Sunrise Convent Senior Secondary',
        contactName: 'Mrs. Meenakshi Joshi',
        designation: 'Principal',
        email: 'principal@sunriseconvent.org',
        phone: '9826445566',
        city: 'Indore',
        state: 'Madhya Pradesh',
        studentCount: '500-1000',
        board: 'CBSE',
        requestedSubdomain: 'sunriseindore',
        offerCode: 'SCHOOL_DEMO',
        source: 'landing_page',
        status: 'demo_scheduled',
        notes: 'Demo scheduled for Friday 11:00 AM. Needs Excel migration from legacy fee software.'
      },
      {
        schoolName: 'Mount Litera Vision Academy',
        contactName: 'Mr. Prakash Deshmukh',
        designation: 'Trustee',
        email: 'trustee@mlvision.edu.in',
        phone: '9823778899',
        city: 'Nagpur',
        state: 'Maharashtra',
        studentCount: '2500+',
        board: 'ICSE',
        requestedSubdomain: 'mlvision',
        offerCode: 'ENTERPRISE_TRUST',
        source: 'referral',
        status: 'proposal_sent',
        notes: 'Multi-campus trust with 3 branches in Nagpur region.'
      }
    ];

    for (const l of leadsSeed) {
      const exists = await PlatformLead.findOne({ email: l.email });
      if (!exists) {
        await PlatformLead.create(l);
        console.log(`  ✅ Created lead: ${l.schoolName}`);
      }
    }

    // 7. INITIAL PLATFORM BROADCAST
    const broadcastExists = await Notification.findOne({ isPlatformGlobal: true });
    if (!broadcastExists) {
      await Notification.create({
        title: 'Welcome to Arion School ERP',
        message: 'Multi-tenant cloud infrastructure, Razorpay Fee Desk, CBSE CCE Report Cards, and Teacher AI Copilot are now live across all campuses.',
        type: 'announcement',
        recipients: 'all',
        isPlatformGlobal: true,
        priority: 'high',
        status: 'sent',
        sentAt: new Date(),
        createdBy: superAdmin._id
      });
    }

    console.log('\n=============================================================');
    console.log('🎉 NEW MONGODB DATABASE SEEDED SUCCESSFULLY!');
    console.log('=============================================================');
    console.log('🔐 COMPANY PLATFORM SUPER ADMIN (use in platform-admin/):');
    console.log('   Email:    superadmin@arionschool.com');
    console.log('   Password: ArionAdmin@2026');
    console.log('');
    console.log('🏫 DEMO SCHOOL PORTAL ACCOUNTS (Proton Public School):');
    console.log('   Principal:  principal@protonschool.edu.in  / School@2026');
    console.log('   Teacher:    teacher@protonschool.edu.in    / Teacher@2026');
    console.log('   Accountant: accountant@protonschool.edu.in / Account@2026');
    console.log('   Parent:     parent@protonschool.edu.in     / Parent@2026');
    console.log('   Student:    student@protonschool.edu.in    / Student@2026');
    console.log('=============================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
}

seed();

