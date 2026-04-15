function normKey(k){ const map={ "Control":"Ctrl","Alt":"Alt","Shift":"Shift","Meta":"Command","OS":"Command" }; if(map[k]) return map[k]; if(k.length===1) return k.toUpperCase(); return k; }
function comboToText(arr){ const mods=["Ctrl","Command","Alt","Shift"]; return [...arr].sort((a,b)=>mods.indexOf(a)-mods.indexOf(b)).join("+"); }

const I18N = {
  ko: {
    subtitle: "빠른 영역 캡쳐 · 단축키 설정",
    startCapture: "영역 캡쳐 시작",
    capturePill: "캡쳐",
    setShortcut: "단축키 지정",
    settingsPill: "설정",
    shortcut: "단축키",
    waiting: "(입력 대기 중)",
    pressKeys: "지정할 키를 동시에 눌러주세요…",
    muted: "단축키는 선택 모드에서만 적용됩니다.",
    warn: "이 페이지에서는 확장이 실행되지 않을 수 있습니다.",
    cannotRun: "이 페이지에서는 실행할 수 없습니다.",
  },
  en: {
    subtitle: "Quick region capture · Shortcut",
    startCapture: "Start region capture",
    capturePill: "CAPTURE",
    setShortcut: "Set shortcut",
    settingsPill: "SET",
    shortcut: "Shortcut",
    waiting: "(waiting...)",
    pressKeys: "Press the keys together…",
    muted: "Shortcut works only in selection mode.",
    warn: "This extension may not run on this page.",
    cannotRun: "Cannot run on this page.",
  },
  ja: {
    subtitle: "クイック範囲キャプチャ · ショートカット",
    startCapture: "範囲キャプチャ開始",
    capturePill: "キャプチャ",
    setShortcut: "ショートカット設定",
    settingsPill: "設定",
    shortcut: "ショートカット",
    waiting: "(入力待機中)",
    pressKeys: "同時にキーを押してください…",
    muted: "ショートカットは選択モードでのみ有効です。",
    warn: "このページでは拡張機能が動作しない場合があります。",
    cannotRun: "このページでは実行できません。",
  },
  zh: {
    subtitle: "快速区域截图 · 快捷键",
    startCapture: "开始区域截图",
    capturePill: "截图",
    setShortcut: "设置快捷键",
    settingsPill: "设置",
    shortcut: "快捷键",
    waiting: "(等待输入…)",
    pressKeys: "请同时按下按键…",
    muted: "快捷键仅在选择模式下有效。",
    warn: "该页面可能无法运行扩展。",
    cannotRun: "此页面无法运行。",
  },
  fr: {
    subtitle: "Capture de zone · Raccourci",
    startCapture: "Démarrer la capture",
    capturePill: "CAPTURE",
    setShortcut: "Définir le raccourci",
    settingsPill: "RÉGLAGE",
    shortcut: "Raccourci",
    waiting: "(en attente...)",
    pressKeys: "Appuyez sur les touches en même temps…",
    muted: "Le raccourci ne fonctionne qu’en mode sélection.",
    warn: "L’extension peut ne pas fonctionner sur cette page.",
    cannotRun: "Impossible sur cette page.",
  },
  de: {
    subtitle: "Schnelle Bereichsaufnahme · Tastenkürzel",
    startCapture: "Bereichsaufnahme starten",
    capturePill: "AUFNAHME",
    setShortcut: "Tastenkürzel festlegen",
    settingsPill: "EINSTELLEN",
    shortcut: "Tastenkürzel",
    waiting: "(Warte auf Eingabe...)",
    pressKeys: "Drücken Sie die Tasten gleichzeitig…",
    muted: "Das Tastenkürzel funktioniert nur im Auswahlmodus.",
    warn: "Diese Erweiterung funktioniert auf dieser Seite möglicherweise nicht.",
    cannotRun: "Auf dieser Seite nicht ausführbar.",
  },
  nl: {
    subtitle: "Snelle gebiedscapture · Sneltoets",
    startCapture: "Gebiedscapture starten",
    capturePill: "CAPTURE",
    setShortcut: "Sneltoets instellen",
    settingsPill: "INSTELLEN",
    shortcut: "Sneltoets",
    waiting: "(wachten op invoer...)",
    pressKeys: "Druk de toetsen tegelijk in…",
    muted: "De sneltoets werkt alleen in de selectiemodus.",
    warn: "Deze extensie werkt mogelijk niet op deze pagina.",
    cannotRun: "Kan niet op deze pagina worden uitgevoerd.",
  },
};

let uiLang = "ko";
const t = (k)=> (I18N[uiLang] && I18N[uiLang][k]) ? I18N[uiLang][k] : (I18N.ko[k] ?? k);

