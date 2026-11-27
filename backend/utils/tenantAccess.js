const SCHOOL_TENANT_ROLES = new Set([
  'school_owner',
  'school_admin',
  'principal',
  'vice_principal',
  'franchise_admin',
  'teacher',
  'class_teacher',
  'accountant',
  'admission_officer',
  'hr_manager',
  'transport_manager',
  'librarian',
  'security_staff',
  'staff'
]);

const isSchoolTenantUser = (user) => Boolean(user && SCHOOL_TENANT_ROLES.has(user.role));
const getSchoolTenantId = (user) => user?.franchise?._id || user?.franchise || null;

const idOf = (value) => String(value?._id || value || '');
const canAccessStudentRecord = (user, student) => {
  if (!user || !student) return false;
  if (['super_admin', 'school_owner'].includes(user.role)) return true;
  if (user.role === 'student') return idOf(student.user) === idOf(user._id || user.id);
  if (user.role === 'parent') {
    const studentId = idOf(student._id || student.id);
    return idOf(student.parent) === idOf(user._id || user.id) ||
      (user.linkedStudents || []).some((id) => idOf(id) === studentId);
  }
  if (isSchoolTenantUser(user)) {
    const tenantId = idOf(getSchoolTenantId(user));
    return Boolean(tenantId) && idOf(student.franchise) === tenantId;
  }
  return false;
};

module.exports = { SCHOOL_TENANT_ROLES, isSchoolTenantUser, getSchoolTenantId, canAccessStudentRecord };
