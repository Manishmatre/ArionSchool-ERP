const normalizeCourseKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const simplifyCourseName = (value) =>
  normalizeCourseKey(value)
    .replace(/^certificate in /, '')
    .replace(/^diploma in /, '')
    .replace(/^advanced /, '');

const toIdString = (value) => {
  if (value == null) return null;
  const id = value._id ?? value;
  return id?.toString?.() ?? null;
};

/** Whether a template belongs to the selected course (by id or title). */
export const templateMatchesCourse = (template, course) => {
  if (!template || !course) return false;

  const courseId = toIdString(course._id ?? course);
  const templateCourseId = toIdString(template.course);

  if (courseId && templateCourseId && courseId === templateCourseId) {
    return true;
  }

  const title = normalizeCourseKey(course.title);
  const type = normalizeCourseKey(template.courseType);

  if (!title || !type) return false;
  if (title === type) return true;

  const simpleTitle = simplifyCourseName(course.title);
  const simpleType = simplifyCourseName(template.courseType);
  if (simpleTitle && simpleType && simpleTitle === simpleType) return true;

  if (title.includes(type) || type.includes(title)) return true;

  return false;
};

/**
 * Filter document templates (marksheet / certificate) for generate forms.
 * Super admins see all branch templates for the course; franchise admins prefer their branch type.
 */
export const filterTemplatesForStudentCourse = ({
  templates = [],
  course,
  student,
  userRole,
}) => {
  const byCourse = templates.filter((t) => templateMatchesCourse(t, course));
  if (!byCourse.length) return [];

  if (userRole === 'super_admin') {
    return byCourse;
  }

  const isMainBranch = student?.franchise?.isMainBranch || false;
  const targetType = isMainBranch ? 'main_branch' : 'franchise';

  const byBranch = byCourse.filter(
    (t) => t.targetType === targetType || !t.targetType
  );

  return byBranch.length ? byBranch : byCourse;
};
