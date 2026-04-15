(() => {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === "PING") { sendResponse({ pong: true }); return; }
  });

  // ---- i18n ----
  const I18N = {
    ko: {
      subtitle: "빠른 영역 캡쳐 · 단축키 설정",
      startCapture: "영역 캡쳐 시작",
      shortcut: "단축키",
      waiting: "(입력 대기 중)",
      pressKeys: "지정할 키를 동시에 눌러주세요…",
      muted: "단축키는 선택 모드에서만 적용됩니다.",
      warn: "이 페이지에서는 확장이 실행되지 않을 수 있습니다.",
      cannotRun: "이 페이지에서는 실행할 수 없습니다.",
      copy: "복사",
      copied: "복사됨",
      save: "저장",
      close: "닫기",
      previewTitle: "이미지 좌클릭으로 복사 · 우클릭으로 저장 가능",
    },
    en: {
      subtitle: "Quick region capture · Shortcut",
      startCapture: "Start region capture",
      shortcut: "Shortcut",
      waiting: "(waiting...)",
      pressKeys: "Press the keys together…",
      muted: "Shortcut works only in selection mode.",
      warn: "This extension may not run on this page.",
      cannotRun: "Cannot run on this page.",
      copy: "Copy",
      copied: "Copied",
      save: "Save",
      close: "Close",
      previewTitle: "Left click to copy · Right click to save",
    },
    ja: {
      subtitle: "クイック範囲キャプチャ · ショートカット",
      startCapture: "範囲キャプチャ開始",
      shortcut: "ショートカット",
      waiting: "(入力待機中)",
      pressKeys: "同時にキーを押してください…",
      muted: "ショートカットは選択モードでのみ有効です。",
      warn: "このページでは拡張機能が動作しない場合があります。",
      cannotRun: "このページでは実行できません。",
      copy: "コピー",
      copied: "コピー済み",
      save: "保存",
      close: "閉じる",
      previewTitle: "左クリックでコピー · 右クリックで保存",
    },
    zh: {
      subtitle: "快速区域截图 · 快捷键",
      startCapture: "开始区域截图",
      shortcut: "快捷键",
      waiting: "(等待输入…)",
      pressKeys: "请同时按下按键…",
      muted: "快捷键仅在选择模式下有效。",
      warn: "该页面可能无法运行扩展。",
      cannotRun: "此页面无法运行。",
      copy: "复制",
      copied: "已复制",
      save: "保存",
      close: "关闭",
      previewTitle: "左键复制 · 右键保存",
    },
    fr: {
      subtitle: "Capture de zone · Raccourci",
      startCapture: "Démarrer la capture",
      shortcut: "Raccourci",
      waiting: "(en attente...)",
      pressKeys: "Appuyez sur les touches en même temps…",
      muted: "Le raccourci ne fonctionne qu’en mode sélection.",
      warn: "L’extension peut ne pas fonctionner sur cette page.",
      cannotRun: "Impossible sur cette page.",
      copy: "Copier",
      copied: "Copié",
      save: "Enregistrer",
      close: "Fermer",
      previewTitle: "Clic gauche pour copier · Clic droit pour enregistrer",
    },
    de: {
      subtitle: "Schnelle Bereichsaufnahme · Tastenkürzel",
      startCapture: "Bereichsaufnahme starten",
      shortcut: "Tastenkürzel",
      waiting: "(Warte auf Eingabe...)",
      pressKeys: "Drücken Sie die Tasten gleichzeitig…",
      muted: "Das Tastenkürzel funktioniert nur im Auswahlmodus.",
      warn: "Diese Erweiterung funktioniert auf dieser Seite möglicherweise nicht.",
      cannotRun: "Auf dieser Seite nicht ausführbar.",
      copy: "Kopieren",
      copied: "Kopiert",
      save: "Speichern",
      close: "Schließen",
      previewTitle: "Linksklick zum Kopieren · Rechtsklick zum Speichern",
    },
    nl: {
      subtitle: "Snelle gebiedscapture · Sneltoets",
      startCapture: "Gebiedscapture starten",
      shortcut: "Sneltoets",
      waiting: "(wachten op invoer...)",
      pressKeys: "Druk de toetsen tegelijk in…",
      muted: "De sneltoets werkt alleen in de selectiemodus.",
      warn: "Deze extensie werkt mogelijk niet op deze pagina.",
      cannotRun: "Kan niet op deze pagina worden uitgevoerd.",
      copy: "Kopiëren",
      copied: "Gekopieerd",
      save: "Opslaan",
      close: "Sluiten",
      previewTitle: "Linksklik om te kopiëren · Rechtsklik om op te slaan",
    }
  };

  let uiLang = "ko";
  const t = (k) => (I18N[uiLang] && I18N[uiLang][k]) ? I18N[uiLang][k] : (I18N.ko[k] ?? k);

  chrome.storage.sync.get(["uiLang"], (cfg) => {
    if (cfg?.uiLang && I18N[cfg.uiLang]) uiLang = cfg.uiLang;
  });
  chrome.storage.onChanged.addListener((c) => {
    if (c.uiLang?.newValue && I18N[c.uiLang.newValue]) uiLang = c.uiLang.newValue;
  });

  // ---- selection state ----
  let overlay = null, rectEl = null, infoEl = null, frozenImgEl = null;
  let selecting = false, startX = 0, startY = 0, endX = 0, endY = 0;
  let combo = null;
  let captureModalOpen = false;
  let captureLocked = false; // lock only while preview modal is open

  // frozen screenshot for selection mode
  let frozenFullDataUrl = null;

  function normKey(k) {
    const map = { "Control": "Ctrl", "Alt": "Alt", "Shift": "Shift", "Meta": "Command", "OS": "Command" };
    if (map[k]) return map[k];
    if (k.length === 1) return k.toUpperCase();
    return k;
  }
  const pressed = new Set();
  function setsEqual(a, b) {
    if (!a || !b) return false;
    if (a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  }

  chrome.storage.sync.get(["customShortcut"], (cfg) => {
    combo = Array.isArray(cfg.customShortcut) ? cfg.customShortcut : ["Ctrl", "Shift", "1"];
  });
  chrome.storage.onChanged.addListener((c) => { if (c.customShortcut) combo = c.customShortcut.newValue; });

  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    pressed.add(normKey(e.key));
    const target = new Set(combo || []);
    if (setsEqual(pressed, target)) {
      e.preventDefault(); e.stopPropagation();

      // Prevent stuck modifier states after cancel/close flows.
      resetPressed();

      // If selection UI is already up and user presses the shortcut again BEFORE selecting,
      // treat it as "cancel selection mode".
      if (overlay && !selecting) { removeOverlay(); return; }

      // While the preview modal is open, block re-capture.
      if (captureLocked) return;
      if (captureModalOpen) return;

      startSelectionFlow();
    }
  }, true);
  window.addEventListener("keyup", (e) => { pressed.delete(normKey(e.key)); }, true);

  function resetPressed() { pressed.clear(); }
  window.addEventListener("blur", resetPressed, true);
  document.addEventListener("visibilitychange", () => { if (document.hidden) resetPressed(); }, true);

  chrome.runtime.onMessage.addListener((msg) => { if (msg?.type === "START_SELECTION") startSelectionFlow(); });

  async function requestVisibleScreenshot() {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "REQUEST_CAPTURE" }, (res) => {
        if (!res?.ok) reject(new Error(res?.error || "capture failed"));
        else resolve(res.dataUrl);
      });
    });
  }

  async function startSelectionFlow() {
    if (overlay) removeOverlay();
    try {
      resetPressed();
      // Capture FIRST (before overlay exists) so the screenshot is a truly "frozen" state.
      frozenFullDataUrl = await requestVisibleScreenshot();
    } catch (e) {
      // If capture fails, silently ignore.
      frozenFullDataUrl = null;
      return;
    }
    createOverlay();
  }

  function createOverlay() {
    if (!frozenFullDataUrl) return;

    overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      left: 0, top: 0, width: "100%", height: "100%",
      background: "transparent",
      cursor: "crosshair",
      zIndex: 2147483647,
      userSelect: "none"
    });

    // Fullscreen frozen screenshot image
    frozenImgEl = document.createElement("img");
    frozenImgEl.src = frozenFullDataUrl;
    Object.assign(frozenImgEl.style, {
      position: "fixed",
      left: 0, top: 0, width: "100%", height: "100%",
      objectFit: "cover", // captureVisibleTab is viewport-sized; cover keeps fill
      pointerEvents: "none", // selection should hit overlay
      userSelect: "none"
    });

    rectEl = document.createElement("div");
    Object.assign(rectEl.style, {
      position: "fixed",
      // Dim ONLY the outside area, keep the selected area in original colors.
      // (Achieved via a huge box-shadow on the selection rectangle.)
      border: "2px dashed #fff",
      background: "transparent",
      boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
      pointerEvents: "none",
      left: 0, top: 0, width: 0, height: 0
    });

    infoEl = document.createElement("div");
    Object.assign(infoEl.style, {
      position: "fixed",
      padding: "4px 8px",
      background: "rgba(0,0,0,0.7)",
      color: "#fff",
      fontSize: "12px",
      borderRadius: "6px",
      pointerEvents: "none",
      transform: "translate(8px,-28px)"
    });
    infoEl.textContent = "0 × 0";

    overlay.appendChild(frozenImgEl);
    overlay.appendChild(rectEl);
    overlay.appendChild(infoEl);
    document.documentElement.appendChild(overlay);

    overlay.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove, true);
    window.addEventListener("mouseup", onUp, true);
    window.addEventListener("keydown", onEsc, true);
  }

  function removeOverlay() {
    window.removeEventListener("mousemove", onMove, true);
    window.removeEventListener("mouseup", onUp, true);
    window.removeEventListener("keydown", onEsc, true);
    overlay?.remove();
    overlay = null; rectEl = null; infoEl = null; frozenImgEl = null;
    selecting = false;
    frozenFullDataUrl = null;
    resetPressed();
  }

  function onEsc(e) { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); removeOverlay(); } }
  function onDown(e) { e.preventDefault(); selecting = true; startX = e.clientX; startY = e.clientY; endX = startX; endY = startY; updateRect(); }
  function onMove(e) {
    if (!overlay) return;
    if (selecting) { endX = e.clientX; endY = e.clientY; updateRect(); }
    infoEl.style.left = e.clientX + "px";
    infoEl.style.top = e.clientY + "px";
  }
  function onUp(e) {
    if (!selecting) return;
    selecting = false;
    updateRect();
    const r = getRect();
    if (r.w < 5 || r.h < 5) { removeOverlay(); return; }

    // Hide selection UI before opening preview modal (avoid flashing)
    try { if (overlay) overlay.style.display = "none"; } catch (_e) { }

    // Crop from the frozen screenshot (NO re-capture here).
    setTimeout(() => {
      doCropFromFrozen(r).catch(() => { }).finally(() => removeOverlay());
    }, 0);
  }

  function getRect() {
    const x1 = Math.min(startX, endX), y1 = Math.min(startY, endY),
      x2 = Math.max(startX, endX), y2 = Math.max(startY, endY);
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }
  function updateRect() {
    const r = getRect();
    Object.assign(rectEl.style, { left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px" });
    infoEl.textContent = `${Math.round(Math.max(0, r.w))} × ${Math.round(Math.max(0, r.h))}`;
  }

  async function doCropFromFrozen(viewRect) {
    const full = frozenFullDataUrl;
    const img = new Image(); img.src = full;
    await new Promise((ok, err) => { img.onload = ok; img.onerror = err; });

    // IMPORTANT:
    // captureVisibleTab returns the viewport image in the bitmap's native pixel size.
    // The user's selection rectangle, however, is measured in CSS pixels.
    // If we crop using device pixels and then downscale back to CSS pixels,
    // the result becomes visibly softer on HiDPI / display scaling / zoom setups.
    // So we map CSS pixels -> bitmap pixels, crop there, and KEEP the native pixels.
    const viewportW = Math.max(1, window.innerWidth);
    const viewportH = Math.max(1, window.innerHeight);
    const scaleX = img.naturalWidth / viewportW;
    const scaleY = img.naturalHeight / viewportH;

    const sx = Math.max(0, Math.round(viewRect.x * scaleX));
    const sy = Math.max(0, Math.round(viewRect.y * scaleY));
    const sw = Math.max(1, Math.round(viewRect.w * scaleX));
    const sh = Math.max(1, Math.round(viewRect.h * scaleY));

    const safeSw = Math.min(sw, Math.max(1, img.naturalWidth - sx));
    const safeSh = Math.min(sh, Math.max(1, img.naturalHeight - sy));

    // Keep the cropped bitmap in native captured pixels.
    // Downscaling to CSS pixels here makes the result softer than the original capture,
    // especially on HiDPI / display scaling setups.
    const outW = Math.max(1, safeSw);
    const outH = Math.max(1, safeSh);

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, sx, sy, safeSw, safeSh, 0, 0, outW, outH);
    const outUrl = canvas.toDataURL("image/png");

    openPreviewModal(outUrl);
  }

  function openPreviewModal(outUrl) {
    const modal = document.createElement("div");
    let escBound = false;
    const onModalEsc = (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      closePreviewModal();
    };
    const closePreviewModal = () => {
      if (escBound) {
        window.removeEventListener("keydown", onModalEsc, true);
        escBound = false;
      }
      try { modal.remove(); } catch (_e) { }
      captureModalOpen = false;
      captureLocked = false;
      removeOverlay();
    };

    captureModalOpen = true;
    captureLocked = true;

    Object.assign(modal.style, {
      position: "fixed",
      left: 0, top: 0, width: "100%", height: "100%",
      background: "rgba(0,0,0,0.45)",
      zIndex: 2147483647
    });

    const wrap = document.createElement("div");
    Object.assign(wrap.style, {
      background: "#111",
      padding: "12px",
      borderRadius: "12px",
      maxWidth: "90%",
      maxHeight: "90%",
      boxShadow: "0 8px 24px rgba(0,0,0,.5)",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      alignItems: "center",
      position: "fixed",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)"
    });

    // Draggable by border/padding area (NOT by image/buttons)
    wrap.style.cursor = "move";
    let dragging = false;
    let dragOffX = 0, dragOffY = 0;
    const onDragMove = (e) => {
      if (!dragging) return;
      e.preventDefault();
      wrap.style.transform = "none";
      wrap.style.left = (e.clientX - dragOffX) + "px";
      wrap.style.top = (e.clientY - dragOffY) + "px";
    };
    const onDragUp = () => {
      if (!dragging) return;
      dragging = false;
      window.removeEventListener("pointermove", onDragMove, true);
      window.removeEventListener("pointerup", onDragUp, true);
    };
    wrap.addEventListener("pointerdown", (e) => {
      // Only when clicking the border/padding area: target must be wrap itself
      if (e.target !== wrap) return;
      e.preventDefault();
      const rect = wrap.getBoundingClientRect();
      dragging = true;
      dragOffX = e.clientX - rect.left;
      dragOffY = e.clientY - rect.top;
      window.addEventListener("pointermove", onDragMove, true);
      window.addEventListener("pointerup", onDragUp, true);
    }, true);

    const credit = document.createElement("a");
    credit.textContent = "";
    credit.href = "https://gw0212.github.io/";
    credit.target = "_blank";
    credit.rel = "noreferrer noopener";
    Object.assign(credit.style, {
      position: "absolute",
      top: "10px",
      right: "12px",
      fontSize: "12px",
      color: "#cbd5e1",
      textDecoration: "none",
      opacity: "0.9"
    });
    credit.addEventListener("mouseenter", () => credit.style.textDecoration = "underline");
    credit.addEventListener("mouseleave", () => credit.style.textDecoration = "none");

    const preview = document.createElement("img");
    preview.src = outUrl;
    preview.style.maxWidth = "80vw";
    preview.style.maxHeight = "70vh";
    preview.title = t("previewTitle");
    preview.style.cursor = "copy"; // inside area indicates copy action

    preview.draggable = false;
    preview.style.userSelect = "none";
    preview.style.webkitUserDrag = "none";
    preview.addEventListener("dragstart", (e) => { e.preventDefault(); e.stopPropagation(); }, true);
    preview.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); }, true);

    const bar = document.createElement("div");
    bar.style.display = "flex";
    bar.style.gap = "8px";

    function mkBtn(txt) {
      const b = document.createElement("button");
      b.textContent = txt;
      b.style.padding = "6px 10px";
      b.style.borderRadius = "8px";
      b.style.border = "1px solid #555";
      b.style.background = "#222";
      b.style.color = "#fff";
      b.style.cursor = "pointer";
      return b;
    }

    const copyBtn = mkBtn(t("copy"));
    const saveBtn = mkBtn(t("save"));
    const closeBtn = mkBtn(t("close"));
    bar.append(copyBtn, saveBtn, closeBtn);

    const copyToClipboard = async () => {
      const blob = await (await fetch(outUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      copyBtn.textContent = t("copied");
      setTimeout(() => { if (copyBtn.isConnected) copyBtn.textContent = t("copy"); }, 1200);
    };

    copyBtn.addEventListener("click", async () => {
      try { await copyToClipboard(); } catch (e) { alert("Clipboard copy failed: " + (e?.message || e)); }
    });

    // Left-click on the captured image -> always copy (repeatable)
    preview.addEventListener("click", async (e) => {
      // "click" is left button by default in most browsers; keep the guard anyway
      if (typeof e.button === "number" && e.button !== 0) return;
      try { await copyToClipboard(); } catch (err) { alert("Clipboard copy failed: " + (err?.message || err)); }
    }, true);

    saveBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "DOWNLOAD_IMAGE", payload: { dataUrl: outUrl, ext: "png" } }, () => { });
    });
    closeBtn.addEventListener("click", () => { closePreviewModal(); });

    // click outside -> close
    let bgPointerDown = false;
    modal.addEventListener("pointerdown", (e) => { bgPointerDown = (e.target === modal); }, true);
    modal.addEventListener("pointerup", (e) => {
      if (bgPointerDown && e.target === modal) { closePreviewModal(); }
      bgPointerDown = false;
    }, true);

    wrap.append(credit, preview, bar);
    modal.appendChild(wrap);
    document.documentElement.appendChild(modal);
    window.addEventListener("keydown", onModalEsc, true);
    escBound = true;

    const obs = new MutationObserver(() => {
      if (!document.documentElement.contains(modal)) {
        captureModalOpen = false;
        captureLocked = false;
        obs.disconnect();
      }
    });
    obs.observe(document.documentElement, { childList: true });
  }
})();