import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import {
  FiPieChart, FiPlus, FiCheckSquare, FiUsers, FiHelpCircle
} from 'react-icons/fi';
import schoolSurveyApi from '../../api/schoolSurveyApi';
import {
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge
} from '../../components/ui';

const SchoolSurveys = () => {
  const [loading, setLoading] = useState(true);
  const [surveys, setSurveys] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    targetAudience: 'parents',
    questions: [
      { questionText: 'How satisfied are you with the academic progress of your child?', questionType: 'rating_5' },
      { questionText: 'How would you rate teacher communication and PTM feedback?', questionType: 'rating_5' },
      { questionText: 'Are the school transport and campus safety measures satisfactory?', questionType: 'yes_no' }
    ]
  });

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    setLoading(true);
    try {
      const res = await schoolSurveyApi.getSurveys();
      setSurveys(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load surveys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await schoolSurveyApi.createSurvey(form);
      toast.success('Satisfaction survey published successfully');
      setShowCreateModal(false);
      setForm({
        title: '',
        description: '',
        targetAudience: 'parents',
        questions: [
          { questionText: 'How satisfied are you with the academic progress of your child?', questionType: 'rating_5' },
          { questionText: 'How would you rate teacher communication and PTM feedback?', questionType: 'rating_5' }
        ]
      });
      loadSurveys();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create survey');
    }
  };

  return (
    <Layout>
      <PageHeader
        title="School Satisfaction Surveys & Feedback"
        subtitle="Collect structured feedback from parents, students, and teachers to continuously enhance educational quality."
      />

      <div className="flex justify-between items-center mb-6">
        <h3 className="text-md font-semibold text-gray-800">
          Published Feedback Surveys
        </h3>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <FiPlus className="w-4 h-4" />
          <span>Create Survey</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {surveys.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-gray-400 text-sm">
            No satisfaction surveys created yet.
          </div>
        ) : (
          surveys.map(s => (
            <div key={s._id} className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider bg-purple-100 text-purple-800">
                  Target: {s.targetAudience}
                </span>
                <StatusBadge
                  status={s.status === 'active' ? 'success' : 'info'}
                  text={s.status?.toUpperCase()}
                />
              </div>

              <h4 className="font-bold text-gray-900 text-base">
                {s.title}
              </h4>
              {s.description && (
                <p className="text-xs text-gray-500 mt-1">
                  {s.description}
                </p>
              )}

              <div className="mt-4 pt-3 border-t space-y-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  Questions ({s.questions?.length || 0})
                </span>
                {s.questions?.map((q, idx) => (
                  <div key={idx} className="text-xs text-gray-600 flex items-start space-x-1.5">
                    <span className="font-bold">{idx + 1}.</span>
                    <span>{q.questionText} ({q.questionType?.replace('_', ' ')})</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t flex justify-between items-center text-xs text-gray-400">
                <span>Total Responses: <strong>{s.responses?.length || 0}</strong></span>
                <span>Created: {new Date(s.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE SURVEY MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Create Satisfaction Survey
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Survey Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Parent Satisfaction Survey 2026-27"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Target Audience
                </label>
                <select
                  value={form.targetAudience}
                  onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                >
                  <option value="parents">Parents</option>
                  <option value="students">Students</option>
                  <option value="teachers">Teachers / Staff</option>
                  <option value="all">Entire Campus Community</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description / Objective
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Publish Survey
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default SchoolSurveys;