async function ensureInjected(tabId){
  const ping = () => new Promise((resolve)=> {
    chrome.tabs.sendMessage(tabId, {type:"PING"}, (res)=> {
      if (chrome.runtime.lastError) { resolve(false); return; }
      resolve(Boolean(res && res.pong));
    });
  });
  let ok = await ping();
  if (!ok) {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
      ok = await ping();
    } catch (e) { ok = false; }
  }
  return ok;
}

document.addEventListener("DOMContentLoaded", async () => {
  const captureBtn = document.getElementById("captureBtn");
  const setBtn = document.getElementById("setShortcutBtn");
  const disp = document.getElementById("shortcutDisplay");
  const hint = document.getElementById("recordHint");
  const warn = document.getElementById("warn");
  const langSelect = document.getElementById("langSelect");

  // load lang
  const cfgAll = await chrome.storage.sync.get(["customShortcut","uiLang"]);
  if (cfgAll.uiLang && I18N[cfgAll.uiLang]) uiLang = cfgAll.uiLang;
  if (langSelect) langSelect.value = uiLang;

  let combo = Array.isArray(cfgAll.customShortcut) ? cfgAll.customShortcut : ["Ctrl","Shift","1"];

  // apply i18n to popup
  function applyTexts(){
    const subtitleEl = document.querySelector(".subtitle");
    if (subtitleEl) subtitleEl.textContent = t("subtitle");

    const capLabel = captureBtn.querySelector(".btnLabel");
    const capPill = captureBtn.querySelector(".pill");
    if (capLabel) capLabel.textContent = t("startCapture");
    if (capPill) capPill.textContent = t("capturePill");

    const setLabel = setBtn.querySelector(".btnLabel");
    const setPill = setBtn.querySelector(".pill");
    if (setLabel) setLabel.textContent = t("setShortcut");
    if (setPill) setPill.textContent = t("settingsPill");

    disp.textContent = `${t("shortcut")}: ${comboToText(combo)}`;
    hint.textContent = t("pressKeys");

    const mutedEl = document.querySelector(".muted");
    if (mutedEl) mutedEl.textContent = t("muted");

    warn.textContent = t("warn");
  }
  applyTexts();

  if (langSelect){
    langSelect.addEventListener("change", async ()=>{
      const val = langSelect.value;
      uiLang = (I18N[val] ? val : "ko");
      await chrome.storage.sync.set({ uiLang: uiLang });
      applyTexts();
    });
  }

  chrome.tabs.query({active:true, currentWindow:true}, ([tab])=>{
    if ((tab && /^chrome(:|-)\/\//.test(tab.url || "")) || (tab && tab.url && tab.url.startsWith("chrome://"))) {
      warn.style.display = "block";
    }
  });

  captureBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({active:true, currentWindow:true});
    if (!tab?.id) return;
    const ready = await ensureInjected(tab.id);
    if (!ready) { alert(t("cannotRun")); return; }
    chrome.tabs.sendMessage(tab.id, {type:"START_SELECTION"}, () => { void chrome.runtime.lastError; });
    window.close();
  });

  setBtn.addEventListener("click", () => {
    hint.style.display = "block";
    disp.textContent = `${t("shortcut")}: ${t("waiting")}`;
    const pressed = new Set();
    let finished = false, timer = null;

    function cancel(){
      if (finished) return;
      finished = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener("keydown", onDown, true);
      window.removeEventListener("keyup", onUp, true);
      hint.style.display = "none";
      disp.textContent = `${t("shortcut")}: ${comboToText(combo)}`;
    }

    function finish(){
      if (finished) return;
      finished = true;
      window.removeEventListener("keydown", onDown, true);
      window.removeEventListener("keyup", onUp, true);
      hint.style.display = "none";
      const arr = Array.from(pressed).map(normKey).filter(Boolean);
      if (arr.length){
        chrome.storage.sync.set({customShortcut: arr});
        combo = arr;
        disp.textContent = `${t("shortcut")}: ${comboToText(arr)}`;
      }else{
        disp.textContent = `${t("shortcut")}: ${comboToText(combo)}`;
      }
    }
    function onDown(e){
      if (e.key === "Escape") {
        e.preventDefault(); e.stopPropagation(); cancel(); return;
      }
      e.preventDefault(); e.stopPropagation();
      pressed.add(normKey(e.key));
      if (timer) clearTimeout(timer);
      timer = setTimeout(finish, 400);
    }
    function onUp(e){
      e.preventDefault(); e.stopPropagation();
      if (timer) clearTimeout(timer);
      timer = setTimeout(finish, 120);
    }

    window.addEventListener("keydown", onDown, true);
    window.addEventListener("keyup", onUp, true);
  });
});
