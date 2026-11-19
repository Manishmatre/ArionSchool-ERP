# EduTest Pro Frontend

React frontend for EduTest Pro - Online Learning & MCQ Testing Platform

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Open browser at `http://localhost:3000`

## Build for Production

```bash
npm run build
```

The build output will be in the `dist` folder.

## Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── api/           # API configuration
├── components/    # Reusable components
├── context/       # React context providers
├── pages/         # Page components
│   ├── admin/     # Admin panel pages
│   └── student/   # Student panel pages
├── App.jsx        # Main app component
├── main.jsx       # Entry point
└── index.css      # Global styles
```

## Environment Variables

The frontend uses Vite's proxy configuration to connect to the backend API.

Update `vite.config.js` if your backend runs on a different port:

```javascript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true
    }
  }
}
```

## Available Routes

### Public Routes
- `/login` - Login page
- `/register` - Registration page

### Admin Routes
- `/admin/dashboard` - Admin dashboard
- `/admin/users` - User management
- `/admin/chapters` - Chapter management
- `/admin/topics` - Topic management
- `/admin/mcqs` - MCQ management
- `/admin/reports` - Student reports

### Student Routes
- `/student/dashboard` - Student dashboard
- `/student/chapters` - Browse chapters
- `/student/topic/:id` - View topic details
- `/student/test` - Take test
- `/student/results` - View test results
- `/student/result/:id` - View detailed result
- `/student/progress` - View progress

## Technologies

- React 18
- Vite
- React Router v6
- Axios
- Tailwind CSS
- React Icons
- Recharts
- React Toastify

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
