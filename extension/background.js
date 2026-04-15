
const DEFAULT_SETTINGS = {
  filenamePrefix: "RegionShot",
  format: "png",
  quality: 0.92,
  copyToClipboard: false,
  customShortcut: ["Ctrl","Shift","1"],
};

// Persist the most recently used save folder (relative to the user's Downloads folder).
// Chrome downloads API cannot force absolute paths; however, suggesting a subfolder like
// "MyFolder/shot.png" makes the save dialog open there next time (inside Downloads).
const LOCAL_KEYS = {
  lastSaveDir: "lastSaveDir", // e.g. "Screenshots/Work"
};

const pendingDownloads = new Set();

function normalizePath(p) {
  return String(p || "").replace(/\\/g, "/");
}

function extractDownloadsRelativeDir(fullPath) {
  const p = normalizePath(fullPath);
  // Heuristic: keep only path under the user's Downloads directory.
  const marker = "/Downloads/";
  const idx = p.toLowerCase().indexOf(marker.toLowerCase());
  if (idx === -1) return null;
  const after = p.slice(idx + marker.length);
  const lastSlash = after.lastIndexOf("/");
  if (lastSlash <= 0) return ""; // directly under Downloads
  return after.slice(0, lastSlash);
}

chrome.downloads.onChanged.addListener(async (delta) => {
  try {
    if (!delta?.id || !pendingDownloads.has(delta.id)) return;
    // filename becomes available very early; if not, wait for complete.
    if (!delta.filename && !(delta.state && delta.state.current === "complete")) return;

    chrome.downloads.search({ id: delta.id }, async (items) => {
      const item = Array.isArray(items) ? items[0] : null;
      if (!item?.filename) return;
      const relDir = extractDownloadsRelativeDir(item.filename);
      if (relDir === null) return; // outside Downloads (can't suggest next time)
      await chrome.storage.local.set({ [LOCAL_KEYS.lastSaveDir]: relDir });
      pendingDownloads.delete(delta.id);
    });
  } catch (_e) {
    // no-op
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get(null);
  await chrome.storage.sync.set(Object.assign({}, DEFAULT_SETTINGS, current));
});

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  return tab;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "REQUEST_CAPTURE") {
    const wid = sender?.tab?.windowId;
    chrome.tabs.captureVisibleTab(wid, {format: "png"}, (dataUrl) => {
      if (chrome.runtime.lastError) sendResponse({ok:false, error: chrome.runtime.lastError.message});
      else sendResponse({ok:true, dataUrl});
    });
    return true;
  }

  if (msg?.type === "DOWNLOAD_IMAGE") {
    (async () => {
      const {dataUrl, ext} = msg.payload;
      const {filenamePrefix} = await chrome.storage.sync.get(["filenamePrefix"]);
      const { [LOCAL_KEYS.lastSaveDir]: lastSaveDir } = await chrome.storage.local.get([LOCAL_KEYS.lastSaveDir]);
      const ts = new Date();
      const pad = (n)=> String(n).padStart(2,"0");
      const baseName = `${filenamePrefix}_${ts.getFullYear()}-${pad(ts.getMonth()+1)}-${pad(ts.getDate())}_${pad(ts.getHours())}-${pad(ts.getMinutes())}-${pad(ts.getSeconds())}.${ext}`;
      const dir = (typeof lastSaveDir === "string") ? lastSaveDir.trim().replace(/^\/+|\/+$/g, "") : "";
      const filename = dir ? `${dir}/${baseName}` : baseName;
      try {
        const downloadId = await chrome.downloads.download({ url: dataUrl, filename, saveAs: true, conflictAction: "uniquify" });
        if (typeof downloadId === "number") pendingDownloads.add(downloadId);
        sendResponse({ok:true});
      } catch(e) {
        sendResponse({ok:false, error: e?.message || String(e)});
      }
    })();
    return true;
  }
});
