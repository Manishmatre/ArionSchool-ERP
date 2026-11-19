import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import api from '../../api/axios';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiBook } from 'react-icons/fi';
import { PageLoading, Card, Badge, EmptyState } from '../../components/ui';

const ViewChapters = () => {
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState({});
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [chaptersRes, progressRes] = await Promise.all([
        api.get('/chapters'),
        api.get('/progress/summary'),
      ]);

      setChapters(chaptersRes.data.chapters);

      // Fetch topics for each chapter
      const topicsData = {};
      for (const chapter of chaptersRes.data.chapters) {
        const topicsRes = await api.get('/topics', { params: { chapter: chapter._id } });
        topicsData[chapter._id] = topicsRes.data.topics;
      }
      setTopics(topicsData);

      // Create progress map
      const progressMap = {};
      progressRes.data.chapterProgress.forEach(cp => {
        progressMap[cp.chapter.id] = cp.progressPercentage;
      });
      setProgress(progressMap);
    } catch (error) {
      toast.error('Failed to fetch chapters');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Chapters" subtitle="Browse and learn from available chapters" icon={FiBook} />
        <PageLoading message="Loading chapters..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader title="Chapters" subtitle="Browse and learn from available chapters" icon={FiBook} />

        {chapters.length === 0 ? (
          <Card>
            <EmptyState icon={FiBook} title="No chapters available" description="Please check back later." />
          </Card>
        ) : (
          <div className="space-y-6">
            {chapters.map((chapter) => (
              <Card key={chapter._id} padded={false} className="overflow-hidden">
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-6 text-white">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <h2 className="text-xl md:text-2xl font-bold mb-2">{chapter.title}</h2>
                      <p className="text-primary-100">{chapter.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-3xl font-bold">{progress[chapter._id] || 0}%</div>
                      <div className="text-sm text-primary-100">Complete</div>
                    </div>
                  </div>
                  <div className="mt-4 bg-white/20 rounded-full h-2">
                    <div
                      className="bg-white h-2 rounded-full transition-all"
                      style={{ width: `${progress[chapter._id] || 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Topics</h3>
                  {topics[chapter._id] && topics[chapter._id].length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {topics[chapter._id].map((topic) => (
                        <Link
                          key={topic._id}
                          to={`/student/topic/${topic._id}`}
                          className="border-2 border-slate-200 rounded-xl p-4 hover:border-primary-500 hover:shadow-card transition"
                        >
                          <div className="flex items-start gap-3">
                            <FiBook className="text-primary-600 text-xl mt-1 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-slate-800 mb-1">{topic.title}</h4>
                              <p className="text-sm text-slate-500 line-clamp-2">{topic.description}</p>
                              <div className="mt-2 flex items-center gap-2">
                                {topic.videoUrl && <Badge variant="primary">Video</Badge>}
                                {topic.studyMaterialUrl && <Badge variant="success">Material</Badge>}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-8">No topics available in this chapter</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ViewChapters;
