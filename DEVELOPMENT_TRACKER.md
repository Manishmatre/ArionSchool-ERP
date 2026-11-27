# ArionSchool ERP Development Tracker

This tracker records repository evidence, not planned functionality. A module is **VERIFIED COMPLETE** only after its real UI → API → database workflow and authorization paths have been exercised.

| Priority | Module | Database | Backend | Frontend | Validation | Permissions | Integration | Tests | Production verification | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| P1 | Application stability | Existing | Existing | Existing | Partial | Existing | Partial | Backend suite and frontend build pass at v2.0.125; Sidebar runtime import fixed | No live browser smoke run | IMPLEMENTED |
| P1 | Authentication | Existing | Existing | Existing | Existing | Existing | Existing | Included in 65-test backend suite | No live sign-in/session test this cycle | IN PROGRESS |
| P1 | Tenant isolation: student record reads | Existing `Student.franchise`, `Student.user`, `Student.parent` | Added centralized student access middleware for ID endpoints | Existing student screens/API | Tests access matrix | Same-tenant staff, self student, linked parent, platform admin | Student profile, dashboard, progress, photo, document, results, enrolled courses, exam-access routes | 65/65 backend tests pass; student access and scoped-search regression tests added | API+Mongo cross-tenant workflow not yet exercised | TESTING |
| P1 | School onboarding | Existing | Existing partial flows | Existing partial flows | Audit required | Audit required | Academic/session setup partial | No dedicated workflow test | Not verified | AUDIT REQUIRED |
| P2 | Students/admissions/enrollment | Existing | Existing partial flows | Existing partial flows | Partial | Tenant hardening ongoing | Academic structures/enrollment | Model and lifecycle unit tests exist; no complete admission workflow run | Not verified | IN PROGRESS |
| P2 | Academic year/classes/sections/promotion | Existing | Existing | Existing | Partial | Audit required | Enrollment/promotion | Related model tests pass; full rollover unverified | Not verified | IN PROGRESS |
| P3 | Attendance/staff/subjects/timetable/homework | Existing | Existing | Existing | Audit required | Audit required | Partial | Coverage partial | Not verified | AUDIT REQUIRED |
| P4 | Exams/results/report cards | Existing | Existing | Existing | Partial | Audit required | Template workflow in progress | Rendering tests exist; complete school workflow unverified | Not verified | IN PROGRESS |
| P5 | Fees/payments/accounting/payroll | Existing | Existing | Existing | Partial | Audit required | Payment/ledger integrations exist | Payment/model tests pass; end-to-end reconciliation unverified | Not verified | IN PROGRESS |
| P6 | Transport/library/inventory/HR/certificates/ID cards | Existing | Existing | Existing | Audit required | Audit required | Partial | Partial | Not verified | AUDIT REQUIRED |
| P7 | SaaS plans/subscriptions/onboarding | Existing | Existing | Existing | Audit required | Audit required | Partial | Partial | Not verified | IN PROGRESS |
| P8 | Security/testing/backups/deployment | Existing | Existing | Existing | Partial | Tenant audit ongoing | Partial | 65 backend tests; frontend production build | Backups/deployment restore not verified | IN PROGRESS |

## Current work item

**Tenant isolation: student record reads** is the active P1 item. The pure access-policy and search-composition tests pass. API middleware is wired to student ID routes, but database-backed cross-tenant HTTP tests and browser verification remain required before this item can be marked VERIFIED COMPLETE.

## Next recommended work

Add integration tests against an isolated MongoDB instance for school A versus school B student profile, dashboard, progress, photo/document, results, and parent/student ownership. Then audit writes and related resources (payments, attendance, enrollments, and certificates) for the same tenant-boundary gaps.

