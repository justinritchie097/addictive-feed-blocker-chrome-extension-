const feedToggle = document.getElementById('toggleButton');
const commentsToggle = document.getElementById('commentsToggle');
const sidebarToggle = document.getElementById('sidebarToggle');

const tiktokfeed = document.getElementById('tiktokTogglefeed');
const tiktokcomments = document.getElementById('tiktokTogglecomments');
// 1. When popup opens, pull both saved states independently
const hulufeed = document.getElementById('huluTogglefeed');
const redditfeed = document.getElementById('redditTogglefeed');

const igfeed = document.getElementById('instagramTogglefeed');

const xfeed = document.getElementById('xTogglefeed');

const netflixfeed = document.getElementById('netflixTogglefeed');
document.addEventListener('DOMContentLoaded', async () => {
  // Pulls both keys; defaults to false if they don't exist yet
  const settings = await chrome.storage.sync.get({
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
  });

  // Set each checkbox to its own saved true/false value
  feedToggle.checked = settings.feed;
  commentsToggle.checked = settings.comments;
  sidebarToggle.checked = settings.sidebar;
  tiktokfeed.checked = settings.tiktokfeed;

  redditfeed.checked = settings.redditfeed;
  hulufeed.checked = settings.hulufeed;
  igfeed.checked = settings.igfeed;
  xfeed.checked = settings.xfeed;
  netflixfeed.checked = settings.netflixfeed;
});

// 2. Helper function to handle a toggle change independently
async function handleToggleChange(settingKey, isChecked) {
  // Save only the key that changed ('feed' or 'comments')
  await chrome.storage.sync.set({ [settingKey]: isChecked });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  // Notify the content script which specific feature changed
  chrome.tabs.sendMessage(
    tab.id,
    {
      action: 'toggleVisibility',
      setting: settingKey, // Passes 'feed' or 'comments'
      value: isChecked, // Passes true or false
    },
    (response) => {
      if (chrome.runtime.lastError) return;
      if (response && response.action === 'Success') {
        document.getElementById('status').innerText = response.determinant;
      }
    },
  );
}

// 3. Attach independent listeners to each checkbox
feedToggle.addEventListener('change', (e) =>
  handleToggleChange('feed', e.target.checked),
);
commentsToggle.addEventListener('change', (e) =>
  handleToggleChange('comments', e.target.checked),
);
sidebarToggle.addEventListener('change', (e) =>
  handleToggleChange('sidebar', e.target.checked),
);
tiktokfeed.addEventListener('change', (e) =>
  handleToggleChange('tiktokfeed', e.target.checked),
);

redditfeed.addEventListener('change', (e) =>
  handleToggleChange('redditfeed', e.target.checked),
);
hulufeed.addEventListener('change', (e) =>
  handleToggleChange('hulufeed', e.target.checked),
);

igfeed.addEventListener('change', (e) =>
  handleToggleChange('igfeed', e.target.checked),
);

xfeed.addEventListener('change', (e) =>
  handleToggleChange('xfeed', e.target.checked),
);
netflixfeed.addEventListener('change', (e) =>
  handleToggleChange('netflixfeed', e.target.checked),
);
