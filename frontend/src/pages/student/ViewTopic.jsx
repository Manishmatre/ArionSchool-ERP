import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { toAbsoluteUrl, getVideoEmbedUrl } from '../../utils/url';
import { toast } from 'react-toastify';
import { FiVideo, FiDownload, FiCheckSquare, FiArrowLeft } from 'react-icons/fi';
import { PageLoading, Card, Badge, Button, EmptyState } from '../../components/ui';

const ViewTopic = () => {
  const { topicId } = useParams();
  const [topic, setTopic] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);

  useEffect(() => {
    fetchTopicData();
  }, [topicId]);

  const fetchTopicData = async () => {
    try {
      const [topicRes, progressRes] = await Promise.all([
        api.get(`/topics/${topicId}`),
        api.get('/progress', { params: { topic: topicId } }),
      ]);

      setTopic(topicRes.data.topic);
      if (progressRes.data.progress.length > 0) {
        setProgress(progressRes.data.progress[0]);
        setVideoProgress(progressRes.data.progress[0].videoWatchedPercentage);
      }
    } catch (error) {
      toast.error('Failed to fetch topic data');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoProgress = async (percentage) => {
    try {
      await api.put(`/progress/video/${topicId}`, { watchedPercentage: percentage });
      setVideoProgress(percentage);
      if (percentage >= 80) {
        toast.success('Video marked as watched!');
      }
    } catch (error) {
      console.error('Error updating video progress:', error);
    }
  };

  const handleDownloadMaterial = async () => {
    try {
      await api.put(`/progress/material/${topicId}`);
      toast.success('Download tracked!');
      fetchTopicData();
    } catch (error) {
      console.error('Error tracking download:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <PageLoading message="Loading topic..." />
      </Layout>
    );
  }

  if (!topic) {
    return (
      <Layout>
        <EmptyState title="Topic not found" description="This topic is not available." />
      </Layout>
    );
  }

  const ProgressPill = ({ active, icon: Icon, label }) => (
    <div className={`p-4 rounded-xl border-2 ${active ? 'bg-success-50 border-success-500' : 'bg-slate-50 border-transparent'}`}>
      <div className="flex items-center gap-2">
        <Icon className={active ? 'text-success-600' : 'text-slate-400'} />
        <span className="font-medium text-slate-700">{label}</span>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="space-y-5">
        <Link
          to="/student/chapters"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <FiArrowLeft />
          <span>Back to Chapters</span>
        </Link>

        <Card>
          <div className="mb-6">
            <Badge variant="primary">{topic.chapter.title}</Badge>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mt-4">{topic.title}</h1>
            <p className="text-slate-600 mt-2">{topic.description}</p>
          </div>

          {/* Progress Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <ProgressPill active={progress?.videoWatched} icon={FiVideo} label={`Video ${progress?.videoWatched ? 'Watched' : 'Not Watched'}`} />
            <ProgressPill active={progress?.materialDownloaded} icon={FiDownload} label={`Material ${progress?.materialDownloaded ? 'Downloaded' : 'Not Downloaded'}`} />
            <ProgressPill active={progress?.quizCompleted} icon={FiCheckSquare} label={`Quiz ${progress?.quizCompleted ? 'Completed' : 'Not Completed'}`} />
          </div>

          {/* Video Section */}
          {topic.videoUrl && (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Video Lecture</h2>
              <div className="bg-slate-900 rounded-xl overflow-hidden aspect-video">
                {getVideoEmbedUrl(topic.videoUrl) ? (
                  <iframe
                    src={getVideoEmbedUrl(topic.videoUrl)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={topic.title}
                    onLoad={() => {
                      const interval = setInterval(() => {
                        setVideoProgress(prev => {
                          const newProgress = Math.min(prev + 10, 100);
                          if (newProgress >= 80 && prev < 80) {
                            handleVideoProgress(newProgress);
                          }
                          if (newProgress === 100) {
                            clearInterval(interval);
                          }
                          return newProgress;
                        });
                      }, 3000);
                    }}
                  ></iframe>
                ) : (
                  <video controls src={toAbsoluteUrl(topic.videoUrl)} className="w-full h-full">
                    Your browser does not support the video tag.
                  </video>
                )}
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-sm text-slate-500 mb-1.5">
                  <span>Video Progress</span>
                  <span className="font-semibold text-primary-600">{videoProgress}%</span>
                </div>
                <div className="bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all"
                    style={{ width: `${videoProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* Study Material Section */}
          {topic.studyMaterialUrl && (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Study Material</h2>
              <div className="border-2 border-slate-200 rounded-xl p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <FiDownload className="text-primary-600 text-2xl flex-shrink-0" />
                    <div>
                      <p className="font-medium text-slate-800">{topic.studyMaterialName || 'Study Material'}</p>
                      <p className="text-sm text-slate-500">Click to download</p>
                    </div>
                  </div>
                  <Button
                    as="a"
                    href={toAbsoluteUrl(topic.studyMaterialUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleDownloadMaterial}
                    icon={FiDownload}
                  >
                    Download
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Take Quiz Button */}
          <div className="border-t border-slate-200 pt-6 flex flex-wrap items-center gap-4">
            <Button as={Link} to={`/student/test?type=topic&topicId=${topicId}`} icon={FiCheckSquare}>
              Take Topic Quiz
            </Button>
            {progress?.quizCompleted && (
              <span className="text-success-600 font-medium">
                ✓ Quiz Completed - Score: {progress.quizScore}%
              </span>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default ViewTopic;
