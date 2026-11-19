# ArionSchool-ERP

SES Educare school management ERP workspace.

## Applications

- `backend/` — Node.js and Express API
- `frontend/` — School ERP web application
- `platform-admin/` — SaaS platform administration console
- `website/` and `landing/` — Public website and landing experience
- `mobile/` — Expo mobile application

Environment templates are provided as `.env.example` files. Copy the applicable template to `.env` and replace every placeholder before running an application. Never commit real credentials.

Dependency lockfiles are included for reproducible installs. Historical APK and IPA release binaries are kept out of this GitHub source backup; rebuild them from `mobile/` when needed.
