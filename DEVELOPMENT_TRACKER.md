# ArionSchool ERP Development Tracker

This tracker records repository evidence, not planned functionality. A module is **VERIFIED COMPLETE** only after its real UI → API → database workflow and authorization paths have been exercised.

| Priority | Module | Database | Backend | Frontend | Validation | Permissions | Integration | Tests | Production verification | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| P1 | Application stability | Existing | Existing | Existing | Partial | Existing | Partial | Backend suite and frontend build pass at v2.0.127; Sidebar runtime import fixed | No live browser smoke run | IMPLEMENTED |
| P1 | Authentication | Existing | Existing | Existing | Existing | Existing | Existing | Included in 66-test backend suite | No live sign-in/session test this cycle | IN PROGRESS |
| P1 | Student profile/dashboard authorization | Existing Student ownership references | Student access middleware on profile/dashboard routes | Existing student profile APIs | Ownership/tenant policy checks | Same-school staff, student self, linked parent | Authenticated reads through app API | Live HTTP+Mongo: 14/14 auth cases; fixtures cleaned; standard suite 66 pass, 1 opt-in integration skipped | Development tenant fixtures verified removed after run | VERIFIED COMPLETE |
| P1 | Startup testimonial seeding | Existing Testimonial model | Removed invalid automatic sample seeding; corrected manual seeder enum | No affected user workflow | Seeder sample schema validation | Startup no longer inserts hardcoded sample reviews | Seeder validation test added | Manual seed schema validation passes; standard suite 66 pass, 1 opt-in integration skipped; live API restart verified | Restarted API; Mongo connected; seed exception absent (existing Mongoose _id index warning remains) | IN PROGRESS |
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

**Tenant isolation: student profile/photo/document authorization** is the active P1 item. The pure access-policy and search-composition tests pass. API middleware is wired to student ID routes, but database-backed cross-tenant HTTP tests and browser verification remain required before this item can be marked VERIFIED COMPLETE.

## Next recommended work

Add integration tests against an isolated MongoDB instance for school A versus school B student profile, dashboard, progress, photo/document, results, and parent/student ownership. Then audit writes and related resources (payments, attendance, enrollments, and certificates) for the same tenant-boundary gaps.

