# SES Educare - Mandatory AI Pair-Programming Rules

## 1. MANDATORY AUTOMATIC VERSIONING RULE
Whenever ANY code, design, configuration, feature, or bug fix is made anywhere in this repository:
1. **Always Increment the Version**:
   - For Web/Backend changes: Increment the patch version in `frontend/src/config/version.js`, `frontend/package.json`, and `backend/package.json`.
   - For Mobile changes: Increment `mobile/src/config/version.js`, `mobile/app.json` (version + versionCode + buildNumber), and `mobile/package.json`.
   - For repository-wide or combined updates: Bump both web and mobile.
   - You can also execute: `node scripts/bump-version.js [web|mobile|all]` to automatically bump and synchronize all files.
2. **Never Hardcode Versions in UI Components**:
   - Web: Always import and render `APP_VERSION` from `frontend/src/config/version.js`. This is used in:
     - `Sidebar.jsx` (sidebar footer badge)
     - `Navbar.jsx` (profile dropdown version item)
     - `Login.jsx` (footer copyright & version)
     - `DownloadAppModal.jsx` (modal downloads)
   - Mobile: Always import and render `CURRENT_APP_VERSION` and `CURRENT_APP_BUILD` from `mobile/src/config/version.js`.
3. **Commit Messages**:
   - In git commit messages, always include the latest version tag (e.g. `feat(...): ... [v2.0.5]`).

## 2. BRANDING & UI CONSISTENCY
- Strictly maintain SES Educare branding across all views, headers, and metadata.
- Maintain consistent padding, typography, modal styling, and color schemes.

