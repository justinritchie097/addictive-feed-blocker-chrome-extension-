let observer3;
let isRunning = false;

const SELECTORS = {
  feed: `ytd-browse[page-subtype="home"] #primary, ytd-rich-grid-renderer`,
  comments: `#sections.ytd-comments, ytd-comments, #comments`,
  sidebar: `#secondary`,
  tiktokfeed: `
    [data-e2e="recommend-list-item-container"],
    div[class*="DivFeedWrapper"],
    main div[class*="DivListContainer"],
    div:has(> [data-e2e="recommend-list-item-container"])
  `,
  redditfeed: `#subgrid-container`,
  hulufeed: `[data-testid="hub-collections-home"]`,
  igfeed: `.xw7yly9`,
  xfeed: `[data-testid="primaryColumn"]`,
  netflixfeed: `[data-uia="carousel-scroller"]`,
};

function matchesUrl(featureKey) {
  const pathname = window.location.pathname;
  const hostname = window.location.hostname;

  switch (featureKey) {
    case 'tiktokfeed':
      return (
        hostname.includes('tiktok.com') &&
        (pathname === '/' ||
          pathname.includes('/foryou') ||
          pathname.includes('/explore') ||
          pathname.includes('/en/'))
      );

    case 'feed':
      if (!hostname.includes('youtube.com')) return false;
      return pathname === '/' || pathname === '/index.html';

    case 'redditfeed':
      if (!hostname.includes('reddit.com')) return false;
      return pathname === '/' || pathname === '';

    case 'xfeed':
      if (!hostname.includes('x.com')) return false;
      return pathname === '/home' || pathname === '';

    case 'netflixfeed':
      return hostname.includes('netflix.com');
    default:
      return true;
  }
}

function updateStyleElement(featureKey, shouldHide) {
  const styleId = `undistract-${featureKey}-style`;
  let styleNode = document.getElementById(styleId);
  const isAllowedOnThisPage = matchesUrl(featureKey);

  if (shouldHide && isAllowedOnThisPage) {
    if (styleNode) return;

    styleNode = document.createElement('style');
    styleNode.id = styleId;
    styleNode.innerHTML = `
      ${SELECTORS[featureKey]} {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        height: 0px !important;
        overflow: hidden !important;
      }
    `;

    const target = document.head || document.documentElement;
    if (target) {
      target.appendChild(styleNode);
    }
  } else {
    if (styleNode) {
      styleNode.remove();
    }
  }
}

function applyStoredStyles() {
  chrome.storage.sync.get(null, (settings) => {
    Object.keys(SELECTORS).forEach((key) => {
      if (settings[key] === true) {
        updateStyleElement(key, true);
      }
    });
  });
}

// --- CUSTOM WORD BLOCKER INTEGRATION ---
let sessionBypassed = false;
let checkTimeout = null;

function checkPage() {
  if (sessionBypassed || !chrome.runtime?.id) return;

  // Pull custom blocked keywords saved by the user via the popup UI
  chrome.storage.local.get(['blockedTerms'], (data) => {
    const blockedTerms = data.blockedTerms || [];
    if (blockedTerms.length === 0 || !document.body) return;

    const pageText = document.body.innerText || '';
    const lowerPageText = pageText.toLowerCase();

    for (const term of blockedTerms) {
      const lowerTerm = term.toLowerCase().trim();
      // Check if the user-typed term exists anywhere in the page text
      if (lowerTerm && lowerPageText.includes(lowerTerm)) {
        showRedAlert(term);
        return;
      }
    }
  });
}

