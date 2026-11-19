import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Dimensions,
  Platform,
  Share
} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, shadows } from '../../config/theme';
import api, { getHostUrl } from '../../config/api';
import { useAuth } from '../../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_HEIGHT = Math.round(SCREEN_WIDTH * (9 / 16));

// Fallback high-quality educational demo stream if a course/topic video is missing
const DEFAULT_DEMO_VIDEO = 'https://www.youtube.com/watch?v=kqtD5dpn9C8'; // Python / Computer Science foundational lecture

// Format seconds into MM:SS
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

// Robust YouTube ID extractor (supporting watch, youtu.be, embed, shorts, and query params)
const extractYouTubeId = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match && match[1] ? match[1] : null;
};

export default function CourseLearnScreen({ route, navigation }) {
  const { user, student } = useAuth();
  const { course } = route.params || {};

  // Compute 4-digit masked watermark for security tracing
  const studentIdRaw =
    student?.studentId ||
    user?.studentDetails?.studentId ||
    user?.studentId ||
    user?.enrollmentNumber ||
    student?.enrollmentNumber ||
    user?._id ||
    '';
  const cleanId = String(studentIdRaw).replace(/[^a-zA-Z0-9]/g, '');
  const last4 = cleanId.length >= 4 ? cleanId.slice(-4) : cleanId.padStart(4, '0');
  const watermarkText = `SES • ****-${last4}`;
  const initialCourse = course?.course && typeof course.course === 'object' ? course.course : course;
  const courseId = initialCourse?._id || initialCourse?.id || course?._id;

  const [courseDetails, setCourseDetails] = useState(initialCourse || null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completedTopics, setCompletedTopics] = useState(new Set());
  const [expandedChapters, setExpandedChapters] = useState({ 0: true });
  const [activeTab, setActiveTab] = useState('curriculum'); // 'curriculum' | 'overview' | 'notes'

  // Video Player & Time Tracking state
  const [activeTopic, setActiveTopic] = useState(null);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [playerKey, setPlayerKey] = useState(1);
  const [videoLoading, setVideoLoading] = useState(true);

  // Real-time playback metrics
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [watchPercentage, setWatchPercentage] = useState(0);
  const [initialStartTime, setInitialStartTime] = useState(0);
  const [canMarkComplete, setCanMarkComplete] = useState(false);
  const [showResumeNotice, setShowResumeNotice] = useState(false);
  const [resumeTimeText, setResumeTimeText] = useState('00:00');
  const [hasEmbedError, setHasEmbedError] = useState(false);
  const lastSaveTimeRef = useRef(0);

  // 1. Fetch full course details & curriculum chapters
  const loadCourseData = useCallback(async () => {
    if (!courseId) {
      setLoading(false);
      return;
    }

    try {
      let fullCourse = null;
      let chapterList = [];

      // A. Course details
      try {
        const cRes = await api.get(`/courses/${courseId}`);
        if (cRes.data && cRes.data.success) {
          fullCourse = cRes.data.data;
          setCourseDetails(fullCourse);
        }
      } catch (e) {
        console.warn('Course fetch error:', e?.message);
      }

      // B. Modern Modules & Lessons (First Priority)
      try {
        const modRes = await api.get('/modules', { params: { course: courseId } });
        const rawMods = modRes.data?.data || modRes.data || [];
        if (Array.isArray(rawMods) && rawMods.length > 0) {
          const populatedMods = await Promise.all(
            rawMods.map(async (m) => {
              try {
                const lRes = await api.get('/lessons', { params: { module: m._id } });
                const rawLessons = lRes.data?.data || lRes.data || [];
                return {
                  ...m,
                  title: m.title || m.name,
                  topics: Array.isArray(rawLessons) ? rawLessons : [],
                };
              } catch {
                return { ...m, topics: [] };
              }
            })
          );
          if (populatedMods.some((m) => m.topics.length > 0)) {
            chapterList = populatedMods;
          }
        }
      } catch (e) {
        console.warn('Modules fetch error:', e?.message);
      }

      // C. Legacy Chapters from Chapter collection
      if (chapterList.length === 0) {
        try {
          const chRes = await api.get('/chapters', { params: { course: courseId } });
          if (chRes.data && chRes.data.success) {
            const rawCh = chRes.data.chapters || chRes.data.data || [];
            if (Array.isArray(rawCh) && rawCh.length > 0) {
              const populated = await Promise.all(
                rawCh.map(async (ch) => {
                  try {
                    const tRes = await api.get('/topics', { params: { chapter: ch._id } });
                    const rawTopics = tRes.data?.topics || tRes.data?.data || [];
                    return {
                      ...ch,
                      topics: Array.isArray(rawTopics) ? rawTopics : [],
                    };
                  } catch {
                    return ch;
                  }
                })
              );
              chapterList = populated;
            }
          }
        } catch (e) {
          console.warn('Chapters fetch error:', e?.message);
        }
      }

      // D. Embedded course.curriculum fallback
      if (chapterList.length === 0 && fullCourse?.curriculum && Array.isArray(fullCourse.curriculum)) {
        chapterList = fullCourse.curriculum;
      }

      // Normalize chapters and topic fields
      const normalizedChapters = chapterList.map((ch, chIdx) => ({
        ...ch,
        title: ch.title || ch.name || `Chapter ${chIdx + 1}`,
        topics: (Array.isArray(ch.topics) ? ch.topics : []).map((t, tIdx) => ({
          ...t,
          _id: t._id || `${ch._id || chIdx}_${tIdx}`,
          title: t.title || t.topicTitle || t.name || `Lesson ${tIdx + 1}`,
          videoUrl: t.videoUrl || t.url || '',
          pdfUrl: t.documentUrl || t.pdfUrl || t.materialUrl || '',
          duration: t.duration || 15,
        })),
      }));

      setChapters(normalizedChapters);

      // Auto-select first lesson with video or first topic
      let firstPlayable = null;
      let firstChIdx = 0;

      for (let i = 0; i < normalizedChapters.length; i++) {
        const ch = normalizedChapters[i];
        if (ch.topics && ch.topics.length > 0) {
          const withVideo = ch.topics.find((t) => !!t.videoUrl);
          if (withVideo) {
            firstPlayable = withVideo;
            firstChIdx = i;
            break;
          }
          if (!firstPlayable) {
            firstPlayable = ch.topics[0];
            firstChIdx = i;
          }
        }
      }

      if (firstPlayable) {
        setActiveTopic(firstPlayable);
        setActiveChapterIndex(firstChIdx);
        // Check for previously saved watch position
        AsyncStorage.getItem(`@ses_video_time_${courseId}_${firstPlayable._id}`).then((saved) => {
          if (saved) {
            const parsed = parseFloat(saved);
            if (!isNaN(parsed) && parsed > 3) {
              setInitialStartTime(Math.floor(parsed));
              setResumeTimeText(formatTime(Math.floor(parsed)));
              setShowResumeNotice(true);
              setTimeout(() => setShowResumeNotice(false), 3500);
            }
          }
        }).catch(() => {});
      } else if (fullCourse?.videoUrl) {
        setActiveTopic({
          _id: 'course_intro',
          title: `${fullCourse.title || 'Course'} - Introduction`,
          videoUrl: fullCourse.videoUrl,
          duration: 10,
        });
      }

      // D. Fetch student progress
      try {
        const pRes = await api.get('/progress', { params: { course: courseId } });
        if (pRes.data && pRes.data.success) {
          const list = pRes.data.progress || [];
          const doneSet = new Set(
            list.filter((p) => p.isCompleted || (p.watchedPercentage || 0) >= 90).map((p) => p.topic?._id || p.topic)
          );
          setCompletedTopics(doneSet);
        }
      } catch (pErr) {
        console.warn('Progress fetch error:', pErr?.message);
      }
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadCourseData();
  }, [loadCourseData]);

  // Flattened topic list for Next/Previous lesson navigation
  const allFlattenedTopics = useMemo(() => {
    const list = [];
    chapters.forEach((ch, chIdx) => {
      (ch.topics || []).forEach((top) => {
        list.push({ ...top, chapterIndex: chIdx, chapterTitle: ch.title });
      });
    });
    return list;
  }, [chapters]);

  const currentTopicIndex = useMemo(() => {
    if (!activeTopic) return -1;
    return allFlattenedTopics.findIndex((t) => t._id === activeTopic._id);
  }, [activeTopic, allFlattenedTopics]);

  const toggleChapter = (index) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const selectTopicToPlay = async (topic, chIdx) => {
    setActiveTopic(topic);
    setActiveChapterIndex(chIdx);
    setVideoLoading(true);
    setCurrentTime(0);
    setDuration(0);
    setWatchPercentage(0);
    setHasEmbedError(false);

    const isDone = completedTopics.has(topic._id);
    setCanMarkComplete(isDone);

    let startSec = 0;
    try {
      const saved = await AsyncStorage.getItem(`@ses_video_time_${courseId}_${topic._id}`);
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed > 3) {
          startSec = Math.floor(parsed);
          setResumeTimeText(formatTime(startSec));
          setShowResumeNotice(true);
          setTimeout(() => setShowResumeNotice(false), 3500);
        }
      }
    } catch {}

    setInitialStartTime(startSec);
    setPlayerKey((k) => k + 1);
  };

  const handleNextLesson = () => {
    if (currentTopicIndex >= 0 && currentTopicIndex < allFlattenedTopics.length - 1) {
      const next = allFlattenedTopics[currentTopicIndex + 1];
      selectTopicToPlay(next, next.chapterIndex);
      setExpandedChapters((prev) => ({ ...prev, [next.chapterIndex]: true }));
    } else {
      Alert.alert('Course Completed', 'You have reached the final lesson of this course! You are ready to take your assessment exam.');
    }
  };

  const handlePrevLesson = () => {
    if (currentTopicIndex > 0) {
      const prev = allFlattenedTopics[currentTopicIndex - 1];
      selectTopicToPlay(prev, prev.chapterIndex);
      setExpandedChapters((prev) => ({ ...prev, [prev.chapterIndex]: true }));
    }
  };

  const handleToggleTopicComplete = async (topicId) => {
    const isCompleted = completedTopics.has(topicId);

    // Enforce video completion requirement (no mark complete until full video is watched)
    if (!isCompleted && !canMarkComplete && watchPercentage < 85) {
      Alert.alert(
        'Video Incomplete',
        `Please watch at least 85% of this video lesson before you can mark it as complete.\n\nCurrent Progress: ${watchPercentage}% watched.\n\nKeep watching to unlock!`,
        [{ text: 'Continue Watching', style: 'default' }]
      );
      return;
    }

    const updated = new Set(completedTopics);
    if (isCompleted) {
      Alert.alert(
        'Reset Completion?',
        'Do you want to mark this lesson as incomplete?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reset',
            style: 'destructive',
            onPress: async () => {
              updated.delete(topicId);
              setCompletedTopics(new Set(updated));
              try {
                await api.put(`/progress/video/${topicId}`, { watchedPercentage: 0 });
              } catch {}
            },
          },
        ]
      );
      return;
    } else {
      updated.add(topicId);
      setCompletedTopics(updated);
      Alert.alert('Lesson Completed! 🎉', 'Your progress has been saved.');
      try {
        await api.put(`/progress/video/${topicId}`, { watchedPercentage: 100 });
      } catch {
        try {
          await api.post(`/courses/${courseId}/topics/${topicId}/complete`);
        } catch {}
      }
    }
  };

  const handlePlayerMessage = useCallback(
    async (event) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.event === 'ready') {
          setVideoLoading(false);
          setHasEmbedError(false);
          if (data.resumedAt && data.resumedAt > 3) {
            setShowResumeNotice(true);
            setTimeout(() => setShowResumeNotice(false), 3500);
          }
        } else if (data.event === 'error') {
          console.warn('Player embed restricted, error code:', data.code);
          setVideoLoading(false);
          setHasEmbedError(true);
          // Unlock completion so student can watch on YouTube app and not be blocked
          setCanMarkComplete(true);
        } else if (data.event === 'timeupdate') {
          const cur = Math.floor(data.currentTime || 0);
          const dur = Math.floor(data.duration || 0);
          const pct = Math.min(100, Math.max(0, data.percent || 0));

          setCurrentTime(cur);
          if (dur > 0) setDuration(dur);
          setWatchPercentage(pct);

          if (pct >= 85 || (activeTopic && completedTopics.has(activeTopic._id))) {
            setCanMarkComplete(true);
          }

          // Debounced save in AsyncStorage & backend every 3 seconds
          const now = Date.now();
          if (now - lastSaveTimeRef.current > 3000 && activeTopic?._id) {
            lastSaveTimeRef.current = now;
            AsyncStorage.setItem(
              `@ses_video_time_${courseId}_${activeTopic._id}`,
              String(cur)
            ).catch(() => {});

            if (pct >= 80 && !completedTopics.has(activeTopic._id)) {
              api.put(`/progress/video/${activeTopic._id}`, { watchedPercentage: pct }).catch(() => {});
            }
          }
        } else if (data.event === 'ended') {
          setWatchPercentage(100);
          setCanMarkComplete(true);
          if (activeTopic?._id) {
            AsyncStorage.setItem(`@ses_video_time_${courseId}_${activeTopic._id}`, '0').catch(() => {});
            try {
              await api.put(`/progress/video/${activeTopic._id}`, { watchedPercentage: 100 });
              setCompletedTopics((prev) => new Set([...prev, activeTopic._id]));
            } catch {}
          }
        }
      } catch {}
    },
    [activeTopic, courseId, completedTopics]
  );

  const openMaterial = (url) => {
    if (!url) return;
    const fullUrl = url.startsWith('http') ? url : `${getHostUrl()}${url.startsWith('/') ? '' : '/'}${url}`;
    Linking.openURL(fullUrl).catch(() => {
      Alert.alert('Notice', 'Unable to open file in external reader.');
    });
  };

  const handleShareCourse = async () => {
    try {
      await Share.share({
        message: `I am learning ${courseDetails?.title || 'this course'} on SES Educare!`,
      });
    } catch {}
  };

  // Generate responsive HTML5 / YouTube / Vimeo embed with Iframe API time tracking
  const currentVideoUrl = activeTopic?.videoUrl || courseDetails?.videoUrl || DEFAULT_DEMO_VIDEO;

  const getVideoHtml = (rawUrl, startSec, wmText = watermarkText) => {
    const url = rawUrl || DEFAULT_DEMO_VIDEO;
    const initialStart = Math.floor(startSec || 0);

    // 1. YouTube Match
    const ytId = extractYouTubeId(url);
    if (ytId) {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <meta name="referrer" content="strict-origin-when-cross-origin">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              html, body { width: 100%; height: 100%; background: #000000; overflow: hidden; }
              #player-box { position: relative; width: 100%; height: 100%; }
              iframe { width: 100%; height: 100%; border: 0; }
              #lesson-complete-overlay {
                display: none;
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(15, 23, 42, 0.94);
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: #ffffff;
                z-index: 50;
                text-align: center;
                padding: 16px;
              }
              .comp-badge {
                font-size: 32px;
                margin-bottom: 8px;
              }
              .comp-title {
                font-size: 16px;
                font-weight: 800;
                color: #ffffff;
                margin-bottom: 4px;
              }
              .comp-sub {
                font-size: 12px;
                color: #94a3b8;
                margin-bottom: 16px;
              }
              
              @keyframes floatWm {
                0% { top: 10%; left: 8%; }
                20% { top: 65%; left: 18%; }
                40% { top: 25%; left: 70%; }
                60% { top: 72%; left: 55%; }
                80% { top: 35%; left: 25%; }
                100% { top: 10%; left: 8%; }
              }
              .single-moving-wm {
                position: absolute;
                animation: floatWm 26s infinite ease-in-out;
                pointer-events: none;
                z-index: 45;
                padding: 3px 8px;
                background: rgba(0, 0, 0, 0.25);
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 6px;
                color: rgba(255, 255, 255, 0.35);
                font-family: monospace, sans-serif;
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 1.5px;
                user-select: none;
                -webkit-user-select: none;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
              }

              .replay-btn {
                background: #2563eb;
                color: #ffffff;
                border: none;
                padding: 9px 20px;
                border-radius: 20px;
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
              }
            </style>
          </head>
          <body>
            <div id="player-box">
              <iframe
                id="player"
                src="https://www.youtube-nocookie.com/embed/${ytId}?enablejsapi=1&autoplay=1&playsinline=1&rel=0&modestbranding=1&controls=1&showinfo=0&iv_load_policy=3&disablekb=0&fs=1"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen>
              </iframe>

              <div class="single-moving-wm">${wmText}</div>

              <div id="lesson-complete-overlay">
                <div class="comp-badge">🎓</div>
                <div class="comp-title">Lecture Completed!</div>
                <div class="comp-sub">Great job! You have completed this lesson.</div>
                <button class="replay-btn" onclick="replayLecture()">Replay Video</button>
              </div>
            </div>
            <script>
              var tag = document.createElement('script');
              tag.src = "https://www.youtube.com/iframe_api";
              var firstScriptTag = document.getElementsByTagName('script')[0];
              firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

              var player;
              var pollTimer = null;
              var startAt = ${initialStart};

              function sendMsg(obj) {
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                  window.ReactNativeWebView.postMessage(JSON.stringify(obj));
                }
              }

              function replayLecture() {
                var overlay = document.getElementById('lesson-complete-overlay');
                if (overlay) overlay.style.display = 'none';
                try {
                  if (player && player.seekTo) {
                    player.seekTo(0, true);
                    player.playVideo();
                  }
                } catch(e){}
              }

              function onYouTubeIframeAPIReady() {
                try {
                  player = new YT.Player('player', {
                    events: {
                      'onReady': onPlayerReady,
                      'onStateChange': onPlayerStateChange,
                      'onError': onPlayerError
                    }
                  });
                } catch(e) {
                  startPolling();
                }
              }

              function onPlayerReady(event) {
                try {
                  if (startAt > 0 && player && player.seekTo) {
                    player.seekTo(startAt, true);
                  }
                  if (player && player.playVideo) {
                    player.playVideo();
                  }
                } catch(e){}
                sendMsg({ event: 'ready', resumedAt: startAt });
                startPolling();
              }

              function onPlayerStateChange(event) {
                if (event.data === YT.PlayerState.PLAYING) {
                  startPolling();
                } else if (event.data === YT.PlayerState.PAUSED) {
                  stopPolling();
                  reportProgress();
                } else if (event.data === YT.PlayerState.ENDED) {
                  stopPolling();
                  // Suppress YouTube suggested videos screen by seeking to 0, pausing and showing clean overlay
                  try {
                    player.seekTo(0, true);
                    player.pauseVideo();
                  } catch(e){}
                  var overlay = document.getElementById('lesson-complete-overlay');
                  if (overlay) overlay.style.display = 'flex';
                  sendMsg({ event: 'ended', percent: 100 });
                }
              }

              function onPlayerError(err) {
                sendMsg({ event: 'error', code: err.data });
              }

              function startPolling() {
                if (pollTimer) clearInterval(pollTimer);
                pollTimer = setInterval(reportProgress, 1000);
              }

              function stopPolling() {
                if (pollTimer) {
                  clearInterval(pollTimer);
                  pollTimer = null;
                }
              }

              function reportProgress() {
                if (player && typeof player.getCurrentTime === 'function' && typeof player.getDuration === 'function') {
                  var cur = player.getCurrentTime() || 0;
                  var dur = player.getDuration() || 0;
                  if (dur > 0) {
                    var pct = Math.min(100, Math.round((cur / dur) * 100));
                    sendMsg({
                      event: 'timeupdate',
                      currentTime: cur,
                      duration: dur,
                      percent: pct
                    });
                  }
                }
              }
            </script>
          </body>
        </html>
      `;
    }

    // 2. Vimeo Match
    const vimeoMatch = url.match(
      /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/
    );
    if (vimeoMatch && vimeoMatch[3]) {
      const vimeoId = vimeoMatch[3];
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              html, body { width: 100%; height: 100%; background: #000000; overflow: hidden; }
              iframe { width: 100%; height: 100%; border: 0; }
            </style>
          </head>
          <body>
            <iframe id="vf" src="https://player.vimeo.com/video/${vimeoId}?autoplay=1#t=${initialStart}s" allow="autoplay; fullscreen" allowfullscreen></iframe>
            <script src="https://player.vimeo.com/api/player.js"></script>
            <script>
              function sendMsg(obj) {
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                  window.ReactNativeWebView.postMessage(JSON.stringify(obj));
                }
              }
              try {
                var player = new Vimeo.Player(document.getElementById('vf'));
                player.on('timeupdate', function(data) {
                  sendMsg({
                    event: 'timeupdate',
                    currentTime: data.seconds,
                    duration: data.duration,
                    percent: Math.min(100, Math.round(data.percent * 100))
                  });
                });
                player.on('ended', function() {
                  sendMsg({ event: 'ended', percent: 100 });
                });
              } catch(e){}
            </script>
          </body>
        </html>
      `;
    }

    // 3. Direct HTML5 Video (MP4 / WebM / server upload)
    const mediaUrl = url.startsWith('http') ? url : `${getHostUrl()}${url.startsWith('/') ? '' : '/'}${url}`;
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: 100%; height: 100%; background: #000000; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; }
            video { width: 100%; height: 100%; max-height: 100%; object-fit: contain; }
            @keyframes floatWm {
              0% { top: 10%; left: 8%; }
              20% { top: 65%; left: 18%; }
              40% { top: 25%; left: 70%; }
              60% { top: 72%; left: 55%; }
              80% { top: 35%; left: 25%; }
              100% { top: 10%; left: 8%; }
            }
            .single-moving-wm {
              position: absolute;
              animation: floatWm 26s infinite ease-in-out;
              pointer-events: none;
              z-index: 45;
              padding: 3px 8px;
              background: rgba(0, 0, 0, 0.25);
              border: 1px solid rgba(255, 255, 255, 0.12);
              border-radius: 6px;
              color: rgba(255, 255, 255, 0.35);
              font-family: monospace, sans-serif;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 1.5px;
              user-select: none;
              -webkit-user-select: none;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
          </style>
        </head>
        <body>
          <video id="v" controls autoplay playsinline webkit-playsinline>
            <source src="${mediaUrl}" type="video/mp4">
            Video format not supported.
          </video>

          <div class="single-moving-wm">${wmText}</div>

          <script>
            var v = document.getElementById('v');
            var startAt = ${initialStart};

            function sendMsg(obj) {
              if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                window.ReactNativeWebView.postMessage(JSON.stringify(obj));
              }
            }

            v.addEventListener('loadedmetadata', function() {
              if (startAt > 0 && startAt < v.duration) {
                v.currentTime = startAt;
              }
              sendMsg({ event: 'ready', resumedAt: startAt, duration: v.duration });
            });

            v.addEventListener('timeupdate', function() {
              if (v.duration > 0) {
                var pct = Math.min(100, Math.round((v.currentTime / v.duration) * 100));
                sendMsg({
                  event: 'timeupdate',
                  currentTime: v.currentTime,
                  duration: v.duration,
                  percent: pct
                });
              }
            });

            v.addEventListener('ended', function() {
              sendMsg({ event: 'ended', percent: 100 });
            });
          </script>
        </body>
      </html>
    `;
  };

  const totalTopicsCount = allFlattenedTopics.length;
  const completedCount = completedTopics.size;
  const progressPercent = totalTopicsCount > 0 ? Math.round((completedCount / totalTopicsCount) * 100) : 0;
  const isCurrentDone = activeTopic ? completedTopics.has(activeTopic._id) : false;

  return (
    <View style={styles.container}>
      {/* 1. DOCKED IN-APP VIDEO PLAYER */}
      <View style={styles.playerContainer}>
        <WebView
          key={`player_${activeTopic?._id || ''}_${currentVideoUrl}_${playerKey}`}
          style={styles.webview}
          source={{ html: getVideoHtml(currentVideoUrl, initialStartTime, watermarkText), baseUrl: 'https://seseducare.com' }}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          allowsFullscreenVideo
          originWhitelist={['*']}
          mixedContentMode="always"
          userAgent="Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
          onMessage={handlePlayerMessage}
          onLoadEnd={() => setVideoLoading(false)}
          onShouldStartLoadWithRequest={(request) => {
            // Allow essential embed & playback resources, strictly block youtube.com/watch redirection
            if (
              request.url.includes('youtube-nocookie.com/embed') ||
              request.url.includes('youtube.com/embed') ||
              request.url.includes('googlevideo.com') ||
              request.url.includes('ytimg.com') ||
              request.url.startsWith('data:') ||
              request.url.startsWith('about:blank') ||
              request.url.includes('seseducare.com')
            ) {
              return true;
            }
            // Block external opening / redirection
            return false;
          }}
        />


        {/* In-Player Fallback for restricted YouTube videos */}
        {hasEmbedError && (
          <View style={styles.embedErrorOverlay}>
            <Ionicons name="alert-circle-outline" size={32} color="#f59e0b" />
            <Text style={styles.embedErrorTitle}>YouTube Playback Notice</Text>
            <Text style={styles.embedErrorSub}>
              This lecture has YouTube third-party playback restrictions. You can watch directly on YouTube with 1 tap:
            </Text>
            <TouchableOpacity
              style={styles.openYtBigBtn}
              onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${extractYouTubeId(currentVideoUrl)}`)}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-youtube" size={18} color="#ffffff" />
              <Text style={styles.openYtBigText}>Watch on YouTube App</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Floating Resumed Timestamp Toast */}
        {showResumeNotice && !hasEmbedError && (
          <View style={styles.resumeToast}>
            <Ionicons name="refresh-circle" size={16} color="#4ade80" />
            <Text style={styles.resumeToastText}>Resumed from {resumeTimeText}</Text>
          </View>
        )}

        {videoLoading && !hasEmbedError && (
          <View style={styles.playerOverlayLoader}>
            <ActivityIndicator size="small" color="#ffffff" />
            <Text style={styles.loadingVideoText}>Loading Lecture Video...</Text>
          </View>
        )}
      </View>

      {/* LIVE TIME TRACKER & PROGRESS BAR */}
      <View style={styles.timeTrackerBar}>
        <View style={styles.progressTrackBg}>
          <View
            style={[
              styles.progressTrackFill,
              { width: `${isCurrentDone ? 100 : Math.max(watchPercentage, 2)}%` },
              isCurrentDone && { backgroundColor: '#16a34a' }
            ]}
          />
        </View>
        <View style={styles.timeMetaRow}>
          <View style={styles.timeClockBox}>
            <Ionicons name="time-outline" size={13} color={colors.primary} />
            <Text style={styles.timeClockText}>
              {formatTime(currentTime)} / {formatTime(duration || (activeTopic?.duration ? activeTopic.duration * 60 : 0))}
            </Text>
          </View>
          <View
            style={[
              styles.watchStatusBadge,
              isCurrentDone
                ? styles.watchStatusDone
                : canMarkComplete
                ? styles.watchStatusUnlocked
                : styles.watchStatusLocked,
            ]}
          >
            <Ionicons
              name={isCurrentDone ? 'checkmark-circle' : canMarkComplete ? 'lock-open' : 'lock-closed'}
              size={12}
              color={isCurrentDone || canMarkComplete ? '#15803d' : '#64748b'}
            />
            <Text
              style={[
                styles.watchStatusText,
                (isCurrentDone || canMarkComplete) && { color: '#15803d', fontWeight: '700' },
              ]}
            >
              {isCurrentDone
                ? '100% Completed'
                : canMarkComplete
                ? `Complete Unlocked (${watchPercentage}%)`
                : `Watch 85% to Unlock (${watchPercentage}%)`}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. PLAYER CONTROL & LESSON TITLE BAR */}
      <View style={styles.playerInfoBar}>
        <View style={styles.nowPlayingRow}>
          <View style={styles.playingTag}>
            <Ionicons name="play-circle" size={14} color="#ffffff" />
            <Text style={styles.playingTagText}>
              LESSON {currentTopicIndex >= 0 ? currentTopicIndex + 1 : 1} OF {totalTopicsCount || 1}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShareCourse}>
              <Ionicons name="share-social-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.activeLessonTitle} numberOfLines={2}>
          {activeTopic?.title || courseDetails?.title || 'Introduction Lesson'}
        </Text>

        {/* Action Controls Row */}
        <View style={styles.actionControlsRow}>
          {/* Previous Lesson */}
          <TouchableOpacity
            style={[styles.navStepBtn, currentTopicIndex <= 0 && styles.navStepBtnDisabled]}
            onPress={handlePrevLesson}
            disabled={currentTopicIndex <= 0}
          >
            <Ionicons name="play-skip-back" size={14} color={currentTopicIndex <= 0 ? '#94a3b8' : colors.primary} />
            <Text style={[styles.navStepText, currentTopicIndex <= 0 && styles.navStepTextDisabled]}>Prev</Text>
          </TouchableOpacity>

          {/* Mark Complete Button with Locked / Unlocked enforcement */}
          {activeTopic && (
            <TouchableOpacity
              style={[
                styles.markCompleteBtn,
                isCurrentDone && styles.markCompleteBtnDone,
                !isCurrentDone && canMarkComplete && styles.markCompleteBtnUnlocked,
                !isCurrentDone && !canMarkComplete && styles.markCompleteBtnLocked,
              ]}
              onPress={() => handleToggleTopicComplete(activeTopic._id)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={
                  isCurrentDone
                    ? 'checkmark-circle'
                    : canMarkComplete
                    ? 'checkmark-circle-outline'
                    : 'lock-closed'
                }
                size={16}
                color={
                  isCurrentDone
                    ? '#ffffff'
                    : canMarkComplete
                    ? '#15803d'
                    : '#64748b'
                }
              />
              <Text
                style={[
                  styles.markCompleteText,
                  isCurrentDone && { color: '#ffffff' },
                  !isCurrentDone && canMarkComplete && { color: '#15803d' },
                  !isCurrentDone && !canMarkComplete && { color: '#64748b' },
                ]}
              >
                {isCurrentDone
                  ? 'Completed'
                  : canMarkComplete
                  ? 'Mark as Done'
                  : `Locked (${watchPercentage}%)`}
              </Text>
            </TouchableOpacity>
          )}

          {/* Next Lesson */}
          <TouchableOpacity
            style={[styles.navStepBtn, currentTopicIndex >= allFlattenedTopics.length - 1 && styles.navStepBtnDisabled]}
            onPress={handleNextLesson}
            disabled={currentTopicIndex >= allFlattenedTopics.length - 1}
          >
            <Text style={[styles.navStepText, currentTopicIndex >= allFlattenedTopics.length - 1 && styles.navStepTextDisabled]}>Next</Text>
            <Ionicons name="play-skip-forward" size={14} color={currentTopicIndex >= allFlattenedTopics.length - 1 ? '#94a3b8' : colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. TABS SELECTOR */}
      <View style={styles.tabsRow}>
        {[
          { key: 'curriculum', label: 'Curriculum', icon: 'list-outline' },
          { key: 'overview', label: 'Overview', icon: 'information-circle-outline' },
          { key: 'notes', label: 'Study Notes', icon: 'document-text-outline' },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.subTab, isActive && styles.subTabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons name={tab.icon} size={15} color={isActive ? colors.primary : colors.textSecondary} />
              <Text style={[styles.subTabText, isActive && styles.subTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 4. TAB CONTENTS */}
      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
        {/* TAB A: CURRICULUM */}
        {activeTab === 'curriculum' && (
          <View>
            {/* Progress summary card */}
            <View style={styles.progressSummaryCard}>
              <View style={styles.progressTextRow}>
                <Text style={styles.progLabel}>Overall Course Progress</Text>
                <Text style={styles.progVal}>{progressPercent}%</Text>
              </View>
              <View style={styles.progTrack}>
                <View style={[styles.progFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.progSub}>
                {completedCount} of {totalTopicsCount} lessons completed
              </Text>
            </View>

            {loading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading course modules...</Text>
              </View>
            ) : chapters.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="folder-open-outline" size={42} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>Curriculum Updating</Text>
                <Text style={styles.emptySub}>
                  Academic trainers are curating new lesson videos and modules for this course.
                </Text>
              </View>
            ) : (
              chapters.map((chapter, chIdx) => {
                const isExpanded = !!expandedChapters[chIdx];
                const chapterTopics = chapter.topics || [];
                const chDone = chapterTopics.filter((t) => completedTopics.has(t._id)).length;

                return (
                  <View key={chapter._id || chIdx} style={styles.chapterCard}>
                    <TouchableOpacity
                      style={styles.chapterHeader}
                      onPress={() => toggleChapter(chIdx)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.chapterNumBox}>
                        <Text style={styles.chapterNumText}>{chIdx + 1}</Text>
                      </View>
                      <View style={{ flex: 1, marginHorizontal: 10 }}>
                        <Text style={styles.chapterTitle} numberOfLines={2}>
                          {chapter.title}
                        </Text>
                        <Text style={styles.chapterSubText}>
                          {chapterTopics.length} Lessons • {chDone}/{chapterTopics.length} Done
                        </Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.topicsList}>
                        {chapterTopics.map((topic, tIdx) => {
                          const isDone = completedTopics.has(topic._id);
                          const isPlaying = activeTopic?._id === topic._id;

                          return (
                            <TouchableOpacity
                              key={topic._id || tIdx}
                              style={[
                                styles.topicItem,
                                isPlaying && styles.topicItemPlaying,
                              ]}
                              onPress={() => selectTopicToPlay(topic, chIdx)}
                              activeOpacity={0.7}
                            >
                              {/* Completion checkbox */}
                              <TouchableOpacity
                                style={styles.checkIconBtn}
                                onPress={() => handleToggleTopicComplete(topic._id)}
                              >
                                <Ionicons
                                  name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
                                  size={22}
                                  color={isDone ? '#16a34a' : '#94a3b8'}
                                />
                              </TouchableOpacity>

                              {/* Lesson title & meta */}
                              <View style={{ flex: 1, marginHorizontal: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  {isPlaying && (
                                    <View style={styles.playingPill}>
                                      <Text style={styles.playingPillText}>PLAYING</Text>
                                    </View>
                                  )}
                                  <Text
                                    style={[
                                      styles.topicName,
                                      isPlaying && styles.topicNamePlaying,
                                      isDone && !isPlaying && styles.topicNameDone,
                                    ]}
                                    numberOfLines={2}
                                  >
                                    {tIdx + 1}. {topic.title}
                                  </Text>
                                </View>

                                <View style={styles.topicMetaRow}>
                                  <Text style={styles.topicDurationText}>
                                    <Ionicons name="time-outline" size={11} color={colors.textMuted} /> {topic.duration || 15} mins
                                  </Text>
                                  {topic.videoUrl ? (
                                    <View style={styles.videoBadge}>
                                      <Ionicons name="videocam" size={11} color={colors.primary} />
                                      <Text style={styles.videoBadgeText}>Video</Text>
                                    </View>
                                  ) : null}
                                  {topic.pdfUrl ? (
                                    <View style={styles.pdfBadge}>
                                      <Ionicons name="document-text" size={11} color="#d97706" />
                                      <Text style={styles.pdfBadgeText}>Notes</Text>
                                    </View>
                                  ) : null}
                                </View>
                              </View>

                              {/* Action buttons */}
                              <View style={styles.topicRightActions}>
                                {topic.pdfUrl ? (
                                  <TouchableOpacity
                                    style={styles.pdfBtn}
                                    onPress={() => openMaterial(topic.pdfUrl)}
                                  >
                                    <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                                  </TouchableOpacity>
                                ) : null}

                                <View style={styles.playArrowBox}>
                                  <Ionicons
                                    name={isPlaying ? 'volume-high' : 'play'}
                                    size={14}
                                    color={isPlaying ? colors.primary : '#94a3b8'}
                                  />
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* TAB B: OVERVIEW */}
        {activeTab === 'overview' && (
          <View style={styles.overviewSection}>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>About This Course</Text>
              <Text style={styles.infoDesc}>
                {courseDetails?.fullDescription ||
                  courseDetails?.description ||
                  'This comprehensive curriculum provides systematic mastery with practical modules, project tutorials, and guided assessments.'}
              </Text>
            </View>

            <View style={styles.gridCard}>
              <Text style={styles.infoTitle}>Course Specifications</Text>

              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Category:</Text>
                <Text style={styles.specVal}>{courseDetails?.category || 'Information Technology'}</Text>
              </View>

              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Duration:</Text>
                <Text style={styles.specVal}>
                  {courseDetails?.durationValue || 3} {courseDetails?.durationType || 'Months'}
                </Text>
              </View>

              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Total Lectures:</Text>
                <Text style={styles.specVal}>{totalTopicsCount || courseDetails?.totalLectures || 24} Sessions</Text>
              </View>

              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Language:</Text>
                <Text style={styles.specVal}>{courseDetails?.language || 'Hindi & English'}</Text>
              </View>

              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Certificate:</Text>
                <Text style={[styles.specVal, { color: '#16a34a', fontWeight: '700' }]}>
                  Verified Digital Certificate
                </Text>
              </View>
            </View>

            {/* Instructor Card */}
            {courseDetails?.instructor && (
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Academic Instructor</Text>
                <View style={styles.instRow}>
                  <View style={styles.instAvatar}>
                    <Ionicons name="person" size={24} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.instName}>
                      {typeof courseDetails.instructor === 'object'
                        ? courseDetails.instructor.name || 'Senior LMS Faculty'
                        : courseDetails.instructor}
                    </Text>
                    <Text style={styles.instBio}>
                      {typeof courseDetails.instructor === 'object'
                        ? courseDetails.instructor.title || 'Subject Matter Specialist'
                        : 'Senior Faculty'}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* TAB C: STUDY NOTES & MATERIALS */}
        {activeTab === 'notes' && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionHeading}>Downloadable Study Materials</Text>
            {allFlattenedTopics.filter((t) => !!t.pdfUrl).length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="document-text-outline" size={42} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>Notes Being Prepared</Text>
                <Text style={styles.emptySub}>
                  PDF reference notes and lecture slides for this course will be uploaded by your trainer.
                </Text>
              </View>
            ) : (
              allFlattenedTopics
                .filter((t) => !!t.pdfUrl)
                .map((t, idx) => (
                  <View key={t._id || idx} style={styles.noteCard}>
                    <View style={styles.noteLeft}>
                      <Ionicons name="document-attach" size={26} color={colors.primary} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.noteTitle} numberOfLines={1}>
                          {t.title}
                        </Text>
                        <Text style={styles.noteSub}>{t.chapterTitle || 'Course Module Notes'}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.openPdfBtn}
                      onPress={() => openMaterial(t.pdfUrl)}
                    >
                      <Ionicons name="download-outline" size={16} color="#ffffff" />
                      <Text style={styles.openPdfText}>View PDF</Text>
                    </TouchableOpacity>
                  </View>
                ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  playerContainer: {
    width: SCREEN_WIDTH,
    height: VIDEO_HEIGHT,
    backgroundColor: '#000000',
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  playerOverlayLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingVideoText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  playerInfoBar: {
    backgroundColor: '#ffffff',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  nowPlayingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  playingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  playingTagText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  shareBtn: {
    padding: 4,
  },
  activeLessonTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  actionControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 8,
  },
  navStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  navStepBtnDisabled: {
    backgroundColor: '#f1f5f9',
  },
  navStepText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  navStepTextDisabled: {
    color: '#94a3b8',
  },
  resumeToast: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  resumeToastText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  timeTrackerBar: {
    backgroundColor: '#ffffff',
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  progressTrackBg: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressTrackFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  timeMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeClockBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeClockText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  watchStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  watchStatusLocked: {
    backgroundColor: '#f1f5f9',
  },
  watchStatusUnlocked: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  watchStatusDone: {
    backgroundColor: '#f0fdf4',
  },
  watchStatusText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  markCompleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.secondary,
    backgroundColor: '#ecfdf5',
  },
  markCompleteBtnDone: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  markCompleteBtnUnlocked: {
    backgroundColor: '#ecfdf5',
    borderColor: '#16a34a',
  },
  markCompleteBtnLocked: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  markCompleteText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondary,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabActive: {
    borderBottomColor: colors.primary,
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  subTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  progressSummaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  progVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  progTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  progFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 6,
  },
  chapterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.sm,
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: '#f8fafc',
  },
  chapterNumBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1e3a8a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterNumText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  chapterTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  chapterSubText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  topicsList: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  topicItemPlaying: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  checkIconBtn: {
    padding: 2,
  },
  playingPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  playingPillText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '700',
  },
  topicName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 18,
  },
  topicNamePlaying: {
    color: colors.primary,
    fontWeight: '700',
  },
  topicNameDone: {
    color: '#64748b',
    textDecorationLine: 'line-through',
  },
  topicMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  topicDurationText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  videoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  videoBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  pdfBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  pdfBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#b45309',
  },
  topicRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pdfBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  playArrowBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  examCard: {
    marginTop: spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
    ...shadows.md,
  },
  examCardInner: {
    padding: spacing.lg,
  },
  examLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  examTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  examSub: {
    fontSize: 12,
    color: '#bfdbfe',
    marginTop: 4,
    lineHeight: 16,
  },
  takeExamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  takeExamBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  overviewSection: {
    gap: spacing.md,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  infoDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  gridCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  specLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  specVal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  instRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  instAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  instBio: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  notesSection: {
    gap: spacing.sm,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  noteLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  noteTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  noteSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  openPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  openPdfText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  centerLoading: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.md,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  embedErrorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    zIndex: 20,
  },
  embedErrorTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  embedErrorSub: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  openYtBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    ...shadows.md,
  },
  openYtBigText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  openYtLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  openYtLinkText: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '700',
  },

  watermarkContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 15,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  watermarkGrid: {
    width: '150%',
    height: '150%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignContent: 'space-around',
    transform: [{ rotate: '-15deg' }],
  },
  watermarkTile: {
    color: '#ffffff',
    opacity: 0.14,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
    letterSpacing: 2,
    margin: 16,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  watermarkBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  watermarkBadgeText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
    fontWeight: '700',
    letterSpacing: 1,
  },
  pageWatermarkChip: {
    alignSelf: 'center',
    marginVertical: spacing.xs,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(15,23,42,0.04)',
  },
  pageWatermarkText: {
    fontSize: 10,
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
    fontWeight: '700',
    color: 'rgba(100,116,139,0.3)',
    letterSpacing: 1.5,
  },
});
