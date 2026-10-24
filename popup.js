//these are all of the buttons and their values being grabbed
const feedToggle = document.getElementById('toggleButton');
const commentsToggle = document.getElementById('commentsToggle');
const sidebarToggle = document.getElementById('sidebarToggle');
const killSwitch = document.getElementById('killSwitch');
const tiktokfeed = document.getElementById('tiktokTogglefeed');
const redditfeed = document.getElementById('redditTogglefeed');
const hulufeed = document.getElementById('huluTogglefeed');
const igfeed = document.getElementById('instagramTogglefeed');
const xfeed = document.getElementById('xTogglefeed');
const netflixfeed = document.getElementById('netflixTogglefeed');
// Initialize button state from storage
chrome.storage.local.get(['isBlockingEnabled'], (result) => {
  feedToggle.checked = result.isBlockingEnabled === true;
});

// Save state when user clicks
feedToggle.addEventListener('change', (e) => {
  const isEnabled = e.target.checked;
  chrome.storage.local.set({ isBlockingEnabled: isEnabled });
});
// Helper to update the kill switch button appearance dynamically
function updateButtonUI(button, isDisabled) {
  if (isDisabled) {
    button.textContent = 'Turn Extension Back On';
    button.style.backgroundColor = '#16a34a'; // Green when disabled
  } else {
    button.textContent = 'Turn Off Everything';
    button.style.backgroundColor = '#dc2626'; // Red when active
  }
}

