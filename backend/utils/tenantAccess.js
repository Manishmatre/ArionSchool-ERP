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

module.exports = { SCHOOL_TENANT_ROLES, isSchoolTenantUser, getSchoolTenantId };
