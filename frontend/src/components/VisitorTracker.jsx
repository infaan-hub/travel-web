import { useEffect } from 'react';
import { analyticsAPI } from '../api/axios';

function getSessionId() {
  let sid = localStorage.getItem('session_id');
  if (!sid) {
    sid = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('session_id', sid);
  }
  return sid;
}

export function VisitorTracker() {
  useEffect(() => {
    const track = async () => {
      try {
        const pageUrl = window.location.pathname;
        const sessionId = getSessionId();
        const tourMatch = pageUrl.match(/^\/tours\/(\d+)/);
        await analyticsAPI.trackVisit({
          page_url: pageUrl,
          session_id: sessionId,
          tour_id: tourMatch ? parseInt(tourMatch[1]) : null,
        });
      } catch {
        // silently fail
      }
    };
    track();
  }, []);

  return null;
}
