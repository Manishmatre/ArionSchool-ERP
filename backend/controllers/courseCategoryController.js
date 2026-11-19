const Course = require('../models/Course');
const CourseCategory = require('../models/CourseCategory');

const normalizeName = (value) => String(value || '').trim().toLocaleLowerCase('en');
const exactCaseInsensitivePattern = (value) => new RegExp(`^${String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
const validateCategory = (body = {}) => {
  const name = String(body.name || '').trim();
  const color = body.color || '#6B7280';
  if (!name) return { error: 'Category name is required.' };
  if (name.length > 80) return { error: 'Category name cannot exceed 80 characters.' };
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) return { error: 'Choose a valid 6-digit hex color.' };
  return {
    value: {
      name,
      normalizedName: normalizeName(name),
      description: String(body.description || '').trim(),
      icon: String(body.icon || '📚').trim().slice(0, 8),
      color
    }
  };
};

exports.getCourseCategories = async (req, res, next) => {
  try {
    const existing = await CourseCategory.find().select('normalizedName').lean();
    const existingNames = new Set(existing.map((item) => item.normalizedName));
    const courseNames = await Course.distinct('category', { category: { $type: 'string', $ne: '' } });

    // Adopt existing free-text course categories so the first visit preserves current course data.
    for (const rawName of courseNames) {
      const name = String(rawName || '').trim();
      const normalizedName = normalizeName(name);
      if (!name || existingNames.has(normalizedName)) continue;
      try {
        await CourseCategory.updateOne(
          { normalizedName },
          { $setOnInsert: { name, normalizedName, description: '', icon: '📚', color: '#6B7280' } },
          { upsert: true }
        );
        existingNames.add(normalizedName);
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
    }

    const [categories, counts] = await Promise.all([
      CourseCategory.find().sort({ name: 1 }).lean(),
      Course.aggregate([
        {
          $group: {
            _id: { $toLower: { $trim: { input: { $ifNull: ['$category', ''] } } } },
            count: { $sum: 1 }
          }
        }
      ])
    ]);
    const countByName = new Map(counts.map((row) => [row._id, row.count]));
    const data = categories.map((category) => ({
      ...category,
      courseCount: countByName.get(category.normalizedName) || 0
    }));

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

exports.createCourseCategory = async (req, res, next) => {
  try {
    const { value, error } = validateCategory(req.body);
    if (error) return res.status(400).json({ success: false, message: error });
    const category = await CourseCategory.create(value);
    res.status(201).json({ success: true, message: 'Course category created.', data: { ...category.toObject(), courseCount: 0 } });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'A category with this name already exists.' });
    next(error);
  }
};

exports.updateCourseCategory = async (req, res, next) => {
  try {
    const category = await CourseCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Course category not found.' });
    const { value, error } = validateCategory(req.body);
    if (error) return res.status(400).json({ success: false, message: error });

    const previousName = category.name;
    const renamed = normalizeName(previousName) !== value.normalizedName;
    Object.assign(category, value);
    await category.save();
    if (renamed) {
      await Course.updateMany({ category: exactCaseInsensitivePattern(previousName) }, { $set: { category: value.name } });
    }

    const courseCount = await Course.countDocuments({ category: exactCaseInsensitivePattern(value.name) });
    res.status(200).json({ success: true, message: 'Course category updated.', data: { ...category.toObject(), courseCount } });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'A category with this name already exists.' });
    next(error);
  }
};

exports.deleteCourseCategory = async (req, res, next) => {
  try {
    const category = await CourseCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Course category not found.' });
    const courseCount = await Course.countDocuments({ category: exactCaseInsensitivePattern(category.name) });
    if (courseCount) {
      return res.status(409).json({
        success: false,
        message: `Reassign the ${courseCount} course(s) in this category before deleting it.`,
        courseCount
      });
    }
    await category.deleteOne();
    res.status(200).json({ success: true, message: 'Course category deleted.' });
  } catch (error) {
    next(error);
  }
};
