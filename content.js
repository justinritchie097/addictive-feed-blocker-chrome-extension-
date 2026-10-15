// content.js
console.log('Content script loaded.');

// Independent selector groupings
const SELECTORS = {
  feed: `
 ytd-rich-grid-renderer.style-scope.ytd-two-column-browse-results-renderer
  
  `,
  comments: `
    #sections.ytd-comments,
    ytd-comments,
    #comments
  `,
  sidebar: `
    #secondary
  `,
  tiktokfeed: `

    #column-list-container
  `,
  tiktokcomments: `
   [data-e2e="search-comment-container"],
    [data-e2e="comment-list"],
  `,

  redditfeed: `
  #main-content,
  #subgrid-container
  `,
  hulufeed: `[data-testid="hub-collections-home"]`,
  igfeed: `
.xw7yly9
    `,

  xfeed: `[data-testid="primaryColumn"]`,
  netflixfeed: `[data-uia="carousel-scroller"]`,
};

// Global audio management state reference
let audioKillInterval = null;

// 1. Check all saved settings on page load/reload independently
chrome.storage.sync.get(
  {
    feed: false,
    comments: false,
    sidebar: false,
    tiktokfeed: false,
    tiktokcomments: false,
    redditfeed: false,
    hulufeed: false,
    igfeed: false,
    xfeed: false,
    netflixfeed: false,
  },
  (settings) => {
    if (settings.feed === true) updateStyleElement('feed', true);
    if (settings.comments === true) updateStyleElement('comments', true);
    if (settings.sidebar === true) updateStyleElement('sidebar', true);
    if (settings.tiktokfeed === true) updateStyleElement('tiktokfeed', true);
    if (settings.redditfeed === true) updateStyleElement('redditfeed', true);
    if (settings.hulufeed === true) updateStyleElement('hulufeed', true);
    if (settings.igfeed === true) updateStyleElement('igfeed', true);
    if (settings.xfeed === true) updateStyleElement('xfeed', true);
    if (settings.netflixfeed === true) updateStyleElement('netflixfeed', true);
    // Evaluate audio constraints right away on page boot
    if (settings.tiktokcomments === true)
      updateStyleElement('tiktokcomments', true);
    evaluateAudioConstraints(settings.feed, settings.tiktokfeed);
  },
);

// 2. Listen for real-time messages from popup toggles
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleVisibility') {
    updateStyleElement(request.setting, request.value);

    // Re-evaluate audio permissions any time a feed toggle status drops or updates
    if (request.setting === 'feed' || request.setting === 'tiktokfeed') {
      chrome.storage.sync.get(
        { feed: false, tiktokfeed: false },
        (settings) => {
          // Handle changes in sync with current toggle states
          const updatedFeed =
            request.setting === 'netflixfeed' ? request.value : settings.feed;
          const updatedTikTok =
            request.setting === 'tiktokfeed'
              ? request.value
              : settings.tiktokfeed;
          evaluateAudioConstraints(updatedFeed, updatedTikTok);
        },
      );
    }
  }
  sendResponse({
    action: 'Success',
    determinant: `${request.setting} updated!`,
  });
});

// 3. Injects or removes styles based on the specific target key
function updateStyleElement(featureKey, shouldHide) {
  const styleId = `toggle-youtube-${featureKey}-style`;
  let styleNode = document.getElementById(styleId);

  if (shouldHide) {
    if (styleNode) return; // Already hidden

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

    function inject() {
      const target = document.head || document.documentElement;
      if (target) {
        target.appendChild(styleNode);
      } else {
        setTimeout(inject, 5);
      }
    }
    inject();
  } else {
    if (styleNode) {
      styleNode.remove();
    }
  }
}
// This code was mostly written with the help of ai and is mainly used to help with tiktoks annoying feed. SOrry if its a bit confusing
// 4. NEW: Keeps background audio entirely dead while feeds are actively blocked
function evaluateAudioConstraints(isYTHidden, isTikTokHidden) {
  // Clear any existing active monitoring thread
  if (audioKillInterval) {
    clearInterval(audioKillInterval);
    audioKillInterval = null;
  }

  // If neither feed is blocked, allow normal media playback behavior
  if (!isYTHidden && !isTikTokHidden) return;

  // Run a continuous thread loop to intercept auto-play executions from SPA nodes
  audioKillInterval = setInterval(() => {
    const isTikTokPage = window.location.hostname.includes('tiktok.com');
    const isnetflixPage = window.location.hostname.includes('netflix.com');

    // Only force-kill video audio if the current page has its specific feed toggle active
    if ((isnetflixPage && isYTHidden) || (isTikTokPage && isTikTokHidden)) {
      const videos = document.querySelectorAll('video');
      videos.forEach((video) => {
        if (!video.paused || video.volume > 0 || !video.muted) {
          video.pause(); // Halt current playback rendering threads
          video.muted = true; // Complete baseline volume attenuation
          video.volume = 0; // Absolute fallback validation parameter
        }
      });
    }
  }, 50); // Evaluates every 50ms to override asynchronous streaming injections
}
