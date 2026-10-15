// content.js
console.log('Undistract content script loaded at document_start.');

const SELECTORS = {
  feed: ` ytd-rich-grid-renderer.style-scope.ytd-two-column-browse-results-renderer`,
  comments: `#sections.ytd-comments, ytd-comments, #comments`,
  sidebar: `#secondary`,
  tiktokfeed: `
    [data-e2e="recommend-list-item-container"],
    div[class*="DivFeedWrapper"],
    main div[class*="DivListContainer"],
    div:has(> [data-e2e="recommend-list-item-container"])
  `,
  redditfeed: ` #subgrid-container`,
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
          pathname.includes('/explore'))
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

// Check storage and inject style immediately
function applyStoredStyles() {
  chrome.storage.sync.get(null, (settings) => {
    Object.keys(SELECTORS).forEach((key) => {
      if (settings[key] === true) {
        updateStyleElement(key, true);
      }
    });
  });
}

applyStoredStyles();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleVisibility') {
    updateStyleElement(request.setting, request.value);
  }
  sendResponse({
    action: 'Success',
    determinant: `${request.setting} updated!`,
  });
});

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

// SPA URL change listener
let lastUrl = location.href;
const observer = new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    setTimeout(applyStoredStyles, 200);
  }
});
observer.observe(document, { subtree: true, childList: true });

// ULTIMATE AUDIO KILLER: Intercepts Web Audio API and HTML5 Media Elements on TikTok
if (window.location.hostname.includes('tiktok.com')) {
  // 1. Kill Web Audio API sound generation if feed blocking is enabled
  const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;
  if (OriginalAudioContext) {
    window.AudioContext = window.webkitAudioContext = function (...args) {
      const context = new OriginalAudioContext(...args);
      chrome.storage.sync.get({ tiktokfeed: false }, (settings) => {
        if (
          settings.tiktokfeed &&
          (window.location.pathname === '/' ||
            window.location.pathname.includes('/foryou'))
        ) {
          try {
            context.suspend();
          } catch (e) {}
        }
      });
      return context;
    };
  }

  // 2. Aggressively mute all existing and incoming video nodes
  const audioKillObserver = new MutationObserver(() => {
    chrome.storage.sync.get({ tiktokfeed: false }, (settings) => {
      if (
        settings.tiktokfeed &&
        (window.location.pathname === '/' ||
          window.location.pathname.includes('/foryou'))
      ) {
        document.querySelectorAll('video, audio').forEach((media) => {
          media.muted = true;
          media.volume = 0;
          if (!media.paused) media.pause();
        });
      }
    });
  });

  window.addEventListener('DOMContentLoaded', () => {
    audioKillObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}
