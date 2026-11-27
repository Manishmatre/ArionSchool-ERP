const test = require('node:test');
const assert = require('node:assert/strict');
const Testimonial = require('../models/Testimonial');
const { sampleTestimonials } = require('../seeders/testimonialSeeder');

test('all seeded testimonials satisfy the current model schema', async () => {
  for (const item of sampleTestimonials) {
    const document = new Testimonial(item);
    await document.validate();
  }
  assert.ok(sampleTestimonials.length > 0);
});
