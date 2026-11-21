/* ============================================================
   Blaise Phone · 桌面 / 状态栏 / 应用容器 / 弹层
   ============================================================ */
(function () {
  const S = () => PHONE.state;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  let editing = false;
  let lockOpen = false;
  let battery = { level: 87, charging: false };
  let clockTimer = null;
  let tickTimer = null;
  let suppressClickUntil = 0;
  let pressTimer = null;
  let pressStart = null;
  let pendingDrag = null;
  let drag = null;

  PHONE.currentApp = null;
  PHONE.editing = () => editing;

  const appLayer = () => document.getElementById('app-layer');
  const desktopEl = () => document.getElementById('desktop');
  const phoneEl = () => document.getElementById('phone');

  /* ---------------- 颜色 ---------------- */
  function hexToRgb(hex) {
    let h = String(hex || '#7c6a8a').replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function shade(hex, pct) {
    const { r, g, b } = hexToRgb(hex);
    const f = (v) => Math.round(Math.max(0, Math.min(255, v + (pct < 0 ? v * pct : (255 - v) * pct))));
    return `#${[f(r), f(g), f(b)].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
  }
  function rgba(hex, a) { const { r, g, b } = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }

  function wallpaperCSS() {
    const t = S().theme;
    if (t.wallpaper) return `url("${t.wallpaper}")`;
    const preset = (PHONE.WALLPAPERS || []).find((w) => w.id === t.preset);
    return preset ? preset.css : 'linear-gradient(160deg,#f3eef1 0%,#e7dfe9 42%,#d5cede 100%)';
  }

  PHONE.applyTheme = function () {
    const t = S().theme;
    const phone = phoneEl();
    if (!phone) return;
    phone.style.setProperty('--accent', t.accent);
    phone.style.setProperty('--accent-deep', shade(t.accent, -0.22));
    phone.style.setProperty('--accent-soft', rgba(t.accent, 0.14));
    phone.style.setProperty('--accent-glow', rgba(t.accent, 0.32));
    phone.classList.toggle('dark-wall', !t.wallpaper && (t.preset === 'ink' || t.preset === 'night'));
    const wall = phone.querySelector('[data-wall]');
    if (wall) {
      wall.style.backgroundImage = wallpaperCSS();
      wall.style.filter = t.blur ? `blur(${t.blur}px)` : '';
      wall.style.transform = t.blur ? 'scale(1.06)' : '';
    }
    const dim = phone.querySelector('[data-wall-dim]');
    if (dim) dim.style.opacity = String((Number(t.dim) || 0) / 100);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t.preset === 'ink' ? '#1f1d24' : '#e9e2ea');
  };

  PHONE.applyFont = async function () {
    const t = S().theme;
    const root = document.documentElement;
    if (t.font && t.font.data) {
      const family = 'BlaiseFont' + String(t.font.data.length);
      try {
        if (!document.fonts.check(`16px ${family}`)) {
          const face = new FontFace(family, `url(${t.font.data})`);
          await face.load();
          document.fonts.add(face);
        }
        root.style.setProperty('--app-font', `"${family}", -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif`);
        return;
      } catch (e) { console.warn(e); }
    }
    root.style.setProperty('--app-font', '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif');
  };

  /* ---------------- 状态栏 ---------------- */
  function batteryHTML() {
    const pct = PHONE.clamp(Math.round(battery.level), 0, 100);
    return `<span class="status-battery ${battery.charging ? 'charging' : ''}"><span class="battery-shell"><i style="width:${pct}%"></i></span>${S().statusbar.batteryPercent ? `<em>${pct}%</em>` : ''}</span>`;
  }
  function statusHTML() {
    const st = S();
    const signal = PHONE.clamp(Number(st.statusbar.signal) || 4, 1, 4);
    return `<div class="status-left">
        <span class="status-time" data-status-time>${PHONE.fmtClock(PHONE.now())}</span>
        ${st.statusbar.showName ? `<span class="status-name">${PHONE.esc(st.profile.contactName)}</span>` : ''}
      </div>
      <div class="status-right">
        <span class="status-signal">${[1, 2, 3, 4].map((i) => `<i class="${i <= signal ? 'on' : ''}" style="height:${5 + i * 2.5}px"></i>`).join('')}</span>
        ${st.statusbar.bluetooth ? `<span class="status-bt">${PHONE.icon('bluetooth', 14, 2)}</span>` : ''}
        ${batteryHTML()}
      </div>`;
  }
  function renderStatusBar() {
    const el = document.getElementById('statusbar');
    if (el) el.innerHTML = statusHTML();
  }
  function updateClock() {
    const t = $('[data-status-time]');
    if (t) t.textContent = PHONE.fmtClock(PHONE.now());
    const lt = $('[data-lock-time]');
    if (lt) {
      const d = new Date(PHONE.now());
      lt.innerHTML = `<b>${String(d.getHours()).padStart(2, '0')}</b><i>:</i><b>${String(d.getMinutes()).padStart(2, '0')}</b>`;
    }
    const ld = $('[data-lock-date]');
    if (ld) ld.textContent = `${PHONE.fmtDateCN(PHONE.now())} · ${PHONE.weekdayCN(PHONE.now())}`;
  }
  PHONE.updateClock = updateClock;

  PHONE.applyChrome = function () {
    const st = S();
    phoneEl()?.classList.toggle('fullscreen', !!st.settings.fullscreen);
    renderStatusBar();
    resizePhoneVars();
  };
  function resizePhoneVars() {
    const phone = phoneEl(); if (!phone) return;
    const sy = phone.querySelector('#statusbar');
    const h = sy && !S().settings.fullscreen ? sy.getBoundingClientRect().height : 0;
    phone.style.setProperty('--status-h', h + 'px');
  }

  /* ---------------- 桌面渲染 ---------------- */
  function appIconHTML(app) {
    const custom = S().appIcons[app.id];
    return `<span class="app-icon" style="--app-color:${app.color || '#b8b0c4'}">${custom ? `<img src="${custom}" alt="">` : PHONE.icon(app.icon, 29, 1.6)}</span>`;
  }
  function badgeCount(appId) {
    if (appId === 'chat') return S().chat.unread || 0;
    if (appId === 'mailbox') return (S().mailbox.letters || []).filter((l) => l.dir === 'in' && !l.read).length;
    if (appId === 'moments') return S().moments.unread || 0;
    return 0;
  }
  function appItemHTML(item) {
    const app = PHONE.getApp(item.app);
    if (!app) return `<div class="desk-item app-missing" data-id="${item.id}"><span class="app-icon">?</span><span class="app-name">已移除</span></div>`;
    const n = badgeCount(app.id);
    return `<div class="desk-item desk-app-item" data-id="${item.id}" data-app="${app.id}">
      ${editing ? `<button class="item-del" data-del="${item.id}" aria-label="删除">${PHONE.icon('close', 11)}</button>` : ''}
      <button class="desk-app" data-open="${app.id}">
        <span class="app-icon-wrap">${appIconHTML(app)}${n ? `<span class="app-badge">${n > 99 ? '99+' : n}</span>` : ''}</span>
        <span class="app-name">${PHONE.esc(app.name)}</span>
      </button>
    </div>`;
  }
  function widgetItemHTML(item) {
    const w = PHONE.getWidget(item.widget);
    if (!w) return `<div class="desk-item desk-widget" data-id="${item.id}"><div class="widget widget-missing">小组件已移除</div></div>`;
    let inner = '';
    try { inner = w.render(item); } catch (e) { inner = `<div class="widget widget-missing">小组件加载失败</div>`; console.warn(e); }
    return `<div class="desk-item desk-widget" data-id="${item.id}" data-widget="${w.id}">
      ${editing ? `<button class="item-del widget-del" data-del="${item.id}" aria-label="删除">${PHONE.icon('close', 11)}</button>` : ''}
      <div class="widget widget-${w.id}">${inner}</div>
    </div>`;
  }
  function pageHTML(page, idx) {
    return `<section class="desktop-page" data-page-index="${idx}">
      <div class="page-scroll">
        <div class="desktop-grid" data-grid="${page.id}">
          ${page.items.map((it) => it.type === 'widget' ? widgetItemHTML(it) : appItemHTML(it)).join('')}
          ${editing ? `<button class="add-tile" data-add-tile>${PHONE.icon('plus', 22)}<span>添加</span></button>` : ''}
        </div>
        <div class="page-bottom-space"></div>
      </div>
    </section>`;
  }

  PHONE.renderDesktop = function () {
    const st = S();
    const desk = desktopEl();
    if (!desk) return;
    if (!st.desktop.pages.length) st.desktop.pages.push({ id: PHONE.uid('p_'), name: '主页', items: [] });
    st.desktop.current = PHONE.clamp(Number(st.desktop.current) || 0, 0, st.desktop.pages.length - 1);
    const wall = `<div class="wall-paper" data-wall></div><div class="wall-dim" data-wall-dim></div><div class="wall-grain"></div>`;
    desk.innerHTML = `${wall}
      <div class="desktop-pages" data-pages>${st.desktop.pages.map(pageHTML).join('')}</div>
      <div class="page-dots" data-dots>${st.desktop.pages.map((p, i) => `<button class="${i === st.desktop.current ? 'active' : ''}" data-dot="${i}" aria-label="第 ${i + 1} 页"></button>`).join('')}${editing ? `<button class="dot-add" data-page-add-inline aria-label="添加页面">${PHONE.icon('plus', 11)}</button>` : ''}</div>
      ${editing
        ? `<div class="edit-top"><span>拖动图标调整顺序</span><button class="edit-done" data-done>完成</button></div>`
        : `<button class="desk-fab" data-desk-menu aria-label="桌面菜单">${PHONE.icon('grid', 19)}</button>`}`;
    applyEditClass();
    PHONE.applyTheme();
    const pages = desk.querySelector('[data-pages]');
    if (pages) {
      requestAnimationFrame(() => { pages.scrollLeft = st.desktop.current * pages.clientWidth; });
      pages.addEventListener('scroll', onPagesScroll, { passive: true });
    }
    updateDots();
    PHONE.updateBadges();
  };

  function applyEditClass() {
    const phone = phoneEl();
    if (phone) phone.classList.toggle('editing', editing);
  }

  function updateDots() {
    const st = S();
    const dots = $$('[data-dot]');
    dots.forEach((d, i) => d.classList.toggle('active', i === st.desktop.current));
  }
  let scrollRaf = 0;
  function onPagesScroll(e) {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      const el = e.currentTarget;
      if (!el || !el.clientWidth) return;
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      if (S().desktop.current !== idx) {
        S().desktop.current = idx;
        PHONE.save();
        updateDots();
      }
    });
  }
  function goPage(idx, smooth) {
    const st = S();
    const pages = $('[data-pages]');
    if (!pages) return;
    st.desktop.current = PHONE.clamp(idx, 0, st.desktop.pages.length - 1);
    pages.scrollTo({ left: st.desktop.current * pages.clientWidth, behavior: smooth === false ? 'auto' : 'smooth' });
    PHONE.save(); updateDots();
  }

  PHONE.updateBadges = function () {
    $$('.desk-app-item[data-app]').forEach((item) => {
      const appId = item.dataset.app;
      const n = badgeCount(appId);
      const wrap = item.querySelector('.app-icon-wrap');
      if (!wrap) return;
      let b = wrap.querySelector('.app-badge');
      if (n) {
        if (!b) { b = document.createElement('span'); b.className = 'app-badge'; wrap.appendChild(b); }
        b.textContent = n > 99 ? '99+' : n;
      } else if (b) b.remove();
    });
  };

  /* ---------------- 编辑 / 拖拽 ---------------- */
  PHONE.enterEditMode = function () {
    if (editing) return;
    editing = true;
    applyEditClass();
    PHONE.renderDesktop();
    PHONE.toast('拖动图标调整位置，点右上角完成', 2600);
  };
  PHONE.exitEditMode = function () {
    editing = false;
    applyEditClass();
    PHONE.renderDesktop();
  };

  function onDesktopPointerDown(e) {
    if (e.button != null && e.button !== 0) return;
    const item = e.target.closest('.desk-item');
    if (!item || e.target.closest('.item-del') || e.target.closest('.widget-mini') || e.target.closest('[data-add-tile]')) return;
    if (editing) {
      pendingDrag = { item, x: e.clientX, y: e.clientY, id: e.pointerId };
      return;
    }
    pressStart = { x: e.clientX, y: e.clientY, item };
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      pressTimer = null; pressStart = null;
      PHONE.enterEditMode();
    }, 620);
  }
  function onWindowPointerMove(e) {
    if (pressTimer && pressStart) {
      if (Math.abs(e.clientX - pressStart.x) + Math.abs(e.clientY - pressStart.y) > 12) { clearTimeout(pressTimer); pressTimer = null; }
    }
    if (pendingDrag && !drag) {
      if (Math.abs(e.clientX - pendingDrag.x) + Math.abs(e.clientY - pendingDrag.y) > 8) {
        beginDrag(pendingDrag.item, e.clientX, e.clientY);
        pendingDrag = null;
      }
    }
    if (drag) moveDrag(e.clientX, e.clientY);
  }
  function onWindowPointerUp() {
    clearTimeout(pressTimer); pressTimer = null; pressStart = null;
    pendingDrag = null;
    if (drag) endDrag();
  }

  function beginDrag(item, x, y) {
    const r = item.getBoundingClientRect();
    const ghost = item.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.style.width = r.width + 'px';
    ghost.style.height = r.height + 'px';
    ghost.style.left = '0'; ghost.style.top = '0';
    ghost.style.transform = `translate(${r.left}px, ${r.top}px)`;
    phoneEl().appendChild(ghost);
    item.classList.add('drag-origin');
    drag = { item, ghost, offsetX: x - r.left, offsetY: y - r.top, startX: x, startY: y, moved: false, page: item.closest('.desktop-page'), pageScroll: item.closest('.page-scroll') };
    phoneEl().classList.add('dragging');
  }
  function moveDrag(x, y) {
    if (!drag) return;
    if (Math.abs(x - drag.startX) + Math.abs(y - drag.startY) > 4) drag.moved = true;
    drag.ghost.style.transform = `translate(${x - drag.offsetX}px, ${y - drag.offsetY}px)`;
    // 边缘自动纵向滚动
    if (drag.pageScroll) {
      const pr = drag.pageScroll.getBoundingClientRect();
      if (y < pr.top + 60) drag.pageScroll.scrollTop -= 8;
      else if (y > pr.bottom - 70) drag.pageScroll.scrollTop += 8;
    }
    drag.ghost.style.display = 'none';
    const el = document.elementFromPoint(x, y);
    drag.ghost.style.display = '';
    const target = el && el.closest('.desk-item');
    if (target && target !== drag.item && target.closest('.desktop-page') === drag.page) {
      const tr = target.getBoundingClientRect();
      const after = y > tr.top + tr.height * 0.58 || (y > tr.top + tr.height * 0.25 && x > tr.left + tr.width * 0.55);
      const parent = target.parentNode;
      if (after) parent.insertBefore(drag.item, target.nextSibling);
      else parent.insertBefore(drag.item, target);
    }
    const addTile = el && el.closest('[data-add-tile]');
    if (addTile && addTile.parentNode) {
      addTile.parentNode.insertBefore(drag.item, addTile);
    }
  }
  function endDrag() {
    if (!drag) return;
    const { item, ghost, moved, page } = drag;
    ghost.remove();
    item.classList.remove('drag-origin');
    phoneEl().classList.remove('dragging');
    drag = null;
    if (!moved) return;
    const st = S();
    const idx = Number(page.dataset.pageIndex);
    const p = st.desktop.pages[idx];
    if (p) {
      const ids = $$('.desk-item', page.querySelector('.desktop-grid')).map((el) => el.dataset.id);
      const map = new Map(p.items.map((it) => [it.id, it]));
      p.items = ids.map((id) => map.get(id)).filter(Boolean);
      PHONE.save();
    }
    suppressClickUntil = Date.now() + 350;
    PHONE.renderDesktop();
  }

  function deleteItem(id) {
    const st = S();
    const page = st.desktop.pages.find((p) => p.items.some((i) => i.id === id));
    if (!page) return;
    page.items = page.items.filter((i) => i.id !== id);
    PHONE.save(); PHONE.renderDesktop();
    PHONE.toast('已从桌面移除');
  }

  /* ---------------- 添加 ---------------- */
  function addSheet(kind) {
    const st = S();
    const page = st.desktop.pages[st.desktop.current];
    if (!page) return;
    const existingApps = new Set(page.items.filter((i) => i.type === 'app').map((i) => i.app));
    const host = document.createElement('div');
    if (kind === 'app') {
      host.innerHTML = `<div class="add-gallery">${PHONE.apps.map((a) => `<button class="add-app ${existingApps.has(a.id) ? 'added' : ''}" data-add-app="${a.id}" ${existingApps.has(a.id) ? 'disabled' : ''}>
        <span class="app-icon" style="--app-color:${a.color}">${PHONE.icon(a.icon, 27)}</span><span>${a.name}</span>${existingApps.has(a.id) ? '<em>已添加</em>' : ''}
      </button>`).join('')}</div>`;
    } else {
      host.innerHTML = `<div class="add-gallery widgets">${PHONE.widgets.map((w) => `<button class="add-widget" data-add-widget="${w.id}">
        <span class="add-widget-ico">${PHONE.icon(w.icon || 'sparkle', 22)}</span><span><b>${w.name}</b><small>${w.desc || '可随时移除、拖动'}</small></span>${PHONE.icon('plus', 16)}
      </button>`).join('')}</div>`;
    }
    const sheet = PHONE.sheet({ title: kind === 'app' ? '添加软件' : '添加小组件', subtitle: '添加到当前桌面页', content: host });
    host.addEventListener('click', (e) => {
      const appId = e.target.closest('[data-add-app]')?.dataset.addApp;
      const widgetId = e.target.closest('[data-add-widget]')?.dataset.addWidget;
      if (appId) {
        page.items.push({ id: PHONE.uid('i_'), type: 'app', app: appId });
        PHONE.save(); sheet.close(); PHONE.renderDesktop(); PHONE.toast('已添加'); return;
      }
      if (widgetId) {
        page.items.push({ id: PHONE.uid('i_'), type: 'widget', widget: widgetId, data: {} });
        PHONE.save(); sheet.close(); PHONE.renderDesktop(); PHONE.toast('已添加'); return;
      }
    });
  }

  function deskMenu() {
    const host = document.createElement('div');
    host.innerHTML = `<div class="desk-menu">
      <button data-menu-act="edit"><span>${PHONE.icon('grid', 22)}</span><b>编辑桌面</b><small>拖动、删除、添加</small></button>
      <button data-menu-act="widget"><span>${PHONE.icon('sparkle', 22)}</span><b>添加小组件</b><small>卡片会出现在当前页</small></button>
      <button data-menu-act="app"><span>${PHONE.icon('plus', 22)}</span><b>添加软件</b><small>从已安装软件中选择</small></button>
      <button data-menu-act="page"><span>${PHONE.icon('cards', 22)}</span><b>添加页面</b><small>左右滑动切换</small></button>
      <button data-menu-act="beautify"><span>${PHONE.icon('palette', 22)}</span><b>桌面美化</b><small>壁纸、颜色、字体</small></button>
      <button data-menu-act="lock"><span>${PHONE.icon('lock', 22)}</span><b>锁屏</b><small>预览锁屏通知</small></button>
    </div>`;
    const sheet = PHONE.sheet({ title: '桌面', subtitle: '把日常摆成喜欢的样子', content: host });
    host.addEventListener('click', (e) => {
      const act = e.target.closest('[data-menu-act]')?.dataset.menuAct;
      if (!act) return;
      sheet.close();
      if (act === 'edit') PHONE.enterEditMode();
      else if (act === 'widget') addSheet('widget');
      else if (act === 'app') addSheet('app');
      else if (act === 'page') {
        S().desktop.pages.push({ id: PHONE.uid('p_'), name: '新页面', items: [] });
        S().desktop.current = S().desktop.pages.length - 1;
        PHONE.save(); PHONE.renderDesktop(); PHONE.toast('已添加页面');
      } else if (act === 'beautify') {
        PHONE.openApp('settings');
        setTimeout(() => PHONE.settingsApp && PHONE.settingsApp.openBeautify(), 80);
      } else if (act === 'lock') showLock();
    });
  }

  /* ---------------- 应用容器 ---------------- */
  PHONE.openApp = function (id) {
    const app = PHONE.getApp(id);
    if (!app) { PHONE.toast('软件不存在'); return; }
    if (PHONE.currentApp === id) return;
    if (PHONE.currentApp) PHONE.closeApp(true);
    const layer = appLayer();
    layer.innerHTML = '';
    layer.classList.add('active');
    const win = document.createElement('div');
    win.className = 'app-window app-' + id;
    layer.appendChild(win);
    PHONE.currentApp = id;
    if (id === 'chat') { S().chat.unread = 0; PHONE.save(); }
    if (id === 'moments') { S().moments.unread = 0; PHONE.save(); }
    try { app.render(win); } catch (e) {
      console.error(e);
      win.innerHTML = `<div class="app-crash"><b>这个页面遇到了一点问题</b><p>${PHONE.esc(e.message || '')}</p><button class="btn primary" onclick="PHONE.closeApp()">返回桌面</button></div>`;
    }
    requestAnimationFrame(() => win.classList.add('open'));
    PHONE.updateBadges();
  };

  PHONE.closeApp = function (instant) {
    const layer = appLayer();
    if (!layer || !PHONE.currentApp) return;
    const app = PHONE.getApp(PHONE.currentApp);
    try { if (app && app.onClose) app.onClose(); } catch (e) { console.warn(e); }
    const win = layer.querySelector('.app-window');
    PHONE.currentApp = null;
    if (win) {
      win.classList.remove('open');
      win.classList.add('closing');
      setTimeout(() => { if (!PHONE.currentApp) { layer.innerHTML = ''; layer.classList.remove('active'); } }, instant ? 0 : 230);
    } else {
      layer.innerHTML = ''; layer.classList.remove('active');
    }
    PHONE.updateBadges();
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const overlays = document.getElementById('overlay-layer');
      if (overlays && overlays.lastElementChild) { overlays.lastElementChild.remove(); return; }
      if (PHONE.currentApp) PHONE.closeApp();
    }
  });

  /* ---------------- 桌面事件 ---------------- */
  function bindDesktop() {
    const desk = desktopEl();
    if (!desk) return;
    desk.addEventListener('pointerdown', onDesktopPointerDown);
    window.addEventListener('pointermove', onWindowPointerMove, { passive: true });
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerUp);

    desk.addEventListener('click', (e) => {
      if (Date.now() < suppressClickUntil) return;
      const del = e.target.closest('[data-del]')?.dataset.del;
      if (del) { deleteItem(del); return; }
      const done = e.target.closest('[data-done]');
      if (done) { PHONE.exitEditMode(); return; }
      const dot = e.target.closest('[data-dot]')?.dataset.dot;
      if (dot != null) { goPage(Number(dot)); return; }
      const inlineAdd = e.target.closest('[data-page-add-inline]');
      if (inlineAdd) {
        S().desktop.pages.push({ id: PHONE.uid('p_'), name: '新页面', items: [] });
        S().desktop.current = S().desktop.pages.length - 1;
        PHONE.save(); PHONE.renderDesktop(); return;
      }
      const fab = e.target.closest('[data-desk-menu]');
      if (fab) { deskMenu(); return; }
      const addTile = e.target.closest('[data-add-tile]');
      if (addTile) { addSheet('widget'); return; }
      const reroll = e.target.closest('[data-act="reroll"]');
      if (reroll) {
        const item = reroll.closest('.desk-item');
        if (item) {
          const page = S().desktop.pages.find((p) => p.items.some((i) => i.id === item.dataset.id));
          const data = page && page.items.find((i) => i.id === item.dataset.id);
          if (data) { data.data = data.data || {}; data.data.offset = PHONE.randInt(1, 999); data.data.text = ''; PHONE.save(); PHONE.renderDesktop(); PHONE.toast('已换一句'); }
        }
        return;
      }
      const item = e.target.closest('.desk-item');
      if (!item) return;
      if (editing) {
        if (item.dataset.widget) {
          const w = PHONE.getWidget(item.dataset.widget);
          const page = S().desktop.pages.find((p) => p.items.some((i) => i.id === item.dataset.id));
          const data = page && page.items.find((i) => i.id === item.dataset.id);
          if (w && w.editor && data) w.editor(data, w);
        }
        return;
      }
      if (item.dataset.widget) {
        const w = PHONE.getWidget(item.dataset.widget);
        const page = S().desktop.pages.find((p) => p.items.some((i) => i.id === item.dataset.id));
        const data = page && page.items.find((i) => i.id === item.dataset.id);
        if (w && w.editor && data) w.editor(data, w);
      } else if (item.dataset.app) {
        PHONE.openApp(item.dataset.app);
      }
    });

    // 页面尺寸变化
    window.addEventListener('resize', resizePhoneVars);
  }

  /* ---------------- 弹层 ---------------- */
  let sheetZ = 100;
  PHONE.sheet = function (opts) {
    const layer = document.getElementById('overlay-layer');
    const overlay = document.createElement('div');
    overlay.className = 'sheet-overlay';
    overlay.style.zIndex = String(sheetZ++);
    const title = opts.title || '';
    const subtitle = opts.subtitle || '';
    overlay.innerHTML = `<div class="sheet ${opts.className || ''}">
      <div class="sheet-grab"><i></i></div>
      <header class="sheet-head">
        <div><h2>${PHONE.esc(title)}</h2>${subtitle ? `<p>${PHONE.esc(subtitle)}</p>` : ''}</div>
        <button class="sheet-close" aria-label="关闭">${PHONE.icon('close', 18)}</button>
      </header>
      <div class="sheet-content"></div>
      <footer class="sheet-footer" ${opts.footer ? '' : 'style="display:none"'}></footer>
    </div>`;
    layer.appendChild(overlay);
    const content = overlay.querySelector('.sheet-content');
    if (opts.content instanceof Node) content.appendChild(opts.content);
    else if (opts.content) content.innerHTML = opts.content;
    const footerEl = overlay.querySelector('.sheet-footer');
    if (opts.footer) footerEl.innerHTML = opts.footer;
    let closed = false;
    const close = () => {
      if (closed) return; closed = true;
      overlay.classList.remove('show');
      setTimeout(() => { overlay.remove(); if (opts.onClose) opts.onClose(); }, 260);
    };
    overlay.querySelector('.sheet-close').onclick = close;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    // 下拉关闭
    const grab = overlay.querySelector('.sheet-grab');
    const sheet = overlay.querySelector('.sheet');
    let sy = null, dragging = false;
    grab.addEventListener('pointerdown', (e) => { sy = e.clientY; dragging = true; sheet.style.transition = 'none'; grab.setPointerCapture(e.pointerId); });
    grab.addEventListener('pointermove', (e) => {
      if (!dragging || sy == null) return;
      const dy = Math.max(0, e.clientY - sy);
      sheet.style.transform = `translateY(${dy}px)`;
    });
    grab.addEventListener('pointerup', (e) => {
      if (!dragging) return; dragging = false; sheet.style.transition = '';
      const dy = Math.max(0, e.clientY - sy);
      sheet.style.transform = '';
      if (dy > 110) close();
      sy = null;
    });
    requestAnimationFrame(() => overlay.classList.add('show'));
    return { el: overlay, bodyEl: content, footerEl, close };
  };

  PHONE.confirm = function (title, message, opts) {
    const o = opts || {};
    return new Promise((resolve) => {
      let settled = false;
      const done = (v) => { if (settled) return; settled = true; resolve(v); };
      const sheet = PHONE.sheet({
        title,
        content: `<p class="confirm-text">${PHONE.esc(message)}</p>`,
        footer: `<button class="btn ghost" data-no>取消</button><button class="btn ${o.danger ? 'danger' : 'primary'}" data-yes>${o.danger ? '确定删除' : '确定'}</button>`,
        onClose: () => done(false)
      });
      sheet.footerEl.querySelector('[data-no]').onclick = () => { done(false); sheet.close(); };
      sheet.footerEl.querySelector('[data-yes]').onclick = () => { done(true); sheet.close(); };
    });
  };
  PHONE.alert = function (title, message) {
    return new Promise((resolve) => {
      const sheet = PHONE.sheet({ title, content: `<p class="confirm-text">${PHONE.esc(message)}</p>`, footer: `<button class="btn primary" data-ok>好</button>`, onClose: () => resolve() });
      sheet.footerEl.querySelector('[data-ok]').onclick = () => { sheet.close(); resolve(); };
    });
  };

  /* ---------------- 灵动岛 ---------------- */
  let islandTimer = null, callPinned = false;
  const islandEl = () => document.getElementById('island');
  function islandCollapse() {
    if (callPinned) return;
    islandEl()?.classList.remove('expanded', 'call');
    const c = islandEl()?.querySelector('.island-content');
    if (c) c.innerHTML = '';
  }
  PHONE.island = {
    show({ text, icon }) {
      if (callPinned) return;
      const el = islandEl(); if (!el) return;
      const c = el.querySelector('.island-content');
      const app = PHONE.apps.find((a) => a.icon === icon);
      c.innerHTML = `<span class="island-ico">${PHONE.icon(icon || 'chat', 13)}</span><span class="island-text">${PHONE.esc(String(text || '').slice(0, 42))}</span>`;
      el.classList.add('expanded');
      clearTimeout(islandTimer);
      islandTimer = setTimeout(islandCollapse, 3200);
    },
    setCall(text) {
      callPinned = true;
      const el = islandEl(); if (!el) return;
      el.classList.add('expanded', 'call');
      const c = el.querySelector('.island-content');
      c.innerHTML = `<span class="island-live"></span><span class="island-call-label">通话中</span><b>${PHONE.esc(text)}</b>`;
    },
    clearCall() {
      callPinned = false;
      islandCollapse();
    },
    clear: islandCollapse
  };

  /* ---------------- 锁屏 ---------------- */
  function showLock() {
    const el = document.getElementById('lock-screen');
    const st = S();
    lockOpen = true;
    const notes = (st.notifications || []).slice(0, 4);
    el.innerHTML = `<div class="lock-wall" style="background-image:${wallpaperCSS()}"></div><div class="lock-shade"></div>
      <div class="lock-top"><span>${PHONE.icon('lock', 14)}</span><span>锁屏</span></div>
      <div class="lock-center"><div class="lock-time" data-lock-time></div><div class="lock-date" data-lock-date></div></div>
      <div class="lock-notes">${notes.length ? notes.map((n) => `<button class="lock-note" data-lock-app="${n.app}"><span class="lock-note-ico">${PHONE.icon(PHONE.getApp(n.app)?.icon || 'chat', 16)}</span><span><b>${PHONE.esc(n.title)}</b><em>${PHONE.esc(n.body)}</em></span><small>${PHONE.fmtClock(n.ts)}</small></button>`).join('') : `<p class="lock-empty">没有新通知</p>`}</div>
      <div class="lock-bottom"><span>${PHONE.icon('up', 15)} 上滑解锁</span><i class="lock-bar"></i></div>`;
    el.classList.add('show');
    updateClock();
    let sy = null;
    el.onpointerdown = (e) => { sy = e.clientY; };
    el.onpointerup = (e) => {
      if (e.target.closest('[data-lock-app]')) { const app = e.target.closest('[data-lock-app]').dataset.lockApp; hideLock(); PHONE.openApp(app); return; }
      if (sy != null && sy - e.clientY > 45) hideLock();
      else if (Math.abs((sy || 0) - e.clientY) < 8) hideLock();
      sy = null;
    };
  }
  function hideLock() {
    lockOpen = false;
    const el = document.getElementById('lock-screen');
    el.classList.remove('show');
    setTimeout(() => { if (!lockOpen) el.innerHTML = ''; }, 350);
  }
  PHONE.showLock = showLock;
  PHONE.hideLock = hideLock;

  /* ---------------- 初始化 ---------------- */
  function initBattery() {
    try {
      if (navigator.getBattery) {
        navigator.getBattery().then((b) => {
          const upd = () => { battery.level = b.level * 100; battery.charging = b.charging; renderStatusBar(); };
          upd(); b.addEventListener('levelchange', upd); b.addEventListener('chargingchange', upd);
        });
      }
    } catch (e) {}
  }

  PHONE.startDesktopClock = function () {
    clearInterval(clockTimer); clearInterval(tickTimer);
    clockTimer = setInterval(() => {
      updateClock();
      if (lockOpen) updateClock();
    }, 1000);
    tickTimer = setInterval(() => {
      const desk = desktopEl();
      if (desk && !drag) PHONE.tickWidgets(desk);
    }, 1000);
  };

  PHONE.initDesktop = function () {
    PHONE.applyTheme();
    PHONE.applyFont();
    PHONE.applyChrome();
    PHONE.renderDesktop();
    PHONE.startDesktopClock();
    initBattery();
    bindDesktop();
    renderStatusBar();
    setTimeout(resizePhoneVars, 40);
    setTimeout(renderStatusBar, 600);
  };

  window.addEventListener('pageshow', () => { if (PHONE.currentApp === 'chat' && PHONE.chat) PHONE.chat.refresh(); });
})();
