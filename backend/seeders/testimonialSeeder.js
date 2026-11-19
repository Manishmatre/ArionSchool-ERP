const mongoose = require('mongoose');
const Testimonial = require('../models/Testimonial');

const sampleTestimonials = [
  {
    userName: 'Rahul Kumar',
    userRole: 'student',
    designation: 'Software Engineer @ TechCorp',
    rating: 5,
    title: 'From Complete Beginner to Software Developer',
    message: 'The comprehensive curriculum and continuous hands-on projects helped me transition into a high-paying tech career. The mentors were always there to guide me through complex programming topics.',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
    type: 'student',
    status: 'approved',
    isFeatured: true
  },
  {
    userName: 'Priya Sharma',
    userRole: 'franchise_admin',
    designation: 'Franchise Partner - Patna Center',
    franchiseName: 'Patna Learning Hub',
    rating: 5,
    title: 'A Truly Profitable & Supportive Partnership',
    message: 'Partnering with SES was the best decision for my educational venture. The student LMS, marketing assets, and automated certification workflows made scaling our center seamless. We reached 250+ active students in year one!',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    type: 'franchise',
    status: 'approved',
    isFeatured: true
  },
  {
    userName: 'Amit Patel',
    userRole: 'student',
    designation: 'Digital Marketing Specialist',
    rating: 5,
    title: 'Practical Skills That Delivered Results on Day 1',
    message: 'The digital marketing practical assignments and live campaign audits gave me actual portfolio work. I landed 3 client freelance projects before even finishing the certificate!',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    type: 'student',
    status: 'approved',
    isFeatured: true
  },
  {
    userName: 'Sneha Verma',
    userRole: 'student',
    designation: 'Computer Applications Graduate',
    rating: 5,
    title: 'Top notch mentorship and exam preparation',
    message: 'I took the DCA course and test modules on the portal. The test engine and instant score feedback helped me excel in my final assessment. Highly recommended for all students.',
    videoUrl: '',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    type: 'general',
    status: 'approved',
    isFeatured: true
  },
  {
    userName: 'Vikram Singh',
    userRole: 'franchise_admin',
    designation: 'Franchise Director - Lucknow Institute',
    franchiseName: 'SES Skill Institute Lucknow',
    rating: 5,
    title: 'Robust Franchise Support and Exam Infrastructure',
    message: 'The portal makes managing staff, student batches, attendance, and fee installments so structured. Central team is always responsive.',
    videoUrl: '',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    type: 'franchise',
    status: 'approved',
    isFeatured: false
  }
];

const seedTestimonials = async () => {
  try {
    const count = await Testimonial.countDocuments();
    if (count === 0) {
      await Testimonial.insertMany(sampleTestimonials);
      console.log('Seeded initial testimonials and video reviews successfully.');
    }
  } catch (err) {
    console.error('Error seeding testimonials:', err.message);
  }
};

module.exports = seedTestimonials;
