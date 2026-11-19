---
trigger: "always_on"
description: "Enforce automatic version increments and dynamic version display across SES Educare platforms"
---

# Automatic Versioning & Synchronized Display Rule

## Mandatory Workflow on Code Edits
Whenever any feature, fix, or modification is made:
1. Increment the version for the modified platform(s):
   - **Web / Backend**: Increment `frontend/src/config/version.js`, `frontend/package.json`, and `backend/package.json`.
   - **Mobile App**: Increment `mobile/src/config/version.js`, `mobile/app.json`, and `mobile/package.json`.
   - Helper script available: `node scripts/bump-version.js [web|mobile|all]`
2. The version must be displayed dynamically in all UI panels:
   - Sidebar footer (`Sidebar.jsx` -> `v{APP_VERSION}`)
   - Top navigation profile dropdown (`Navbar.jsx` -> `Platform Version: v{APP_VERSION}`)
   - Login footer (`Login.jsx` -> `v{APP_VERSION}`)
   - Mobile modals & settings (`UpdatePromptModal.js` / `CURRENT_APP_VERSION`)
3. Git commit messages must include the version number tag.

