import React, { useState } from 'react';
import {
  FiBookOpen, FiFileText, FiX, FiCheck, FiCopy, FiRefreshCw,
  FiDownload, FiHelpCircle
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import { toast } from 'react-toastify';
import { generateLessonPlan, generateQuestions } from '../../api/aiApi';

export default function TeacherAiModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('lesson'); // 'lesson' | 'questions'
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Lesson Plan Form
  const [lessonForm, setLessonForm] = useState({
    className: 'Class 10',
    subject: 'Science',
    topic: 'Photosynthesis & Cellular Respiration',
    duration: '45 minutes',
    learningObjectives: 'Students understand the light-dependent reactions and energy balance.'
  });
  const [generatedPlan, setGeneratedPlan] = useState('');

  // Questions Form
  const [questionForm, setQuestionForm] = useState({
    className: 'Class 10',
    subject: 'Mathematics',
    topic: 'Quadratic Equations',
    questionType: 'mcq',
    count: 5,
    difficulty: 'medium',
    language: 'English'
  });
  const [generatedQuestionsData, setGeneratedQuestionsData] = useState(null);

  if (!isOpen) return null;

  const handleGenerateLessonPlan = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await generateLessonPlan(lessonForm);
      if (res.data?.success) {
        setGeneratedPlan(res.data.data.plan);
        toast.success('Lesson plan generated successfully!');
      } else {
        toast.error(res.data?.message || 'Failed to generate plan');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI Generation error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuestions = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await generateQuestions(questionForm);
      if (res.data?.success) {
        setGeneratedQuestionsData(res.data.data);
        toast.success('Questions generated successfully!');
      } else {
        toast.error(res.data?.message || 'Failed to generate questions');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI Generation error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 border border-primary-100 flex items-center justify-center">
              <HiSparkles className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">Teacher AI Pedagogy Assistant</h3>
              <p className="text-xs text-slate-500">CBSE & State Board Aligned Curriculum Tools</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 flex space-x-6 shrink-0">
          <button
            onClick={() => setActiveTab('lesson')}
            className={`py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'lesson'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FiBookOpen className="w-4 h-4" />
            <span>Lesson Plan Generator</span>
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'questions'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FiHelpCircle className="w-4 h-4" />
            <span>Question Paper & MCQ Generator</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'lesson' ? (
            <div className="space-y-6">
              <form onSubmit={handleGenerateLessonPlan} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Class / Grade</label>
                  <input
                    type="text"
                    value={lessonForm.className}
                    onChange={(e) => setLessonForm({ ...lessonForm, className: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={lessonForm.subject}
                    onChange={(e) => setLessonForm({ ...lessonForm, subject: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Chapter / Topic</label>
                  <input
                    type="text"
                    value={lessonForm.topic}
                    onChange={(e) => setLessonForm({ ...lessonForm, topic: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Learning Objectives</label>
                  <input
                    type="text"
                    value={lessonForm.learningObjectives}
                    onChange={(e) => setLessonForm({ ...lessonForm, learningObjectives: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900"
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-2"
                  >
                    <HiSparkles className="w-4 h-4 text-amber-200" />
                    <span>{loading ? 'Designing Lesson Plan...' : 'Generate Lesson Plan'}</span>
                  </button>
                </div>
              </form>

              {generatedPlan && (
                <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Generated Lesson Plan</span>
                    <button
                      onClick={() => handleCopy(generatedPlan)}
                      className="text-xs text-primary-600 hover:text-primary-800 font-semibold flex items-center space-x-1"
                    >
                      {copied ? <FiCheck className="w-3.5 h-3.5 text-emerald-600" /> : <FiCopy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy Plan'}</span>
                    </button>
                  </div>
                  <div className="p-5 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans bg-white">
                    {generatedPlan}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <form onSubmit={handleGenerateQuestions} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Class</label>
                  <input
                    type="text"
                    value={questionForm.className}
                    onChange={(e) => setQuestionForm({ ...questionForm, className: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={questionForm.subject}
                    onChange={(e) => setQuestionForm({ ...questionForm, subject: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Language</label>
                  <select
                    value={questionForm.language}
                    onChange={(e) => setQuestionForm({ ...questionForm, language: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Topic</label>
                  <input
                    type="text"
                    value={questionForm.topic}
                    onChange={(e) => setQuestionForm({ ...questionForm, topic: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Question Type</label>
                  <select
                    value={questionForm.questionType}
                    onChange={(e) => setQuestionForm({ ...questionForm, questionType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900"
                  >
                    <option value="mcq">Multiple Choice (MCQ)</option>
                    <option value="short">Short Answer</option>
                    <option value="long">Long Answer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Number of Questions</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={questionForm.count}
                    onChange={(e) => setQuestionForm({ ...questionForm, count: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Difficulty</label>
                  <select
                    value={questionForm.difficulty}
                    onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5"
                  >
                    <HiSparkles className="w-4 h-4 text-amber-200" />
                    <span>{loading ? 'Generating...' : 'Create Questions'}</span>
                  </button>
                </div>
              </form>

              {generatedQuestionsData && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {generatedQuestionsData.title}
                    </h4>
                    <button
                      onClick={() => handleCopy(JSON.stringify(generatedQuestionsData.questions, null, 2))}
                      className="text-xs text-primary-600 hover:text-primary-800 font-semibold flex items-center space-x-1"
                    >
                      <FiCopy className="w-3.5 h-3.5" />
                      <span>Copy Questions</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {generatedQuestionsData.questions?.map((q, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex justify-between items-start">
                          <p className="text-xs sm:text-sm font-semibold text-slate-900">
                            Q{idx + 1}. {q.question}
                          </p>
                          <span className="text-[11px] font-mono px-2 py-0.5 bg-primary-100 text-primary-800 rounded">
                            {q.marks || 1} mark
                          </span>
                        </div>
                        {q.options?.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {q.options.map((opt, oIdx) => (
                              <div key={oIdx} className="text-xs p-2 bg-white rounded border border-slate-200 text-slate-700">
                                {opt}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="text-xs text-emerald-700 font-medium pt-1 border-t border-slate-200">
                          <strong>Correct Answer:</strong> {q.correctAnswer}
                          {q.explanation && <span className="text-slate-500 ml-2">({q.explanation})</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
