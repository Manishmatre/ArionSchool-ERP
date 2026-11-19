import React, { useState, useEffect, useRef } from 'react';
import {
  FiMessageSquare, FiX, FiSend, FiTrash2, FiCopy, FiCheck,
  FiCpu, FiInfo, FiRefreshCw
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import { toast } from 'react-toastify';
import { aiAssistantChat, clearAiConversation } from '../../api/aiApi';
import { useBranding } from '../../context/BrandingContext';

const SUGGESTED_PROMPTS = [
  'How many students are absent today?',
  'Show pending fee collection summary',
  'Which classes have the highest attendance?',
  'Summarize this month admissions',
  'Draft an urgent notice for parents'
];

export default function AiAssistantDrawer() {
  const { branding, schoolName } = useBranding();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I am **SES Copilot**, your school AI assistant for **${schoolName || 'SES Educare'}**. How can I help you today with attendance, fee insights, or academic operations?`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await aiAssistantChat({
        message: text,
        conversationId,
        schoolName: schoolName || branding?.schoolName || 'SES Educare'
      });

      if (response.data?.success) {
        setConversationId(response.data.conversationId);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: response.data.reply }
        ]);
      } else {
        toast.error(response.data?.message || 'Failed to get AI response');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'AI assistant is temporarily unavailable';
      toast.error(errorMsg);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Error:** ${errorMsg}. Please check backend AI configuration in Settings.`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success('Copied to clipboard');
  };

  const handleClear = async () => {
    if (conversationId) {
      try {
        await clearAiConversation(conversationId);
      } catch (e) {}
    }
    setMessages([
      {
        role: 'assistant',
        content: `Conversation cleared. How can I help you today?`
      }
    ]);
    toast.info('Chat history cleared');
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{ backgroundColor: 'rgb(var(--brand-600))' }}
          className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 px-4 py-3 hover:brightness-95 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 group ring-2 ring-white/25"
          title="Open SES AI Copilot"
        >
          <div className="relative">
            <HiSparkles className="w-5 h-5 animate-pulse text-amber-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-primary-600" />
          </div>
          <span className="font-semibold text-sm tracking-wide pr-1">SES AI</span>
        </button>
      )}

      {/* Slide-out Drawer Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 z-10 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-xs">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 border border-primary-100 flex items-center justify-center shadow-xs">
                  <HiSparkles className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 tracking-tight flex items-center space-x-2">
                    <span>SES AI Assistant</span>
                    <span className="px-2 py-0.5 text-[10px] bg-primary-50 text-primary-700 font-mono font-medium rounded-full border border-primary-200">
                      GPT-OSS
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate max-w-[220px]">
                    {schoolName || 'SES Educare Management ERP'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={handleClear}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  title="Clear Conversation"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Suggested Prompts Pill Bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 overflow-x-auto no-scrollbar flex space-x-2">
              {SUGGESTED_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  disabled={loading}
                  className="text-xs bg-white text-slate-700 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-300 border border-slate-200 px-2.5 py-1 rounded-full whitespace-nowrap shadow-2xs transition font-medium"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
              {messages.map((m, idx) => {
                const isUser = m.role === 'user';
                return (
                  <div
                    key={idx}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                        isUser
                          ? 'bg-primary-600 text-white rounded-br-xs'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                      }`}
                    >
                      <div className="whitespace-pre-wrap font-sans">
                        {m.content}
                      </div>

                      {!isUser && (
                        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                          <span className="flex items-center space-x-1">
                            <FiCpu className="w-3 h-3 text-primary-500" />
                            <span>Verified ERP Data</span>
                          </span>
                          <button
                            onClick={() => handleCopy(m.content, idx)}
                            className="flex items-center space-x-1 hover:text-slate-700 font-medium"
                          >
                            {copiedIndex === idx ? (
                              <>
                                <FiCheck className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-600">Copied</span>
                              </>
                            ) : (
                              <>
                                <FiCopy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center space-x-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-xl px-4 py-3 max-w-[200px] shadow-2xs">
                  <FiRefreshCw className="w-3.5 h-3.5 animate-spin text-primary-600" />
                  <span className="font-medium">Analyzing records...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about attendance, pending fees, student summaries..."
                className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 placeholder:text-slate-400"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition"
              >
                <FiSend className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
