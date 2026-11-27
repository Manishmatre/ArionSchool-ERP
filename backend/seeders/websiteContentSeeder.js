const mongoose = require('mongoose');
const dotenv = require('dotenv');
const WebsiteContent = require('../models/WebsiteContent');
const WebsiteSettings = require('../models/WebsiteSettings');

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Homepage Content
const homePageContent = [
  // Hero Section
  {
    page: 'home',
    section: 'hero',
    contentType: 'json',
    order: 1,
    isActive: true,
    title: 'Hero Section',
    content: {
      badge: "India's Trusted Education Network",
      heading: "Empowering Careers and Entrepreneurs",
      subheading: "Join our growing network of 15,000+ students. Learn industry-relevant skills, get certified, and transform your career with Arion School.",
      backgroundImage: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1920&q=80",
      buttons: [
        {
          text: "Explore Courses",
          link: "/courses",
          type: "primary"
        },
        {
          text: "Become a Franchise",
          link: "/franchise-opportunity",
          type: "secondary"
        }
      ],
      quickStats: [
        { icon: "check-circle", text: "ISO Certified" },
        { icon: "check-circle", text: "Govt. Recognized" },
        { icon: "check-circle", text: "100% Job Support" }
      ]
    }
  },
  
  // Hero Stats Cards
  {
    page: 'home',
    section: 'hero-stats',
    contentType: 'list',
    order: 2,
    isActive: true,
    title: 'Hero Statistics',
    content: [
      { value: "15K+", label: "Students Enrolled" },
      { value: "100+", label: "Training Centers" },
      { value: "95%", label: "Success Rate" },
      { value: "10+", label: "Years Experience" }
    ]
  },
  
  // Popular Courses Section
  {
    page: 'home',
    section: 'popular-courses',
    contentType: 'json',
    order: 3,
    isActive: true,
    title: 'Popular Courses Section',
    content: {
      heading: "Start Your Learning Journey Today",
      subheading: "Choose from our industry-recognized courses and transform your career with practical, job-oriented training",
      categories: [
        {
          title: "Accounting & Tally",
          description: "Master Tally ERP, GST, and accounting fundamentals for finance careers",
          icon: "book-open",
          color: "blue",
          courses: [
            "Tally Prime with GST",
            "Accounting Fundamentals",
            "Financial Management"
          ],
          link: "/courses"
        },
        {
          title: "Computer Basics",
          description: "Essential computer skills for beginners and office professionals",
          icon: "monitor",
          color: "green",
          courses: [
            "MS Office Suite",
            "Internet & Email",
            "Typing & Data Entry"
          ],
          link: "/courses"
        },
        {
          title: "Digital Marketing",
          description: "Learn SEO, social media marketing, and online advertising strategies",
          icon: "trending-up",
          color: "purple",
          courses: [
            "SEO & SEM",
            "Social Media Marketing",
            "Content Marketing"
          ],
          link: "/courses"
        }
      ]
    }
  },
  
  // Statistics Section
  {
    page: 'home',
    section: 'statistics',
    contentType: 'list',
    order: 4,
    isActive: true,
    title: 'Statistics',
    content: [
      { icon: "store", value: 100, suffix: "+", label: "Centers Across India" },
      { icon: "users", value: 1500, suffix: "+", label: "Students Enrolled" },
      { icon: "award", value: 10, suffix: "+", label: "Years of Excellence" },
      { icon: "trending-up", value: 95, suffix: "%", label: "Success Rate" }
    ]
  },
  
  // Features Section
  {
    page: 'home',
    section: 'features',
    contentType: 'list',
    order: 5,
    isActive: true,
    title: 'Features',
    content: [
      {
        icon: "award",
        title: "ISO Certified Courses",
        description: "Industry-recognized certifications that boost your career prospects"
      },
      {
        icon: "shield",
        title: "Government-Recognized",
        description: "Certificates approved by government authorities"
      },
      {
        icon: "headphones",
        title: "24×7 Student Support",
        description: "Round-the-clock assistance for all your queries"
      },
      {
        icon: "store",
        title: "Franchise Network",
        description: "Growing network of successful franchise partners across India"
      }
    ]
  },
  
  // Testimonials Section
  {
    page: 'home',
    section: 'testimonials',
    contentType: 'list',
    order: 6,
    isActive: true,
    title: 'Testimonials',
    content: [
      {
        name: "Priya Sharma",
        role: "Student - Tally Course",
        image: "👩‍🎓",
        text: "Arion School helped me land my dream job as an accountant. The practical training was excellent!",
        rating: 5
      },
      {
        name: "Rajesh Kumar",
        role: "Franchise Owner - Mumbai",
        image: "👨‍💼",
        text: "Starting a franchise with Arion School was the best business decision. Great ROI and support!",
        rating: 5
      },
      {
        name: "Anita Desai",
        role: "Student - Digital Marketing",
        image: "👩‍💻",
        text: "The course content is up-to-date and the instructors are highly knowledgeable. Highly recommended!",
        rating: 5
      }
    ]
  }
];

