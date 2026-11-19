import { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Keeps a page's data fresh without the user manually refreshing.
 *
 * It re-runs the provided callback when:
 *  - the browser tab regains focus / becomes visible again
 *  - a polling interval elapses (only while the tab is visible)
 *  - any of the given socket events fire
 *
 * The callback should ideally be a "silent" refetch (i.e. it must NOT toggle a
 * full-page loading spinner) so updates appear seamlessly in the background.
 *
 * @param {Function} callback         Function that refetches the page data.
 * @param {Object}   options
 * @param {number}   options.interval Polling interval in ms while visible (0 disables). Default 25000.
 * @param {string[]} options.events   Socket event names that should trigger a refetch.
 * @param {boolean}  options.enabled  Master switch. Default true.
 * @param {boolean}  options.onFocus  Refetch on tab focus/visibility. Default true.
 * @param {number}   options.minIntervalMs Minimum gap between refetches (dedupes focus+visibility). Default 4000.
 */
export default function useAutoRefresh(callback, options = {}) {
  const {
    interval = 25000,
    events = [],
    enabled = true,
    onFocus = true,
    minIntervalMs = 4000,
  } = options;

  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const lastRunRef = useRef(Date.now());
  const socket = useSocket();
  const eventsKey = events.join(',');

  useEffect(() => {
    if (!enabled) return undefined;

    const run = () => {
      const now = Date.now();
      if (now - lastRunRef.current < minIntervalMs) return;
      lastRunRef.current = now;
      try {
        Promise.resolve(callbackRef.current?.()).catch(() => {});
      } catch {
        /* swallow — background refresh must never crash the page */
      }
    };

    let timer;
    if (interval > 0) {
      timer = setInterval(() => {
        if (document.visibilityState === 'visible') run();
      }, interval);
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') run();
    };
    const handleFocus = () => run();

    if (onFocus) {
      document.addEventListener('visibilitychange', handleVisibility);
      window.addEventListener('focus', handleFocus);
    }

    const socketHandlers = [];
    if (socket && events.length) {
      events.forEach((eventName) => {
        const handler = () => run();
        socket.on(eventName, handler);
        socketHandlers.push([eventName, handler]);
      });
    }

    return () => {
      if (timer) clearInterval(timer);
      if (onFocus) {
        document.removeEventListener('visibilitychange', handleVisibility);
        window.removeEventListener('focus', handleFocus);
      }
      socketHandlers.forEach(([eventName, handler]) => socket?.off(eventName, handler));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, interval, minIntervalMs, onFocus, socket, eventsKey]);
}
