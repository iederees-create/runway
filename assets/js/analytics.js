import { CONFIG } from './config.js';

const SESSION_KEY = 'runway_analytics_session';
const startedAt = Date.now();
let exitSent = false;

function sessionId() {
  let value = sessionStorage.getItem(SESSION_KEY);
  if (!value) {
    value = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, value);
  }
  return value;
}

function referrerHost() {
  if (!document.referrer) return null;
  try {
    return new URL(document.referrer).hostname;
  } catch {
    return null;
  }
}

function campaign() {
  const params = new URLSearchParams(location.search);
  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
  };
}

function cleanMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => ['string', 'number', 'boolean'].includes(typeof item))
      .slice(0, 12)
      .map(([key, item]) => [key.slice(0, 40), typeof item === 'string' ? item.slice(0, 160) : item]),
  );
}

export async function trackRunwayEvent(eventName, details = {}) {
  const payload = {
    session_id: sessionId(),
    event_name: String(eventName).slice(0, 80),
    page_path: location.pathname,
    target: details.target ? String(details.target).slice(0, 160) : null,
    referrer: referrerHost(),
    screen_resolution: `${window.screen.width}x${window.screen.height}`,
    browser_language: navigator.language,
    duration_seconds: Number.isFinite(details.duration_seconds) ? Math.max(0, Math.round(details.duration_seconds)) : null,
    metadata: cleanMetadata(details.metadata),
    ...campaign(),
  };

  try {
    await fetch(`${CONFIG.supabaseUrl}/rest/v1/runway_events`, {
      method: 'POST',
      keepalive: Boolean(details.keepalive),
      headers: {
        apikey: CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${CONFIG.supabaseAnonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Analytics must never interrupt the visitor's task.
  }
}

function clickTarget(element) {
  if (element.dataset.track) return element.dataset.track;
  if (element.id) return `#${element.id}`;
  if (element instanceof HTMLAnchorElement) {
    try {
      const url = new URL(element.href, location.href);
      return url.origin === location.origin ? url.pathname : url.hostname;
    } catch {
      return 'link';
    }
  }
  return element.tagName.toLowerCase();
}

trackRunwayEvent('page_view');

document.addEventListener('click', (event) => {
  const element = event.target.closest('a,button');
  if (!element) return;
  trackRunwayEvent(element instanceof HTMLAnchorElement ? 'link_click' : 'button_click', {
    target: clickTarget(element),
  });
});

window.addEventListener('pagehide', () => {
  if (exitSent) return;
  exitSent = true;
  trackRunwayEvent('page_exit', {
    duration_seconds: (Date.now() - startedAt) / 1000,
    keepalive: true,
  });
});
