import React from 'react';
import { FiXCircle } from 'react-icons/fi';

const CertificatePreview = ({ 
  studentName, 
  courseName, 
  grade, 
  issueDate, 
  verificationCode,
  certificateNumber,
  show = false,
  onClose
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <FiXCircle size={24} />
        </button>
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800">Certificate Preview</h3>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
          >
            <FiXCircle size={24} />
          </button>
        </div>
        
        <div className="p-8">
          {/* Certificate Preview */}
          <div 
            className="relative bg-gradient-to-br from-amber-50 to-white border-8 border-double border-amber-600 rounded-lg p-12 text-center"
            style={{
              backgroundImage: 'linear-gradient(135deg, #fef3c7 0%, #ffffff 100%)',
              minHeight: '500px'
            }}
          >
            {/* Decorative corners */}
            <div className="absolute top-4 left-4 text-amber-600 text-4xl">❦</div>
            <div className="absolute top-4 right-4 text-amber-600 text-4xl">❦</div>
            <div className="absolute bottom-4 left-4 text-amber-600 text-4xl">❦</div>
            <div className="absolute bottom-4 right-4 text-amber-600 text-4xl">❦</div>
            
            {/* Certificate Content */}
            <div className="relative z-10">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-4xl font-serif text-amber-800 mb-2">
                  CERTIFICATE OF COMPLETION
                </h1>
                <div className="w-32 h-1 bg-amber-600 mx-auto"></div>
              </div>
              
              {/* Body */}
              <div className="mb-8 space-y-4">
                <p className="text-lg text-slate-700 italic">
                  This is to certify that
                </p>
                
                <div className="py-4 border-b-2 border-t-2 border-amber-400 my-6">
                  <h2 className="text-3xl font-bold text-amber-900 uppercase tracking-wide">
                    {studentName || 'Student Name'}
                  </h2>
                </div>
                
                <p className="text-lg text-slate-700">
                  has successfully completed the course
                </p>
                
                <div className="py-3">
                  <h3 className="text-2xl font-semibold text-amber-800">
                    {courseName || 'Course Name'}
                  </h3>
                </div>
                
                {grade && (
                  <div className="mt-4">
                    <span className="inline-block px-4 py-2 bg-amber-100 text-amber-800 rounded-full font-semibold">
                      Grade: {grade}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="mt-12 grid grid-cols-2 gap-8 text-sm">
                <div>
                  <p className="text-slate-600 mb-2">Date Issued:</p>
                  <p className="font-semibold text-slate-800">
                    {issueDate ? new Date(issueDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    }) : new Date().toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                
                <div>
                  <p className="text-slate-600 mb-2">Certificate No:</p>
                  <p className="font-semibold text-slate-800">
                    {certificateNumber || 'CERT2025000001'}
                  </p>
                </div>
              </div>
              
              {/* Verification Code */}
              {verificationCode && (
                <div className="mt-6 p-3 bg-slate-100 rounded-lg">
                  <p className="text-xs text-slate-600 mb-1">Verification Code:</p>
                  <p className="font-mono text-sm font-semibold text-slate-800">
                    {verificationCode}
                  </p>
                </div>
              )}
              
              {/* Signature Lines */}
              <div className="mt-12 grid grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="border-b-2 border-gray-400 mb-2"></div>
                  <p className="text-sm text-slate-600">Authorized Signature</p>
                </div>
                <div className="text-center">
                  <div className="border-b-2 border-gray-400 mb-2"></div>
                  <p className="text-sm text-slate-600">Director</p>
                </div>
              </div>
              
              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                <div className="text-8xl font-bold text-amber-600 transform rotate-45">
                  SES EDUCARE
                </div>
              </div>
            </div>
          </div>
          
          {/* Preview Controls */}
          <div className="mt-6 flex justify-center gap-4">
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-slate-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificatePreview;
