# ArionSchool ERP Development Tracker

This tracker records repository evidence, not planned functionality. A module is **VERIFIED COMPLETE** only after its real UI → API → database workflow and authorization paths have been exercised.

| Priority | Module | Database | Backend | Frontend | Validation | Permissions | Integration | Tests | Production verification | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| P1 | Application stability | Existing | Existing | Existing | Partial | Existing | Partial | Backend suite and frontend build pass at v2.0.128; Sidebar runtime import fixed | No live browser smoke run | IMPLEMENTED |
| P1 | Authentication/session lifecycle | Added tokenVersion field (default 0; no backfill required) | Case-normalized email login; token-version validation; logout revokes sessions; password reset revokes stale sessions; public registration restricted to student/parent; validation and duplicate-key responses | AuthContext sends logout revocation; insecure public Super Admin registration page removed and legacy route redirects to login | Required name/email/password; public roles allowlisted; duplicate emails checked case-insensitively | Public registration cannot assign staff/platform roles; authenticated logout/me; inactive accounts and stale tokens rejected | Registration, login, /me, logout, password reset integrated | Live HTTP+Mongo checks: student registration, super_admin escalation rejected, case-insensitive duplicate rejected, wrong credentials, uppercase login, deactivated account, /me, logout revocation, invalid/expired reset, password reset revocation/current token; fixture and activity cleanup asserted | Local dev API+Mongo passed; browser navigation, Google OAuth, forgot-password email delivery, rate-limit behavior not exercised | TESTING |
| P1 | Student profile/dashboard authorization | Existing Student ownership references | Student access middleware on profile/dashboard routes | Existing student profile APIs | Ownership/tenant policy checks | Same-school staff, student self, linked parent | Authenticated reads through app API | Live HTTP+Mongo: 14/14 auth cases; fixtures cleaned; standard suite 66 pass, 2 opt-in integrations skipped | Development tenant fixtures verified removed after run | VERIFIED COMPLETE |
| P1 | Startup testimonial seeding | Existing Testimonial model | Removed invalid automatic sample seeding; corrected manual seeder enum | No affected user workflow | Seeder sample schema validation | Startup no longer inserts hardcoded sample reviews | Seeder validation test added | Manual seed schema validation passes; standard suite 66 pass, 2 opt-in HTTP integrations skipped by default | Restarted API; Mongo connected; seed exception absent. Existing WebsiteSettings _id-index warning remains | VERIFIED COMPLETE |
| P1 | School onboarding | Existing | Existing partial flows | Existing partial flows | Audit required | Audit required | Academic/session setup partial | No dedicated workflow test | Not verified | AUDIT REQUIRED |
| P2 | Students/admissions/enrollment | Existing | Existing partial flows | Existing partial flows | Partial | Tenant hardening ongoing | Academic structures/enrollment | Model and lifecycle unit tests exist; no complete admission workflow run | Not verified | IN PROGRESS |
| P2 | Academic year/classes/sections/promotion | Existing | Existing | Existing | Partial | Audit required | Enrollment/promotion | Related model tests pass; full rollover unverified | Not verified | IN PROGRESS |
| P3 | Attendance/staff/subjects/timetable/homework | Existing | Existing | Existing | Audit required | Audit required | Partial | Coverage partial | Not verified | AUDIT REQUIRED |
| P4 | Exams/results/report cards | Existing | Existing | Existing | Partial | Audit required | Template workflow in progress | Rendering tests exist; complete school workflow unverified | Not verified | IN PROGRESS |
| P5 | Fees/payments/accounting/payroll | Existing | Existing | Existing | Partial | Audit required | Payment/ledger integrations exist | Payment/model tests pass; end-to-end reconciliation unverified | Not verified | IN PROGRESS |
| P6 | Transport/library/inventory/HR/certificates/ID cards | Existing | Existing | Existing | Audit required | Audit required | Partial | Partial | Not verified | AUDIT REQUIRED |
| P7 | SaaS plans/subscriptions/onboarding | Existing | Existing | Existing | Audit required | Audit required | Partial | Partial | Not verified | IN PROGRESS |
| P8 | Security/testing/backups/deployment | Existing | Existing | Existing | Partial | Tenant audit ongoing | Partial | 66 backend tests; frontend production build | Backups/deployment restore not verified | IN PROGRESS |

## Current work item

**Authentication/session lifecycle** remains the active P1 item. Registration and session lifecycle have now passed live API+Mongo tests, including a public `super_admin` escalation attempt and fixture cleanup. Remaining verification: Google OAuth, forgot-password email delivery, rate limiting, and browser login/logout/navigation. The adjacent student profile/dashboard tenant slice is VERIFIED COMPLETE; broader tenant isolation remains open.

## Next recommended work

Finish the remaining authentication checks that can be exercised locally. Then audit tenant isolation on attendance, payments, enrollment, and certificates.

