const feedToggle = document.getElementById('toggleButton');
const commentsToggle = document.getElementById('commentsToggle');
const sidebarToggle = document.getElementById('sidebarToggle');

const tiktokfeed = document.getElementById('tiktokTogglefeed');
const redditfeed = document.getElementById('redditTogglefeed');
const hulufeed = document.getElementById('huluTogglefeed');
const igfeed = document.getElementById('instagramTogglefeed');
const xfeed = document.getElementById('xTogglefeed');
const netflixfeed = document.getElementById('netflixTogglefeed');

// 1. When popup opens, pull all saved states independently
document.addEventListener('DOMContentLoaded', async () => {
  const settings = await chrome.storage.sync.get({
    feed: false,
    comments: false,
    sidebar: false,
    tiktokfeed: false,
    redditfeed: false,
    hulufeed: false,
    igfeed: false,
    xfeed: false,
    netflixfeed: false,
  });

  // Set each checkbox safely to its saved value
  if (feedToggle) feedToggle.checked = settings.feed;
  if (commentsToggle) commentsToggle.checked = settings.comments;
  if (sidebarToggle) sidebarToggle.checked = settings.sidebar;
  if (tiktokfeed) tiktokfeed.checked = settings.tiktokfeed;
  if (redditfeed) redditfeed.checked = settings.redditfeed;
  if (hulufeed) hulufeed.checked = settings.hulufeed;
  if (igfeed) igfeed.checked = settings.igfeed;
  if (xfeed) xfeed.checked = settings.xfeed;
  if (netflixfeed) netflixfeed.checked = settings.netflixfeed;
});

// 2. Helper function to handle toggle changes
async function handleToggleChange(settingKey, isChecked) {
  await chrome.storage.sync.set({ [settingKey]: isChecked });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;
  if (tab.url && tab.url.startsWith('chrome://')) return;

  chrome.tabs.sendMessage(
    tab.id,
    {
      action: 'toggleVisibility',
      setting: settingKey,
      value: isChecked,
    },
    (response) => {
      if (chrome.runtime.lastError) return;
      if (response && response.action === 'Success') {
        const statusEl = document.getElementById('status');
        if (statusEl) statusEl.innerText = response.determinant;
      }
    },
  );
}

// 3. Attach independent listeners safely
if (feedToggle)
  feedToggle.addEventListener('change', (e) =>
    handleToggleChange('feed', e.target.checked),
  );
if (commentsToggle)
  commentsToggle.addEventListener('change', (e) =>
    handleToggleChange('comments', e.target.checked),
  );
if (sidebarToggle)
  sidebarToggle.addEventListener('change', (e) =>
    handleToggleChange('sidebar', e.target.checked),
  );
if (tiktokfeed)
  tiktokfeed.addEventListener('change', (e) =>
    handleToggleChange('tiktokfeed', e.target.checked),
  );
if (redditfeed)
  redditfeed.addEventListener('change', (e) =>
    handleToggleChange('redditfeed', e.target.checked),
  );
if (hulufeed)
  hulufeed.addEventListener('change', (e) =>
    handleToggleChange('hulufeed', e.target.checked),
  );
if (igfeed)
  igfeed.addEventListener('change', (e) =>
    handleToggleChange('igfeed', e.target.checked),
  );
if (xfeed)
  xfeed.addEventListener('change', (e) =>
    handleToggleChange('xfeed', e.target.checked),
  );
if (netflixfeed)
  netflixfeed.addEventListener('change', (e) =>
    handleToggleChange('netflixfeed', e.target.checked),
  );
