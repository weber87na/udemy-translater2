(() => {
  'use strict';
  if (document.getElementById('agent-course-zh')) return;
  const core = globalThis.UdemyZhCore;
  const host = document.createElement('div');
  host.id = 'agent-course-zh';
  host.style.cssText = 'position:fixed!important;inset:0!important;z-index:2147483646!important;pointer-events:none!important;';
  const root = host.attachShadow({mode:'open'});
  root.innerHTML = `
    <style>
      :host { all:initial; font:14px/1.5 system-ui,"Microsoft JhengHei",sans-serif; color:#edf4ff; }
      * { box-sizing:border-box; } [hidden] { display:none!important; }
      button,input { font:inherit; } button { cursor:pointer; border:0; }
      button:focus-visible,input:focus-visible,a:focus-visible { outline:3px solid #5ee0c1;outline-offset:3px; }
      #tools { position:fixed;pointer-events:auto;text-align:left;max-width:calc(100vw - 24px); }
      #toggle { float:right;border-radius:24px;padding:8px 14px;background:#12232ff0;color:#fff;box-shadow:0 2px 12px #0005;border:1px solid #ffffff28; }
      #toggle b { color:#64e7c7;margin-right:6px; } #toggle small { opacity:.7; }
      #panel { clear:both;width:300px;margin-top:46px;background:#11202ff5;border:1px solid #ffffff24;border-radius:16px;padding:18px;box-shadow:0 8px 32px #0005; }
      h2 { font-size:17px;margin:0 0 4px; } .eyebrow { color:#64e7c7;font-size:11px;letter-spacing:1.2px;margin:0 0 6px; }
      #status { font-size:12px;color:#aebed0;margin:10px 0 14px;white-space:pre-line; }
      label { display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px 0; }
      input[type=checkbox] { width:18px;height:18px;accent-color:#4bd8b4; } input[type=range] { width:120px;accent-color:#4bd8b4; }
      input[type=number] { width:70px;border:1px solid #ffffff30;border-radius:6px;background:#223547;color:#fff;padding:4px; }
      .note { margin:14px 0 0;font-size:11px;color:#93a6b9; } #name { font-size:12px;color:#d2dfeb;overflow-wrap:anywhere; }
      #subs { position:fixed;transform:translateX(-50%);text-align:center;pointer-events:none;line-height:1.45; }
      #zh,#en { display:table;margin:4px auto 0;white-space:pre-line;overflow-wrap:anywhere;background:#080e16dc;color:#fff;padding:3px 12px;border-radius:6px;text-shadow:0 1px 3px #000; }
      #zh { font-weight:600; } #en { color:#e0e8ef;font-size:.65em; }
      @media (prefers-reduced-motion:no-preference) { #toggle { transition:background .15s; } }
      #toggle:hover { background:#203b4d; }
    </style>
    <div id="tools">
      <button id="toggle" aria-expanded="true" aria-controls="panel"><b>繁中 CC</b><small>字幕設定</small></button>
      <section id="panel" aria-label="繁體中文字幕設定">
        <p class="eyebrow">COURSE SUBTITLES</p><h2>繁體中文字幕</h2>
        <div id="name"></div><p id="status" role="status">正在讀取字幕…</p>
        <label>顯示中文字幕<input id="enabled" type="checkbox" checked></label>
        <label>同時顯示英文<input id="bilingual" type="checkbox" checked></label>
        <label>字幕大小 <span><input id="fontSize" type="range" min="16" max="44" step="1" value="26" aria-label="字幕大小"> <output id="sizeValue">26</output></span></label>
        <label>字幕延後（秒）<input id="offset" type="number" min="-30" max="30" step="0.25" value="0"></label>
        <label>距影片底部 <input id="lift" type="range" min="40" max="200" step="5" value="80" aria-label="字幕距影片底部的像素"></label>
        <p class="note">預先翻譯 · 保留原字幕時間軸<br>譯文由 Codex 製作，不呼叫翻譯服務。<br>正數延後顯示；負數提前顯示。</p>
      </section>
    </div>
    <div id="subs" hidden><div id="zh" lang="zh-Hant"></div><div id="en" lang="en"></div></div>`;
  const ui = Object.fromEntries(['tools','toggle','panel','status','name','enabled','bilingual','fontSize','sizeValue','offset','lift','subs','zh','en'].map(id => [id, root.getElementById(id)]));
  let prefs = core.settings(), currentId = null, currentRoute = null, data = null, video = null, generation = 0;
  let lastText = '', knownVideo = null, index = null, indexError = '';
  const nativeStyle = document.createElement('style');
  nativeStyle.textContent = `html[data-agent-zh-active] [data-purpose="captions-cue-text"],html[data-agent-zh-active] [data-purpose="captions-display"],html[data-agent-zh-active] [class*="captions-display--captions-container"] { opacity:0!important; } video[data-agent-zh-active]::cue { color:transparent!important;background:transparent!important;text-shadow:none!important; }`;
  document.head.append(nativeStyle);
  document.body.append(host);

  async function jsonResource(path) {
    const res = await fetch(chrome.runtime.getURL(path));
    if (!res.ok) throw new Error('找不到字幕檔。');
    return res.json();
  }
  function clearNative() {
    document.documentElement.removeAttribute('data-agent-zh-active');
    knownVideo?.removeAttribute('data-agent-zh-active');
    knownVideo = null;
  }
  function resetDisplay() { ui.subs.hidden = true; ui.zh.textContent = ''; ui.en.textContent = ''; lastText = ''; clearNative(); }
  async function load(id) {
    const token = ++generation;
    currentRoute = new URL(location.href).pathname;
    currentId = id; data = null; resetDisplay();
    ui.name.textContent = '';
    if (!id) return;
    ui.status.textContent = '正在讀取這堂課的字幕…';
    try {
      const entry = index?.lectures?.find(item => item.lectureId === id);
      if (entry?.status === 'article') {
        ui.name.textContent = entry.title;
        ui.status.textContent = '這個單元是文章，沒有影片時間軸。';
        return;
      }
      if (!entry || entry.status !== 'complete') {
        ui.status.textContent = indexError || '這堂課尚未附上繁中譯文；保留 Udemy 原字幕。';
        ui.name.textContent = entry?.title || '';
        return;
      }
      const resource = core.dataPath(index, id, location.href);
      if (!resource) throw new Error('字幕課程與目前頁面不相符。');
      const next = core.validate(await jsonResource(resource), id, entry.courseId);
      if (token !== generation) return;
      data = next;
      ui.name.textContent = next.title;
      ui.status.textContent = `已載入 ${next.cues.length} 段固定字幕。\n播放、暫停、快轉及變速均依影片時間同步。`;
    } catch {
      if (token === generation) { data = null; ui.status.textContent = '字幕檔讀取失敗。請重新載入外掛及課程頁面。'; }
    }
  }
  function applyPrefs() {
    for (const key of ['enabled','bilingual']) ui[key].checked = prefs[key];
    for (const key of ['fontSize','offset','lift']) ui[key].value = prefs[key];
    ui.sizeValue.textContent = prefs.fontSize;
    ui.en.hidden = !prefs.bilingual;
    lastText = '';
    if (!prefs.enabled) resetDisplay();
  }
  ui.toggle.addEventListener('click', () => {
    ui.panel.hidden = !ui.panel.hidden;
    ui.toggle.setAttribute('aria-expanded', String(!ui.panel.hidden));
  });
  for (const key of ['enabled','bilingual','fontSize','offset','lift']) {
    ui[key].addEventListener('input', () => {
      prefs = core.settings({...prefs, [key]:ui[key].type === 'checkbox' ? ui[key].checked : Number(ui[key].value)});
      applyPrefs();
      chrome.storage.local.set({appearance:prefs}).catch(() => {});
    });
  }
  function position() {
    const full = document.fullscreenElement;
    const parent = full && full.tagName !== 'VIDEO' ? full : document.body;
    if (host.parentElement !== parent) parent.append(host);
    const rect = video?.getBoundingClientRect();
    const visible = rect && rect.width > 20 && rect.height > 20 && rect.bottom > 0 && rect.top < innerHeight;
    ui.tools.hidden = !currentId;
    ui.tools.style.top = `${Math.max(12, Math.min((rect?.top || 0) + 12, innerHeight - 80))}px`;
    ui.tools.style.right = `${Math.max(12, innerWidth - (rect?.right || innerWidth) + 12)}px`;
    if (visible) {
      ui.subs.style.left = `${rect.left + rect.width / 2}px`;
      ui.subs.style.top = `${rect.bottom - Math.min(prefs.lift, rect.height * .35)}px`;
      ui.subs.style.width = `${Math.max(100, rect.width - 40)}px`;
      ui.subs.style.transform = 'translate(-50%,-100%)';
      ui.subs.style.fontSize = `${Math.min(prefs.fontSize, rect.width / 18)}px`;
    }
    return visible;
  }
  function tick() {
    const id = core.lectureId(location.href);
    if (id !== currentId || new URL(location.href).pathname !== currentRoute) void load(id);
    const videos = [...document.querySelectorAll('video')];
    const nextVideo = videos.find(v => v.getBoundingClientRect().width > 20) || null;
    if (nextVideo !== video) { resetDisplay(); video = nextVideo; }
    const visible = position();
    if (!data || !prefs.enabled || !video || !visible || video.ended) { resetDisplay(); return; }
    const cue = core.cueAt(data.cues, video.currentTime - prefs.offset);
    if (!cue) { resetDisplay(); return; }
    const textKey = `${cue.zh}\u0000${cue.en}`;
    if (textKey !== lastText) {
      ui.zh.textContent = cue.zh;
      ui.en.textContent = cue.en;
      lastText = textKey;
    }
    ui.subs.hidden = false;
    // Keep long bilingual cues inside a small/theater-mode player as well.
    const rect = video.getBoundingClientRect();
    const availableHeight = Math.min(rect.height * .42, rect.height - Math.min(prefs.lift, rect.height * .35) - 12);
    const height = ui.subs.getBoundingClientRect().height;
    if (height > availableHeight && availableHeight > 0) {
      const currentSize = parseFloat(ui.subs.style.fontSize);
      ui.subs.style.fontSize = `${Math.max(10, currentSize * availableHeight / height * .95)}px`;
    }
    document.documentElement.setAttribute('data-agent-zh-active','');
    video.setAttribute('data-agent-zh-active','');
    knownVideo = video;
  }
  async function start() {
    try { prefs = core.settings((await chrome.storage.local.get('appearance')).appearance); } catch { /* Defaults work without storage. */ }
    applyPrefs();
    try { index = await jsonResource('data/index.json'); } catch { indexError = '找不到字幕目錄，請確認外掛 data 資料夾完整。'; }
    await load(core.lectureId(location.href));
    tick();
    setInterval(tick, 100);
  }
  void start();
})();
