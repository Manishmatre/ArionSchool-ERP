export const SCHOOL_OWNER_ROLES = ['school_owner', 'super_admin'];
export const SCHOOL_ADMIN_ROLES = ['school_admin', 'principal', 'vice_principal', 'franchise_admin'];
export const TEACHER_ROLES = ['teacher', 'class_teacher'];

export const isSchoolOwnerRole = (role) => SCHOOL_OWNER_ROLES.includes(role);
export const isSchoolAdminRole = (role) => SCHOOL_ADMIN_ROLES.includes(role);
export const isTeacherRole = (role) => TEACHER_ROLES.includes(role);
export const isSuperAdminRole = (role) => role === 'super_admin';

export const getHomeRouteForRole = (role) => {
  // School Owner & Super Admin land on the Multi-Campus School Owner ERP Dashboard (/admin/dashboard).
  // Company-level SaaS operations live in the standalone platform-admin/ console.
  if (isSchoolOwnerRole(role)) return '/admin/dashboard';
  if (isSchoolAdminRole(role)) return '/school/dashboard';
  if (isTeacherRole(role)) return '/teacher/dashboard';
  if (role === 'parent') return '/parent/dashboard';
  if (role === 'accountant') return '/accountant/dashboard';
  return '/student/dashboard';
};

export const isRoleAllowed = (userRole, allowedRoles) => {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  if (allowedRoles.includes(userRole)) return true;
  // School Owner has full multi-campus ERP access wherever super_admin or school_owner is permitted
  if (userRole === 'school_owner' && allowedRoles.some((r) => SCHOOL_OWNER_ROLES.includes(r))) {
    return true;
  }
  if (isSchoolAdminRole(userRole) && allowedRoles.some((r) => SCHOOL_ADMIN_ROLES.includes(r))) {
    return true;
  }
  if (isTeacherRole(userRole) && allowedRoles.some((r) => TEACHER_ROLES.includes(r))) {
    return true;
  }
  return false;
};

export const getRoleDisplayName = (role) => {
  const map = {
    super_admin: 'School Super Admin',
    school_owner: 'School Owner / Multi-Campus Admin',
    school_admin: 'Campus Principal / Admin',
    principal: 'Principal',
    vice_principal: 'Vice Principal',
    franchise_admin: 'Campus Admin',
    teacher: 'Teacher',
    class_teacher: 'Class Teacher',
    accountant: 'Accountant',
    parent: 'Parent',
    student: 'Student',
    admission_officer: 'Admission Officer',
    hr_manager: 'HR Manager',
    transport_manager: 'Transport Manager',
    librarian: 'Librarian'
  };
  return map[role] || role || 'User';
};