// 1. When popup opens, pull all saved states and initialize UI
document.addEventListener('DOMContentLoaded', async () => {
  // Check kill switch state first
  const localData = await chrome.storage.local.get(['extensionDisabled']);
  const isDisabled = !!localData.extensionDisabled;
  if (killSwitch) {
    updateButtonUI(killSwitch, isDisabled);
  }

  // Pull feature settings
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
  try {
    // Save the user's selection.
    await chrome.storage.sync.set({
      [settingKey]: isChecked,
    });

    // Find the active tab.
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (
      !tab?.id ||
      !tab.url ||
      tab.url.startsWith('chrome://') ||
      tab.url.startsWith('chrome-extension://')
    ) {
      return;
    }

    // Notify the content script as an immediate update.
    chrome.tabs.sendMessage(
      tab.id,
      {
        action: 'toggleVisibility',
        setting: settingKey,
        value: isChecked,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          // Storage was saved; the content script may not be available
          // in this tab. Check the page and extension reload state.
          console.debug(
            'Content script message:',
            chrome.runtime.lastError.message,
          );
          return;
        }

        const statusEl = document.getElementById('status');
        if (statusEl && response?.action === 'Success') {
          statusEl.textContent = response.determinant;
        }
      },
    );
  } catch (error) {
    console.error('Could not update feed setting:', error);
  }
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

const addBtn = document.getElementById('addBtn');
if (addBtn) {
  addBtn.addEventListener('click', () => {
    const input = document.getElementById('termInput');
    const term = input.value.trim();
    if (!term) return;

    chrome.storage.local.get(['blockedTerms'], (data) => {
      const terms = data.blockedTerms || [];
      if (!terms.includes(term)) {
        terms.push(term);
        chrome.storage.local.set({ blockedTerms: terms }, () => {
          input.value = '';
          loadTerms();
        });
      }
    });
  });
}

function loadTerms() {
  chrome.storage.local.get(['blockedTerms'], (data) => {
    const terms = data.blockedTerms || [];
    const list = document.getElementById('termList');
    if (!list) return;
    list.innerHTML = '';

    terms.forEach((t, index) => {
      const li = document.createElement('li');
      li.textContent = t;

      const delBtn = document.createElement('button');
      delBtn.textContent = '×';
      delBtn.className = 'delete-btn';
      delBtn.onclick = () => {
        terms.splice(index, 1);
        chrome.storage.local.set({ blockedTerms: terms }, loadTerms);
      };

      li.appendChild(delBtn);
      list.appendChild(li);
    });
  });
}

loadTerms();

if (killSwitch) {
  killSwitch.addEventListener('click', async () => {
    const data = await chrome.storage.local.get(['extensionDisabled']);
    const currentlyDisabled = !!data.extensionDisabled;
    const newDisabledState = !currentlyDisabled;

    const defaultSettings = {
      feed: false,
      comments: false,
      sidebar: false,
      tiktokfeed: false,
      redditfeed: false,
      hulufeed: false,
      igfeed: false,
      xfeed: false,
      netflixfeed: false,
    };

    if (newDisabledState) {
      // Turning OFF: Save current settings as a backup before clearing them
      const currentSettings = await chrome.storage.sync.get(defaultSettings);
      await chrome.storage.local.set({
        extensionDisabled: true,
        previousSettings: currentSettings,
      });

      // Clear sync settings and uncheck UI boxes
      await chrome.storage.sync.set(defaultSettings);
      [
        feedToggle,
        commentsToggle,
        sidebarToggle,
        tiktokfeed,
        redditfeed,
        hulufeed,
        igfeed,
        xfeed,
        netflixfeed,
      ].forEach((el) => {
        if (el) el.checked = false;
      });
    } else {
      // Turning ON: Restore the previous settings backup if it exists
      const localData = await chrome.storage.local.get(['previousSettings']);
      const restoredSettings = localData.previousSettings || defaultSettings;

      await chrome.storage.local.set({ extensionDisabled: false });
      await chrome.storage.sync.set(restoredSettings);

      // Restore UI checkboxes visually to match
      if (feedToggle) feedToggle.checked = restoredSettings.feed;
      if (commentsToggle) commentsToggle.checked = restoredSettings.comments;
      if (sidebarToggle) sidebarToggle.checked = restoredSettings.sidebar;
      if (tiktokfeed) tiktokfeed.checked = restoredSettings.tiktokfeed;
      if (redditfeed) redditfeed.checked = restoredSettings.redditfeed;
      if (hulufeed) hulufeed.checked = restoredSettings.hulufeed;
      if (igfeed) igfeed.checked = restoredSettings.igfeed;
      if (xfeed) xfeed.checked = restoredSettings.xfeed;
      if (netflixfeed) netflixfeed.checked = restoredSettings.netflixfeed;
    }

    updateButtonUI(killSwitch, newDisabledState);

    // Notify the active tab's content script
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      const actionType = newDisabledState ? 'HALT_ALL' : 'RESUME_ALL';
      chrome.tabs.sendMessage(tab.id, { action: actionType }).catch(() => {});
    }
  });
}
document.addEventListener('DOMContentLoaded', async () => {
  const listElement = document.getElementById('term-list');

  // Fetch current dismissed terms from storage
  const data = await chrome.storage.local.get(['chrome_blocker_dismissed']);
  const terms = data.chrome_blocker_dismissed || [];

  if (terms.length === 0) {
    listElement.innerHTML = '<li class="empty">No ignored keywords found.</li>';
    return;
  }

  // Render each term
  terms.forEach((term) => {
    const li = document.createElement('li');
    li.textContent = term;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove from the ignored list';
    removeBtn.onclick = async () => {
      // Filter out the selected term
      const updatedTerms = terms.filter((t) => t !== term);

      // Save back to chrome.storage
      await chrome.storage.local.set({
        chrome_blocker_dismissed: updatedTerms,
      });

      // Remove item from UI
      li.remove();

      if (updatedTerms.length === 0) {
        listElement.innerHTML =
          '<li class="empty">No ignored keywords found.</li>';
      }
    };

    li.appendChild(removeBtn);
    listElement.appendChild(li);
  });
});

document.getElementById('clear-all').onclick = async () => {
  // Clear storage
  await chrome.storage.local.set({ chrome_blocker_dismissed: [] });

  // Clear UI list
  const listElement = document.getElementById('term-list');
  listElement.innerHTML = '<li class="empty">No ignored keywords found.</li>';
};