// About Page Content
const aboutPageContent = [
  {
    page: 'about',
    section: 'hero',
    contentType: 'json',
    order: 1,
    isActive: true,
    title: 'About Hero Section',
    content: {
      heading: "About Arion School",
      tagline: "Empowering Education, Enriching Lives"
    }
  },
  {
    page: 'about',
    section: 'story',
    contentType: 'html',
    order: 2,
    isActive: true,
    title: 'Our Story',
    content: `
      <p>Arion School was founded with a vision to make quality education accessible to everyone. Since our inception, we have been committed to providing industry-relevant training that empowers students to achieve their career goals.</p>
      <p>Over the years, we have grown from a single training center to a network of 100+ centers across India, serving thousands of students annually. Our success is built on our dedication to excellence, practical training methodology, and student-centric approach.</p>
      <p>We offer a wide range of courses in computer education, accounting, digital marketing, and professional skills. Our curriculum is designed by industry experts and updated regularly to match current market demands.</p>
      <p>Today, Arion School stands as one of India's most trusted education networks, with a proven track record of student success and franchise partner satisfaction.</p>
    `
  },
  {
    page: 'about',
    section: 'vision-mission',
    contentType: 'json',
    order: 3,
    isActive: true,
    title: 'Vision & Mission',
    content: {
      vision: {
        title: "Our Vision",
        description: "To be India's most trusted and innovative education network, empowering millions of students and creating successful entrepreneurs through quality education and franchise opportunities."
      },
      mission: {
        title: "Our Mission",
        description: "To provide accessible, affordable, and industry-relevant education that transforms lives. We are committed to maintaining the highest standards of teaching, offering comprehensive support to our students and franchise partners, and continuously innovating our curriculum to meet evolving market needs."
      }
    }
  },
  {
    page: 'about',
    section: 'values',
    contentType: 'list',
    order: 4,
    isActive: true,
    title: 'Core Values',
    content: [
      {
        icon: "target",
        title: "Excellence",
        description: "We strive for excellence in everything we do, from course content to student support"
      },
      {
        icon: "users",
        title: "Student-Centric",
        description: "Our students' success is our success. We put their needs at the center of all our decisions"
      },
      {
        icon: "heart",
        title: "Integrity",
        description: "We maintain the highest standards of honesty, transparency, and ethical conduct"
      }
    ]
  },
  {
    page: 'about',
    section: 'achievements',
    contentType: 'list',
    order: 5,
    isActive: true,
    title: 'Achievements',
    content: [
      { icon: "award", value: "100+", label: "Training Centers" },
      { icon: "users", value: "15000+", label: "Students Trained" },
      { icon: "trending-up", value: "10+", label: "Years of Excellence" }
    ]
  }
];

// Website Settings
const websiteSettings = {
  siteName: "The Vits School",
  siteTagline: "CBSE Affiliated Senior Secondary School • Jabalpur, Madhya Pradesh",
  contact: {
    email: "info@thevitsschool.edu.in",
    phone: "+91 761 000 0000",
    whatsapp: "+91 761 000 0001",
    address: "Campus Road, Civil Lines",
    city: "Jabalpur",
    state: "Madhya Pradesh",
    pincode: "482001",
    country: "India"
  },
  socialMedia: {
    facebook: "https://facebook.com/thevitsschool",
    instagram: "https://instagram.com/thevitsschool",
    twitter: "https://twitter.com/thevitsschool",
    linkedin: "https://linkedin.com/company/thevitsschool",
    youtube: "https://youtube.com/@thevitsschool"
  },
  businessHours: {
    monday: { open: "08:00", close: "15:30", closed: false },
    tuesday: { open: "08:00", close: "15:30", closed: false },
    wednesday: { open: "08:00", close: "15:30", closed: false },
    thursday: { open: "08:00", close: "15:30", closed: false },
    friday: { open: "08:00", close: "15:30", closed: false },
    saturday: { open: "08:00", close: "13:00", closed: false },
    sunday: { open: "", close: "", closed: true }
  },
  seo: {
    defaultTitle: "The Vits School - Premier CBSE School in Jabalpur, MP",
    defaultDescription: "The Vits School, Jabalpur (M.P.) provides holistic K-12 education with modern sports, smart classrooms, science labs, and CBSE curriculum.",
    defaultKeywords: ["The Vits School", "Jabalpur School", "CBSE School Jabalpur", "K12 education", "ArionexTech ERP"]
  },
  email: {
    supportEmail: "support@thevitsschool.edu.in",
    infoEmail: "info@thevitsschool.edu.in",
    admissionsEmail: "admissions@thevitsschool.edu.in",
    campusEmail: "campus@thevitsschool.edu.in"
  },
  features: {
    enableBlog: false,
    enableGallery: true,
    enableTestimonials: true,
    enableCampuses: true,
    enableMockTest: true,
    enableCertificates: true
  },
  theme: {
    primaryColor: "#3B82F6",
    secondaryColor: "#10B981",
    accentColor: "#F59E0B",
    fontFamily: "Inter"
  },
  maintenance: {
    enabled: false,
    message: "We are currently under maintenance. Please check back soon!",
    allowedIPs: []
  }
};

// Seed function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Clear existing data
    console.log('🗑️  Clearing existing content...');
    await WebsiteContent.deleteMany({});
    await WebsiteSettings.deleteMany({});
    console.log('✅ Existing content cleared\n');

    // Seed homepage content
    console.log('📄 Seeding homepage content...');
    await WebsiteContent.insertMany(homePageContent);
    console.log(`✅ ${homePageContent.length} homepage sections created\n`);

    // Seed about page content
    console.log('📄 Seeding about page content...');
    await WebsiteContent.insertMany(aboutPageContent);
    console.log(`✅ ${aboutPageContent.length} about page sections created\n`);

    // Seed website settings
    console.log('⚙️  Seeding website settings...');
    await WebsiteSettings.create(websiteSettings);
    console.log('✅ Website settings created\n');

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Homepage sections: ${homePageContent.length}`);
    console.log(`   - About page sections: ${aboutPageContent.length}`);
    console.log(`   - Total content items: ${homePageContent.length + aboutPageContent.length}`);
    console.log('   - Website settings: 1');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run seeder
seedDatabase();

