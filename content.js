let observer3;
let navigationHandler = null;
let isRunning = false;
// line 5-35 is a function specifically for handling youtubes brief homepage flash everytime the user searches something
(function () {
  const styleId = 'yt-feed-blocker-style';

  function applyState(enabled) {
    let existingStyle = document.getElementById(styleId);

    // Check if we are on the home page
    const isHomePage =
      window.location.pathname === '/' &&
      !window.location.search.includes('v=');

    // Only block if BOTH the toggle is enabled AND we are on the home page
    if (enabled && isHomePage) {
      if (!existingStyle) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          ytd-rich-grid-renderer, 
          #contents.ytd-rich-grid-renderer { 
            display: none !important; 
          }
        `;
        (document.head || document.documentElement).appendChild(style);
      }
    } else {
      // Instantly remove the style tag if disabled or not on the home page
      if (existingStyle) {
        existingStyle.remove();
      }
    }
  }

  // 1. Check storage immediately on load
  chrome.storage.local.get(['isBlockingEnabled'], (result) => {
    applyState(result.isBlockingEnabled === true);
  });

  // 2. Listen for storage changes in real-time (when you flip the toggle)
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.isBlockingEnabled !== undefined) {
      applyState(changes.isBlockingEnabled.newValue === true);
    }
  });

  // 3. Re-evaluate on YouTube's internal SPA navigation
  window.addEventListener('yt-navigate-finish', () => {
    chrome.storage.local.get(['isBlockingEnabled'], (result) => {
      applyState(result.isBlockingEnabled === true);
    });
  });
})();

const SELECTORS = {
  //the next 3 lines of code are selectors for youtube ONLY. Sorry for not specifying it by the property, or the LHS.
  feed: `.style-scope.ytd-rich-grid-renderer,.style-scope.ytd-two-column-browse-results-renderer`,
  comments: `#sections.ytd-comments, ytd-comments, #comments`,
  sidebar: `#secondary`,
  tiktokfeed: `
    [data-e2e="recommend-list-item-container"],
    div[class*="DivFeedWrapper"],
    main div[class*="DivListContainer"],.e12rd3ag0.css-9ncxcd-7937d88b--DivShareLayoutBase-7937d88b--StyledShareLayoutV2-7937d88b--ExploreLayout.eme3bfk0,
    div:has(> [data-e2e="recommend-list-item-container"])
  `,
  redditfeed: `#subgrid-container`,
  hulufeed: `[data-testid="hub-collections-home"]`,
  igfeed: `.x78zum5.xdt5ytf.x5yr21d.xa1mljc.xh8yej3.x1bs97v6.x1q0q8m5.x11aubdm.xnc8uc2.x1qhh985,.x15mokao.x1ga7v0g.x16uus16.xbiv7yw.x5o85r1.xeo4mu6.x1vz142a.x18uqkz4.x1pv78wv.xghhx3z,.x1qjc9v5.x9f619.x78zum5.xg7h5cd.x1mfogq2.xsfy40s.x1bhewko.xgv127d.xh8yej3.xl56j7k`,
  xfeed: `[data-testid="primaryColumn"], .css-g5y9jx.r-18u37iz.r-1udh08x.r-1c4vpko.r-1c7gwzm.r-o7ynqc.r-6416eg.r-1ny4l3l.r-1loqt21`,
  netflixfeed: `[data-uia="carousel-scroller"]`,
};
//this function matchesurl's purpose is to block the selectors above on those specific urls.
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
      return pathname === '/' || pathname.includes('/results?search_query');

    case 'redditfeed':
      if (!hostname.includes('reddit.com')) return false;
      return pathname === '/' || pathname.includes('/popular/');

    case 'xfeed':
      if (!hostname.includes('x.com')) return false;
      return pathname === '/home' || pathname.includes('/explore');
    case 'igfeed':
      if (!hostname.includes('instagram.com')) return false;
      return (
        pathname === '/' ||
        pathname.includes('/explore/') ||
        pathname.includes('/reels/')
      );
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

let cachedSettings = null;
//this function is meant to store the styles from the selectors variable and put it inside updatestyleelement function
function applyStoredStyles() {
  if (!isRunning || cachedSettings === null) return;

  Object.keys(SELECTORS).forEach((key) => {
    updateStyleElement(key, cachedSettings[key] === true);
  });
}
//this function just loads the values from applystoredstyles()
function loadStoredStyles() {
  chrome.storage.sync.get(null, (settings) => {
    if (chrome.runtime.lastError) {
      console.error(
        'Could not load ScrollShield settings:',
        chrome.runtime.lastError,
      );
      return;
    }

    cachedSettings = settings || {};
    applyStoredStyles();
    // Saved settings now determine which feature styles remain active.
    removeStartupGuards();
  });
}

// Keep styles synchronized when the popup changes a setting.
// This listener is registered once, not each time the extension resumes.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    if (cachedSettings === null) cachedSettings = {};

    for (const [key, change] of Object.entries(changes)) {
      cachedSettings[key] = change.newValue;
    }

    applyStoredStyles();
  }

  if (
    area === 'local' &&
    changes.blockedTerms &&
    isRunning &&
    !sessionBypassed
  ) {
    clearTimeout(checkTimeout);
    checkTimeout = setTimeout(checkPage, 50);
  }
});

// --- CUSTOM WORD BLOCKER INTEGRATION ---
let sessionBypassed = false;
let checkTimeout = null;
//this function checks if the page has the word typed in by the user
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

