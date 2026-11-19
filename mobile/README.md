# SES EDUCARE - Cross-Platform Mobile Application (Android & iOS)

A complete, production-grade native mobile application built with **React Native (Expo)** designed specifically for **Students** of SES Educare. Works seamlessly on both **Android** and **iOS** devices.

---

## 🚀 Key Features Built for Students

### 1. 🔐 Authentication & Session Management
- **Student Sign-In**: Login using registered Student Roll Number, Mobile, or Email address.
- **Secure Persistence**: JWT tokens stored securely via `@react-native-async-storage/async-storage` with automatic session restoration.
- **In-App Server Switcher**: Easily test on local Wi-Fi LAN IP or production server right from the login screen or student profile.

### 2. 📊 Student Dashboard
- **Personalized Header**: Student profile photo, name, and official Roll Number.
- **Academic Progress KPIs**: Syllabus completion percentage, enrolled courses count, and assessments completed.
- **Continue Learning Card**: Immediate one-tap resume for active enrolled course with visual progress bar.
- **Quick Action Grid**: 8 shortcut tiles for Courses, Tests, ID Card, Live Lectures, Attendance, Fee Status, Certificates, and Reviews.
- **Scheduled Classes & Recent Scores**: Real-time widgets with pull-to-refresh.

### 3. 📚 My Courses & Interactive Curriculum
- **Dual Tab Catalog**: "My Enrolled Courses" vs "All Academic Courses".
- **Real-Time Search**: Search courses by course code or title.
- **Course Syllabus & Lessons**:
  - Chapter-by-chapter breakdown with topics and duration.
  - Video lecture links & downloadable study material/PDF viewers.
  - One-tap lesson completion tracking synced to the LMS backend (`/api/progress`).

### 4. 📝 Interactive MCQ Test Engine
- **Test Format Selection**: Full Course Assessment, Chapter Review, or Topic Quiz.
- **Live Countdown Timer**: Real-time ticking timer with color-coded warning when under 5 minutes.
- **Mobile Question Palette**: Slide-up modal displaying answered, unanswered, and flagged questions for instant jumping.
- **Flag for Review**: Bookmark difficult questions to review before submission.
- **Instant Scorecard & Answer Review**:
  - Celebration hero card with percentage and pass/fail badge.
  - Correct, Incorrect, and Skipped breakdown.
  - Complete question-by-question review showing selected option vs correct option.

### 5. 🪪 Digital Student Records & ID Card
- **Digital Student ID Card**:
  - Institute header with SES Educare branding.
  - Student photo, official Roll Number, Course, and Franchise branch.
  - Digital barcode with verified credential watermark.
- **Attendance Tracker**: Overall attendance percentage, present/absent counts, and chronological class logs.
- **Fee Receipts & Obligation**: Total course fee, paid installments, balance due, and verified receipts.
- **Verified Certificates**: View issued certificates with verification ID and download links.
- **Academic Marksheets**: Semester marksheets with grades (A+, A, etc.) and marks.

### 6. 🎥 Live Video Lectures
- Live and upcoming online classes scheduled by franchise instructors.
- One-tap "Join Class" button linking directly to Zoom, Google Meet, or Jitsi meetings.

### 7. ⭐ Student Reviews & Testimonials
- Rate enrolled courses from 1 to 5 stars.
- Write testimonial text and submit video review links (YouTube / Vimeo).
- View status of submitted testimonials (Pending / Approved).

### 8. 👤 Profile & App Settings
- Complete academic, guardian, contact, and enrollment records.
- Backend server IP manager.
- Sign out with confirmation.

---

## 📱 How to Run & Test

### Option A: Test on Physical Phone (Android or iOS) via Expo Go (Fastest)
1. Install **Expo Go** from Google Play Store (Android) or App Store (iOS).
2. Connect your phone to the same Wi-Fi network as this computer.
3. In the terminal, navigate to the `mobile` folder:
   ```bash
   cd mobile
   npm start
   ```
4. Scan the displayed QR code:
   - On Android: Scan using the **Expo Go** app.
   - On iOS: Scan using the default **Camera** app.

### Option B: Test on Android Emulator
```bash
cd mobile
npm run android
```

### Option C: Test on iOS Simulator (macOS only)
```bash
cd mobile
npm run ios
```

---

## ⚙️ Backend API Configuration
The mobile app defaults to connecting over local Wi-Fi:
- Default: `http://10.239.248.113:5000` (or `http://localhost:5000` on simulators)
- You can change the backend URL directly inside the app on the Login screen or Profile screen!