function showRedAlert(matchedTerm) {
  if (document.getElementById('chrome-blocker-alert')) return;

  const overlay = document.createElement('div');
  overlay.id = 'chrome-blocker-alert';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background-color: #dc2626; color: white; z-index: 2147483647;
    display: flex; flex-direction: column; justify-content: center;
    align-items: center; font-family: sans-serif; text-align: center;
    padding: 20px; box-sizing: border-box;
  `;

  overlay.innerHTML = `
    <h1 style="font-size: 3rem; margin-bottom: 10px;">⚠️ Content Blocked</h1>
    <p style="font-size: 1.2rem; margin-bottom: 30px;">This page contains content matching your blocked term: <strong>"${matchedTerm}"</strong></p>
    <div>
      <button id="blocker-back" style="padding: 12px 24px; font-size: 1rem; background: white; color: #dc2626; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; margin-right: 15px;">Go Back</button>
      <button id="blocker-continue" style="padding: 12px 24px; font-size: 1rem; background: transparent; color: white; border: 2px solid white; border-radius: 6px; cursor: pointer; font-weight: bold;">Continue Anyway</button>
    </div>
  `;

  if (document.body) {
    document.body.appendChild(overlay);
  } else {
    document.documentElement.appendChild(overlay);
  }

  document.getElementById('blocker-back').onclick = () => window.history.back();
  document.getElementById('blocker-continue').onclick = () => {
    sessionBypassed = true;
    overlay.remove();
  };
}

function startExtension() {
  function checkYouTubeRedirect() {
    if (!window.location.hostname.includes('youtube.com')) return;

    const pathname = window.location.pathname;
    const isHome = pathname === '/' || pathname === '/index.html';
    if (!isHome) return;

    chrome.storage.sync.get(['feed'], (settings) => {
      // If the feed blocker is active and they are on the home page, redirect
      if (settings.feed === true) {
        window.location.replace('https://www.youtube.com/feed/subscriptions');
      }
    });
  }
  if (isRunning) return;
  isRunning = true;

  console.log('Extension is active');
  applyStoredStyles();

  // SPA URL change & DOM Mutation Observer
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      sessionBypassed = false;
      setTimeout(applyStoredStyles, 200);
    }
    checkYouTubeRedirect();
    applyStoredStyles();

    if (!sessionBypassed) {
      clearTimeout(checkTimeout);
      checkTimeout = setTimeout(() => {
        checkPage();
      }, 250);
    }
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
    });
  }
  observer3 = observer;

  // Initial word check on page load
  setTimeout(() => {
    checkPage();
  }, 500);
}

function stopExtension() {
  if (!isRunning) return;
  isRunning = false;

  if (observer3) {
    observer3.disconnect();
    observer3 = null;
  }

  // Remove injected style elements
  document.querySelectorAll('[id^="undistract-"]').forEach((el) => el.remove());

  // Remove alert if present
  const alertEl = document.getElementById('chrome-blocker-alert');
  if (alertEl) alertEl.remove();

  console.log('Extension is halted');
}

// Initial state check
if (chrome.runtime?.id) {
  chrome.storage.local.get(['extensionDisabled'], (result) => {
    if (!result.extensionDisabled) {
      startExtension();
    }
  });
}

// Message listener
if (chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'HALT_ALL') {
      stopExtension();
      sendResponse({ status: 'Halted' });
    } else if (request.action === 'RESUME_ALL') {
      startExtension();
      sendResponse({ status: 'Resumed' });
    } else if (request.action === 'toggleVisibility') {
      updateStyleElement(request.setting, request.value);
      sendResponse({
        action: 'Success',
        determinant: `${request.setting} updated!`,
      });
    }
  });
}

// ULTIMATE TIKTOK AUDIO KILLER (Real-time sync + .play() interception)
if (window.location.hostname.includes('tiktok.com')) {
  let isTikTokBlocked = false;

  // 1. Initialize and keep state synced instantly
  chrome.storage.sync.get({ tiktokfeed: false }, (data) => {
    isTikTokBlocked = data.tiktokfeed;
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.tiktokfeed) {
      isTikTokBlocked = changes.tiktokfeed.newValue;
    }
  });

  // 2. Intercept native media play calls synchronously
  const originalPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    const pathname = window.location.pathname;
    const isFeedPath =
      pathname === '/' ||
      pathname.includes('/foryou') ||
      pathname.includes('/en/');

    if (isTikTokBlocked && isFeedPath) {
      this.muted = true;
      this.volume = 0;
      return Promise.reject(
        new DOMException('Blocked by extension', 'NotAllowedError'),
      );
    }
    return originalPlay.apply(this, arguments);
  };

  // 3. Fallback MutationObserver to forcefully mute/pause existing elements
  const audioKillObserver = new MutationObserver(() => {
    const pathname = window.location.pathname;
    const isFeedPath =
      pathname === '/' ||
      pathname.includes('/foryou') ||
      pathname.includes('/en/');

    if (isTikTokBlocked && isFeedPath) {
      document.querySelectorAll('video, audio').forEach((media) => {
        media.muted = true;
        media.volume = 0;
        if (!media.paused) media.pause();
      });
    }
  });

  const startAudioObserver = () => {
    if (document.body) {
      audioKillObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    } else {
      setTimeout(startAudioObserver, 100);
    }
  };
  startAudioObserver();
}