// Keep an in-memory cache to instantly block repeat triggers during race conditions
const localDismissedCache = new Set();
//if the word is found, a red alert appears over the webpage asking the user if they want to continue or not
async function showRedAlert(matchedTerm) {
  // 1. Check in-memory cache first (instant)
  if (localDismissedCache.has(matchedTerm)) return;

  // 2. Check persistent storage
  const data = await chrome.storage.local.get(['chrome_blocker_dismissed']);
  const dismissedTerms = data.chrome_blocker_dismissed || [];

  if (dismissedTerms.includes(matchedTerm)) {
    localDismissedCache.add(matchedTerm); // Sync it to cache
    return;
  }

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
  <div style="
    background: rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 16px;
    padding: 40px 30px;
    max-width: 520px;
    width: 90%;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    align-items: center;
  ">
    <div style="font-size: 3.5rem; margin-bottom: 15px;">⚠️</div>
    <h1 style="font-size: 2rem; margin: 0 0 10px 0; font-weight: 700; letter-spacing: -0.5px;">Content Blocked</h1>
    <p style="font-size: 1.05rem; margin: 0 0 30px 0; line-height: 1.5; opacity: 0.95;">
      This page contains content matching your blocked term: <br>
      <strong style="background: rgba(0,0,0,0.25); padding: 2px 8px; border-radius: 4px; font-size: 1.1rem;">"${matchedTerm}"</strong>
    </p>
    
    <div style="display: flex; gap: 12px; width: 100%; margin-bottom: 20px;">
      <button id="blocker-back" style="flex: 1; padding: 12px 20px; font-size: 0.95rem; background: white; color: #dc2626; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: transform 0.1s ease;">Go Back</button>
      <button id="blocker-continue" style="flex: 1; padding: 12px 20px; font-size: 0.95rem; background: transparent; color: white; border: 2px solid rgba(255,255,255,0.8); border-radius: 8px; cursor: pointer; font-weight: 600; transition: background 0.1s ease;">Continue Anyway</button>
    </div>

    <button id="blocker-never" style="width: 100%; padding: 10px 16px; font-size: 0.85rem; background: rgba(0,0,0,0.2); color: rgba(255,255,255,0.9); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; cursor: pointer; text-align: center; line-height: 1.4;">
      <strong>Don't show for this word again</strong><br>
      <span style="font-size: 0.75rem; opacity: 0.75;">Add to ignore list. Manage anytime from extension settings.</span>
    </button>
  </div>
`;

  if (document.body) {
    document.body.appendChild(overlay);
  } else {
    document.documentElement.appendChild(overlay);
  }

  overlay.querySelector('#blocker-back').onclick = () => window.history.back();

  overlay.querySelector('#blocker-continue').onclick = () => {
    sessionBypassed = true;
    overlay.remove();
  };

  overlay.querySelector('#blocker-never').onclick = async () => {
    try {
      // Immediately add to in-memory cache to stop looping right now
      localDismissedCache.add(matchedTerm);
      overlay.remove();

      // Save to persistent chrome.storage in the background
      const currentData = await chrome.storage.local.get([
        'chrome_blocker_dismissed',
      ]);
      const currentList = currentData.chrome_blocker_dismissed || [];

      if (!currentList.includes(matchedTerm)) {
        currentList.push(matchedTerm);
        await chrome.storage.local.set({
          chrome_blocker_dismissed: currentList,
        });
      }
    } catch (error) {
      console.error('Error saving to chrome.storage:', error);
    }
  };
}
function startExtension() {
  if (isRunning) return;
  isRunning = true;

  console.log('ScrollShield is active');
  loadStoredStyles();

  // SPA navigation can update the URL without a full document reload.
  // Reapply cached CSS immediately when the URL changes; do not wait 200 ms
  // and do not query storage for every DOM mutation.
  let lastUrl = location.href;
  const handlePossibleNavigation = () => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      sessionBypassed = false;
      applyStoredStyles();

      if (!sessionBypassed) {
        clearTimeout(checkTimeout);
        checkTimeout = setTimeout(checkPage, 100);
      }
    }
  };

  const observer = new MutationObserver(() => {
    handlePossibleNavigation();

    // Word checks are debounced so large, frequently-updated pages do not
    // trigger an expensive full-text scan for every individual DOM mutation.
    if (!sessionBypassed) {
      clearTimeout(checkTimeout);
      checkTimeout = setTimeout(checkPage, 250);
    }
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
    });
  }
  observer3 = observer;
  window.addEventListener('popstate', handlePossibleNavigation);
  window.addEventListener('hashchange', handlePossibleNavigation);
  navigationHandler = handlePossibleNavigation;

  // Initial word check on page load. The observer handles later changes.
  checkTimeout = setTimeout(checkPage, 250);
}

function stopExtension() {
  if (!isRunning) return;
  isRunning = false;

  if (observer3) {
    observer3.disconnect();
    observer3 = null;
  }
  if (navigationHandler) {
    window.removeEventListener('popstate', navigationHandler);
    window.removeEventListener('hashchange', navigationHandler);
    navigationHandler = null;
  }
  clearTimeout(checkTimeout);

  // Remove injected style elements
  document.querySelectorAll('[id^="undistract-"]').forEach((el) => el.remove());
  removeStartupGuards();

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
    } else {
      removeStartupGuards();
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
      if (cachedSettings === null) cachedSettings = {};
      cachedSettings[request.setting] = request.value;
      updateStyleElement(request.setting, request.value === true);
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
