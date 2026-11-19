import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * StudentWatermark Component
 * Renders a single, light, and unobtrusive moving watermark displaying the student's ID (last 4 digits)
 * drifting smoothly across the video to trace unauthorized recordings while keeping the view completely clean.
 *
 * @param {string} customId - optional student ID override
 */
export default function StudentWatermark({ customId = '', variant = 'video' }) {
  const { user } = useAuth();

  // Extract student identifier (last 4 digits)
  const displayId = useMemo(() => {
    const rawId =
      customId ||
      user?.studentId ||
      user?.studentDetails?.studentId ||
      user?.enrollmentNumber ||
      user?.studentDetails?.enrollmentNumber ||
      user?._id ||
      '';

    const cleanStr = String(rawId).trim();
    const digitsOnly = cleanStr.replace(/[^a-zA-Z0-9]/g, '');
    const l4 = digitsOnly.length >= 4 ? digitsOnly.slice(-4) : digitsOnly.padStart(4, '0');
    return `SES • ****-${l4}`;
  }, [user, customId]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none absolute inset-0 overflow-hidden z-20 rounded-xl"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      <style>{`
        @keyframes floatStudentWatermark {
          0% {
            top: 10%;
            left: 8%;
          }
          20% {
            top: 65%;
            left: 18%;
          }
          40% {
            top: 25%;
            left: 70%;
          }
          60% {
            top: 72%;
            left: 55%;
          }
          80% {
            top: 35%;
            left: 25%;
          }
          100% {
            top: 10%;
            left: 8%;
          }
        }
        .student-moving-watermark {
          position: absolute;
          animation: floatStudentWatermark 26s infinite ease-in-out;
          pointer-events: none;
        }
      `}</style>

      {/* Single, very light moving watermark */}
      <div
        className={`student-moving-watermark px-2.5 py-0.5 rounded-md backdrop-blur-[0.5px] font-mono text-[11px] font-bold tracking-widest uppercase transition-all shadow-sm ${
          variant === 'page'
            ? 'bg-slate-900/10 text-slate-700/30 border border-slate-900/10'
            : 'bg-black/25 text-white/35 border border-white/10'
        }`}
      >
        {displayId}
      </div>
    </div>
  );
}
