/* ============================================================
   Blaise Phone · 设置
   顶部两大部分：通用 / 字卡与概率
   ============================================================ */
(function () {
  const S = () => PHONE.state;
  const HIM = () => S().profile.contactName;
  const ME = () => S().profile.myName;

  PHONE.WALLPAPERS = [
    { id: 'mist', name: '雾霭', css: 'linear-gradient(160deg,#f3eef1 0%,#e7dfe9 42%,#d5cede 100%)' },
    { id: 'dusk', name: '暮色', css: 'linear-gradient(160deg,#f7e8dc 0%,#e7c9c6 46%,#b397ae 100%)' },
    { id: 'sage', name: '鼠尾草', css: 'linear-gradient(160deg,#edf0e8 0%,#d3ddd2 52%,#aebfaf 100%)' },
    { id: 'ink', name: '夜色', css: 'linear-gradient(160deg,#3b3743 0%,#2b2832 55%,#1d1b23 100%)' },
    { id: 'paper', name: '纸白', css: 'linear-gradient(160deg,#fcfaf5 0%,#f4eee3 58%,#e9dfd1 100%)' },
    { id: 'rose', name: '玫瑰灰', css: 'linear-gradient(160deg,#f4e4e4 0%,#dcbfc5 52%,#a98696 100%)' }
  ];
  const ACCENTS = ['#7c6a8a', '#8a6268', '#5f7a6e', '#64738c', '#9a7758', '#4c4a58', '#a56b7a', '#6d5a93'];

  const LIB = {
    main: { name: '主字卡', desc: '聊天的核心内容，可分组', kind: 'text', grouped: true },
    kaomoji: { name: '颜文字', desc: '一行一个颜文字', kind: 'text' },
    emoji: { name: 'Emoji', desc: '一行一个 emoji', kind: 'text' },
    sticker: { name: '表情包', desc: '从手机相册批量导入图片', kind: 'image' },
    patTheirs: { name: '拍一拍 · 对方拍我', desc: `前缀固定为「${HIM()} 拍了拍我」`, kind: 'text', prefix: (t) => `${HIM()} 拍了拍我${t}` },
    patMine: { name: '拍一拍 · 我拍对方', desc: `前缀固定为「我 拍了拍${HIM()}」`, kind: 'text', prefix: (t) => `我 拍了拍${HIM()}${t}` },
    voice: { name: '语音字卡', desc: '抽到后以语音气泡发送', kind: 'text' },
    free: { name: '自由造句', desc: '可用 {name} / {me} 占位', kind: 'text' },
    love: { name: '情话字卡库', desc: '今日情话小组件调用', kind: 'text' },
    mood: { name: '心情字卡库', desc: '今日心情小组件调用', kind: 'text' }
  };
  const SOUNDS = [
    { id: 'chime', name: '清透' }, { id: 'pop', name: '轻弹' }, { id: 'drop', name: '水滴' }, { id: 'bell', name: '风铃' }, { id: 'none', name: '静音' }
  ];

  let rootEl = null, bodyEl = null;
  let tab = 'general';
  let cardsTab = 'chat';
  let sub = null;
  let libState = { key: null, search: '', group: 'all', selecting: false, selected: new Set() };

  const pathGet = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), S());
  function pathSet(path, value) {
    const parts = path.split('.');
    let o = S();
    for (let i = 0; i < parts.length - 1; i++) {
      if (o[parts[i]] == null || typeof o[parts[i]] !== 'object') o[parts[i]] = {};
      o = o[parts[i]];
    }
    o[parts[parts.length - 1]] = value;
  }
  const save = () => PHONE.save();

  /* ---------------- 小组件：通用控件 ---------------- */
  const switchHTML = (path, on) => `<button class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${!!on}" data-switch="${path}"><i></i></button>`;
  const rowHTML = (title, desc, control) => `<div class="setting-row"><div class="setting-copy"><b>${title}</b>${desc ? `<small>${desc}</small>` : ''}</div>${control}</div>`;
  const fieldHTML = (label, path, value, type, attrs) => `<label class="field"><span>${label}</span><input type="${type || 'text'}" data-field="${path}" value="${PHONE.esc(value == null ? '' : value)}" ${attrs || ''}></label>`;
  const rangeHTML = (label, path, value, min, max, step, unit) => `<label class="setting-range"><span>${label}</span><div class="range-line"><input type="range" min="${min}" max="${max}" step="${step || 1}" value="${value}" data-range="${path}" data-unit="${unit || ''}"><b data-range-label>${value}${unit || ''}</b></div></label>`;

  const pageHero = () => {
    const st = S();
    return `<div class="settings-hero">
      <div class="hero-avatar">${PHONE.avatarHTML(st.profile.contactAvatar, HIM())}</div>
      <div class="hero-copy"><span>MY PERSON</span><h2>${PHONE.esc(HIM())}</h2><p>与 ${PHONE.esc(HIM())} 相恋 <b>${PHONE.daysTogether(st.profile.togetherSince)}</b> 天</p></div>
      <div class="hero-heart">${PHONE.icon('heart', 20)}</div>
    </div>`;
  };

  /* ---------------- 通用 ---------------- */
  function generalHTML() {
    const st = S();
    return `<div class="settings-page">${pageHero()}
      <section class="settings-section">
        <h3>通用</h3>
        ${rowHTML('全屏模式', '开启后隐藏顶部状态栏', switchHTML('settings.fullscreen', st.settings.fullscreen))}
        ${rowHTML('桌面消息弹窗', '对方发来消息时，在桌面顶部显示消息条幅', switchHTML('settings.desktopPopup', st.settings.desktopPopup))}
        ${rowHTML('后台通知', '应用在后台时也发出通知，锁屏可见条幅', switchHTML('settings.backgroundNotify', st.settings.backgroundNotify))}
        ${rowHTML('后台保活', '静音保活，不占用其他应用的声音', switchHTML('settings.keepAlive', st.settings.keepAlive))}
      </section>

      <section class="settings-section">
        <h3>联系人</h3>
        <div class="contact-row">
          <button class="contact-avatar" data-action="pick-avatar" data-who="contact">${PHONE.avatarHTML(st.profile.contactAvatar, HIM())}<span>${PHONE.icon('camera', 14)}</span></button>
          <div class="contact-fields">
            ${fieldHTML('对方名字', 'profile.contactName', st.profile.contactName, 'text', 'maxlength="18"')}
            ${fieldHTML('我的名字', 'profile.myName', st.profile.myName, 'text', 'maxlength="18"')}
          </div>
          <button class="contact-avatar" data-action="pick-avatar" data-who="me">${PHONE.avatarHTML(st.profile.myAvatar, ME())}<span>${PHONE.icon('camera', 14)}</span></button>
        </div>
        ${fieldHTML('相恋开始日期', 'profile.togetherSince', st.profile.togetherSince, 'date')}
        <p class="editor-hint">这个名字会同步到桌面、聊天、信箱、朋友圈与小组件。</p>
      </section>

      <section class="settings-section">
        <h3>桌面与外观</h3>
        <button class="wide-link" data-action="beautify"><span class="wl-ico">${PHONE.icon('palette', 20)}</span><span><b>手机桌面美化</b><small>壁纸、透明度、主题色、图标、字体、桌面页面</small></span>${PHONE.icon('forward', 17)}</button>
      </section>

      <section class="settings-section">
        <h3>音效</h3>
        ${rowHTML('音效开关', '消息收发提示音', switchHTML('settings.sounds.enabled', st.settings.sounds.enabled))}
        <div class="sound-row">
          <span class="sound-label">${PHONE.icon('bell', 16)} 对方发来</span>
          <select data-select="settings.sounds.incoming">${SOUNDS.map((s) => `<option value="${s.id}" ${st.settings.sounds.incoming === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}</select>
          <button class="mini-btn" data-action="test-in">试听</button>
          <button class="mini-btn" data-action="upload-sound" data-who="in">上传</button>
        </div>
        ${st.settings.sounds.customIncoming ? `<div class="custom-sound">自定义音效已启用 <button data-action="clear-sound" data-who="in">移除</button></div>` : ''}
        <div class="sound-row">
          <span class="sound-label">${PHONE.icon('send', 16)} 我发出去</span>
          <select data-select="settings.sounds.outgoing">${SOUNDS.map((s) => `<option value="${s.id}" ${st.settings.sounds.outgoing === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}</select>
          <button class="mini-btn" data-action="test-out">试听</button>
          <button class="mini-btn" data-action="upload-sound" data-who="out">上传</button>
        </div>
        ${st.settings.sounds.customOutgoing ? `<div class="custom-sound">自定义音效已启用 <button data-action="clear-sound" data-who="out">移除</button></div>` : ''}
      </section>

      <section class="settings-section">
        <h3>数据与备份</h3>
        <div class="btn-row">
          <button class="btn soft" data-action="export">${PHONE.icon('download', 16)} 导出数据</button>
          <button class="btn soft" data-action="import">${PHONE.icon('upload', 16)} 导入数据</button>
        </div>
        <p class="editor-hint">导出会包含字卡、聊天、信件、朋友圈、壁纸、头像与所有设置。更新代码前先导出一份，之后导入即可恢复。</p>
      </section>

      <section class="settings-section danger-zone">
        <h3>其他</h3>
        ${rowHTML('恢复初始数据', '清除本机所有内容并回到初始状态', '<button class="btn danger" data-action="reset">恢复</button>')}
        <p class="about">Blaise Phone · 每一次更新都保留你的数据</p>
      </section>
    </div>`;
  }

  /* ---------------- 字卡与概率首页 ---------------- */
  function cardsHTML() {
    return `<div class="settings-page">
      <div class="card-tabs">
        <button data-cards-tab="chat" class="${cardsTab === 'chat' ? 'active' : ''}">聊天字卡库</button>
        <button data-cards-tab="other" class="${cardsTab === 'other' ? 'active' : ''}">其他功能字卡库</button>
        <button data-cards-tab="prob" class="${cardsTab === 'prob' ? 'active' : ''}">概率设置</button>
      </div>
      ${cardsTab === 'chat' ? chatLibHTML() : cardsTab === 'other' ? otherLibHTML() : probHTML()}
    </div>`;
  }

  function libCardHTML(key) {
    const cfg = LIB[key];
    const arr = S().cards[key] || [];
    const extra = key === 'main' ? ` · ${S().cards.groups.length} 个分组` : '';
    return `<button class="lib-card" data-action="lib-open" data-key="${key}">
      <span class="lib-ico ${key}">${PHONE.icon(key === 'sticker' ? 'image' : key === 'voice' ? 'mic' : key === 'emoji' ? 'smile' : key === 'kaomoji' ? 'type' : key === 'love' ? 'heart' : key === 'mood' ? 'cloud' : key === 'free' ? 'sparkle' : key.startsWith('pat') ? 'heart' : 'cards', 21)}</span>
      <span class="lib-copy"><b>${cfg.name}</b><small>${cfg.desc}${extra}</small></span>
      <span class="lib-count">${arr.length}</span>${PHONE.icon('forward', 16)}
    </button>`;
  }

  function chatLibHTML() {
    return `<div class="lib-page-head">
        <div><h2>聊天字卡库</h2><p>所有字卡均为一行一条，导入时自动去重。</p></div>
        <div class="lib-head-actions"><button class="mini-btn" data-action="import-all-cards">${PHONE.icon('upload', 14)} 导入全部</button><button class="mini-btn" data-action="export-all-cards">${PHONE.icon('download', 14)} 导出全部</button></div>
      </div>
      <div class="lib-list-cards">
        ${libCardHTML('main')}${libCardHTML('kaomoji')}${libCardHTML('emoji')}${libCardHTML('sticker')}${libCardHTML('patTheirs')}${libCardHTML('patMine')}${libCardHTML('voice')}${libCardHTML('free')}
      </div>
      <p class="editor-hint center">新增字卡类型只需在源代码中注册一个库，设置页会自动出现入口。</p>`;
  }

  function otherLibHTML() {
    return `<div class="lib-page-head">
        <div><h2>其他功能字卡库</h2><p>情话与心情会被桌面小组件每天抽取。</p></div>
      </div>
      <div class="lib-list-cards">${libCardHTML('love')}${libCardHTML('mood')}</div>
      <p class="editor-hint center">后续新增的信箱字卡、朋友圈字卡等也可以放在这里。</p>`;
  }

  /* ---------------- 字卡管理 ---------------- */
  function currentLib() {
    const key = sub && sub.key;
    return key ? { key, cfg: LIB[key], list: S().cards[key] || [] } : null;
  }

  function filteredList() {
    const { key, cfg, list } = currentLib();
    let arr = list;
    if (cfg.grouped && libState.group !== 'all') {
      arr = libState.group === '__none' ? arr.filter((c) => !c.group) : arr.filter((c) => c.group === libState.group);
    }
    if (libState.search) {
      const q = libState.search.toLowerCase();
      arr = arr.filter((c) => (cfg.kind === 'image' ? true : String(c.text || '').toLowerCase().includes(q)));
    }
    return arr;
  }

  function libManageHTML() {
    const cur = currentLib();
    if (!cur) return '';
    const { key, cfg, list } = cur;
    const groups = S().cards.groups;
    const filtered = filteredList();
    const isImage = cfg.kind === 'image';
    return `<div class="sub-page">
      <div class="sub-head">
        <button class="icon-btn" data-action="lib-back">${PHONE.icon('back', 20)}</button>
        <div class="sub-title"><h2>${cfg.name}</h2><span>${list.length} 条${isImage ? '图片' : '字卡'}${cfg.grouped ? ' · ' + groups.length + ' 个分组' : ''}</span></div>
        <button class="icon-btn" data-action="${isImage ? 'sticker-add' : 'lib-add'}">${PHONE.icon('plus', 21)}</button>
      </div>
      ${cfg.prefix ? `<p class="prefix-note">批量导入时只填写后面的内容，前缀自动固定为「${key === 'patTheirs' ? HIM() + ' 拍了拍我' : '我 拍了拍' + HIM()}」。</p>` : ''}
      <div class="lib-toolbar">
        <label class="search-field">${PHONE.icon('search', 15)}<input data-lib-search placeholder="搜索字卡" value="${PHONE.esc(libState.search)}"></label>
        <button class="mini-btn" data-action="lib-import">${PHONE.icon('upload', 14)} 批量导入</button>
        <button class="mini-btn ${libState.selecting ? 'active' : ''}" data-action="lib-batch">${PHONE.icon('check', 14)} 批量</button>
        <button class="mini-btn" data-action="lib-export">${PHONE.icon('download', 14)}</button>
      </div>
      ${cfg.grouped ? `
        <div class="group-bar">
          <button class="group-chip ${libState.group === 'all' ? 'active' : ''}" data-group-filter="all">全部</button>
          <button class="group-chip ${libState.group === '__none' ? 'active' : ''}" data-group-filter="__none">未分组</button>
          ${groups.map((g) => `<button class="group-chip ${libState.group === g.id ? 'active' : ''}" data-group-filter="${g.id}">${PHONE.esc(g.name)}</button>`).join('')}
          <button class="group-chip ghost" data-action="group-manage">${PHONE.icon('settings', 12)} 管理分组</button>
        </div>` : ''}
      ${libState.selecting ? `<div class="batch-bar"><button class="mini-btn" data-action="select-all">全选</button><span>已选 <b>${libState.selected.size}</b> 条</span><button class="mini-btn danger" data-action="delete-selected">${PHONE.icon('trash', 14)} 删除</button>${cfg.grouped ? `<button class="mini-btn" data-action="assign-group">${PHONE.icon('grid', 14)} 移入分组</button>` : ''}</div>` : ''}
      ${isImage ? `<div class="sticker-grid">${filtered.map((c) => `<div class="sticker-cell ${libState.selected.has(c.id) ? 'sel' : ''}" data-sticker="${c.id}"><img src="${c.src}" alt=""><button class="sticker-del" data-del="${c.id}">${PHONE.icon('close', 13)}</button>${libState.selecting ? '<span class="select-dot"></span>' : ''}</div>`).join('') || `<div class="lib-empty">还没有表情包，点右上角从手机相册批量导入。</div>`}</div>` : `
        <div class="lib-rows ${libState.selecting ? 'selecting' : ''}">
          ${filtered.map((c) => `<div class="lib-row" data-card="${c.id}">
            <button class="lib-check" data-check="${c.id}">${libState.selected.has(c.id) ? PHONE.icon('check', 12) : ''}</button>
            <span class="lib-text">${cfg.prefix ? `<i>${PHONE.esc(cfg.prefix(''))}</i>` : ''}${PHONE.esc(c.text || '')}</span>
            <span class="lib-actions"><button data-edit="${c.id}">${PHONE.icon('edit', 15)}</button><button data-del="${c.id}">${PHONE.icon('trash', 15)}</button></span>
          </div>`).join('') || `<div class="lib-empty">这里还没有字卡。点右上角添加，或从文本批量导入。</div>`}
        </div>`}
      <div class="lib-footer"><span>自动去重 · 本地保存</span><button class="mini-btn danger" data-action="lib-clear">清空这个字卡库</button></div>
    </div>`;
  }

  function openAddCard() {
    const cur = currentLib();
    if (!cur) return;
    const host = document.createElement('div');
    const groups = S().cards.groups;
    host.innerHTML = `<div class="settings-form">
      <label class="field"><span>${cur.cfg.kind === 'image' ? '图片' : '内容'}</span>${cur.cfg.kind === 'image' ? '<button class="btn soft full" data-pick>选择图片</button>' : `<textarea rows="4" data-value placeholder="一行一条也可以直接粘贴多行"></textarea>`}</label>
      ${cur.cfg.grouped ? `<label class="field"><span>分组</span><select data-group>${groups.map((g) => `<option value="${g.id}">${PHONE.esc(g.name)}</option>`).join('')}<option value="">未分组</option></select></label>` : ''}
    </div>`;
    const sheet = PHONE.sheet({ title: '添加 · ' + cur.cfg.name, content: host, footer: `<button class="btn ghost" data-x>取消</button><button class="btn primary" data-ok>添加</button>` });
    if (cur.cfg.kind === 'image') {
      host.querySelector('[data-pick]').onclick = () => {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
        inp.onchange = async () => {
          let n = 0;
          for (const f of Array.from(inp.files)) {
            try { const src = await PHONE.compressImage(f, { max: 480, quality: 0.8 }); S().cards.sticker.push({ id: PHONE.uid('st_'), src }); n++; } catch (e) {}
          }
          save(); sheet.close(); paintBody(); PHONE.toast(`已添加 ${n} 张表情包`);
          if (PHONE.renderDesktop) PHONE.renderDesktop();
        };
        inp.click();
      };
    }
    sheet.footerEl.querySelector('[data-x]').onclick = sheet.close;
    sheet.footerEl.querySelector('[data-ok]').onclick = () => {
      if (cur.cfg.kind === 'image') { host.querySelector('[data-pick]').click(); return; }
      const text = host.querySelector('[data-value]').value;
      const lines = text.split('\n').map((x) => x.trim()).filter(Boolean);
      if (!lines.length) { PHONE.toast('请输入内容'); return; }
      const group = host.querySelector('[data-group]')?.value || '';
      const existing = new Set((S().cards[cur.key] || []).map((c) => c.text));
      let n = 0;
      lines.forEach((t) => { if (!existing.has(t)) { S().cards[cur.key].push({ id: PHONE.uid('c_'), text: t, ...(cur.cfg.grouped ? { group } : {}) }); existing.add(t); n++; } });
      save(); sheet.close(); paintBody(); PHONE.toast(`已添加 ${n} 条`);
    };
  }

  function openImport() {
    const cur = currentLib();
    if (!cur) return;
    if (cur.cfg.kind === 'image') { document.querySelector('[data-action="sticker-add"]')?.click(); return; }
    const groups = S().cards.groups;
    const host = document.createElement('div');
    host.innerHTML = `<div class="settings-form">
      <label class="field"><span>批量导入（一行一条，自动去重）</span><textarea rows="9" data-bulk placeholder="今天想你了&#10;晚安，做个好梦"></textarea></label>
      ${cur.cfg.grouped ? `<label class="field"><span>导入到分组</span><select data-group><option value="">未分组</option>${groups.map((g) => `<option value="${g.id}">${PHONE.esc(g.name)}</option>`).join('')}</select></label>` : ''}
      ${cur.cfg.prefix ? `<p class="editor-hint">只填后面的部分，例如「的头，说晚安」。前缀会自动拼接。</p>` : ''}
      <p class="editor-hint">空行会被忽略；已经存在的相同内容不会重复导入。</p>
    </div>`;
    const sheet = PHONE.sheet({ title: '批量导入 · ' + cur.cfg.name, content: host, footer: `<button class="btn ghost" data-x>取消</button><button class="btn primary" data-ok>导入</button>` });
    sheet.footerEl.querySelector('[data-x]').onclick = sheet.close;
    sheet.footerEl.querySelector('[data-ok]').onclick = () => {
      const lines = host.querySelector('[data-bulk]').value.split('\n').map((x) => x.trim()).filter(Boolean);
      if (!lines.length) { PHONE.toast('没有可导入的内容'); return; }
      const group = host.querySelector('[data-group]')?.value || '';
      const existing = new Set((S().cards[cur.key] || []).map((c) => c.text));
      let n = 0, dup = 0;
      lines.forEach((t) => {
        if (existing.has(t)) { dup++; return; }
        S().cards[cur.key].push({ id: PHONE.uid('c_'), text: t, ...(cur.cfg.grouped ? { group } : {}) });
        existing.add(t); n++;
      });
      save(); sheet.close(); paintBody(); PHONE.toast(`导入 ${n} 条${dup ? '，跳过重复 ' + dup + ' 条' : ''}`);
    };
  }

  function openEditCard(id) {
    const cur = currentLib();
    if (!cur) return;
    const card = (S().cards[cur.key] || []).find((c) => c.id === id);
    if (!card) return;
    const host = document.createElement('div');
    host.innerHTML = `<div class="settings-form"><label class="field"><span>内容</span><textarea rows="4" data-value>${PHONE.esc(card.text || '')}</textarea></label>${cur.cfg.grouped ? `<label class="field"><span>分组</span><select data-group><option value="">未分组</option>${S().cards.groups.map((g) => `<option value="${g.id}" ${card.group === g.id ? 'selected' : ''}>${PHONE.esc(g.name)}</option>`).join('')}</select></label>` : ''}</div>`;
    const sheet = PHONE.sheet({ title: '编辑字卡', content: host, footer: `<button class="btn ghost" data-x>取消</button><button class="btn primary" data-ok>保存</button>` });
    sheet.footerEl.querySelector('[data-x]').onclick = sheet.close;
    sheet.footerEl.querySelector('[data-ok]').onclick = () => {
      const v = host.querySelector('[data-value]').value.trim();
      if (!v) { PHONE.toast('内容不能为空'); return; }
      card.text = v;
      if (cur.cfg.grouped) card.group = host.querySelector('[data-group]').value || '';
      save(); sheet.close(); paintBody();
    };
  }

  function openGroups() {
    const host = document.createElement('div');
    const draw = () => {
      host.innerHTML = `<div class="group-manager">
        <div class="group-add"><input data-new-group placeholder="新分组名字" maxlength="12"><button class="btn primary" data-add-group>添加</button></div>
        <div class="group-manage-list">${S().cards.groups.map((g) => `<div class="group-manage-row"><input data-rename="${g.id}" value="${PHONE.esc(g.name)}" maxlength="12"><span>${S().cards.main.filter((c) => c.group === g.id).length} 条</span><button data-del-group="${g.id}">${PHONE.icon('trash', 15)}</button></div>`).join('') || '<p class="editor-hint">还没有分组。</p>'}</div>
        <p class="editor-hint">删除分组后，组内字卡会回到「未分组」，不会被删除。</p>
      </div>`;
      host.querySelector('[data-add-group]').onclick = () => {
        const inp = host.querySelector('[data-new-group]');
        const name = inp.value.trim();
        if (!name) return;
        const id = PHONE.uid('g_');
        S().cards.groups.push({ id, name });
        if (!S().prob.chat.groups[id]) S().prob.chat.groups[id] = 40;
        save(); draw(); PHONE.toast('分组已添加');
      };
      host.querySelectorAll('[data-rename]').forEach((inp) => {
        inp.onchange = () => {
          const g = S().cards.groups.find((x) => x.id === inp.dataset.rename);
          if (g && inp.value.trim()) { g.name = inp.value.trim(); save(); }
        };
      });
      host.querySelectorAll('[data-del-group]').forEach((b) => {
        b.onclick = () => {
          const id = b.dataset.delGroup;
          S().cards.groups = S().cards.groups.filter((g) => g.id !== id);
          S().cards.main.forEach((c) => { if (c.group === id) c.group = ''; });
          delete S().prob.chat.groups[id];
          save(); draw(); paintBody();
        };
      });
    };
    draw();
    PHONE.sheet({ title: '主字卡分组', subtitle: '分组会同步到概率设置', content: host });
  }

  function assignGroup() {
    if (!libState.selected.size) { PHONE.toast('先选择字卡'); return; }
    const host = document.createElement('div');
    host.innerHTML = `<div class="settings-form"><label class="field"><span>移动到分组（已选 ${libState.selected.size} 条）</span><select data-group><option value="">未分组</option>${S().cards.groups.map((g) => `<option value="${g.id}">${PHONE.esc(g.name)}</option>`).join('')}</select></label></div>`;
    const sheet = PHONE.sheet({ title: '移入分组', content: host, footer: `<button class="btn ghost" data-x>取消</button><button class="btn primary" data-ok>确定</button>` });
    sheet.footerEl.querySelector('[data-x]').onclick = sheet.close;
    sheet.footerEl.querySelector('[data-ok]').onclick = () => {
      const g = host.querySelector('[data-group]').value;
      S().cards.main.forEach((c) => { if (libState.selected.has(c.id)) c.group = g; });
      save(); sheet.close(); libState.selected.clear(); paintBody(); PHONE.toast('已移动');
    };
  }

  /* ---------------- 概率 ---------------- */
  function probRow(label, path, suffix) {
    const v = pathGet(path);
    return `<div class="prob-row"><div class="prob-name"><b>${label}</b><span data-v="${path}">${v == null ? 0 : v}${suffix || '%'}</span></div>
      <div class="prob-control"><input type="range" min="0" max="100" value="${v == null ? 0 : v}" data-prob="${path}"><input type="number" min="0" max="100" value="${v == null ? 0 : v}" data-probnum="${path}"></div></div>`;
  }
  function numRow(label, path, unit, min, max) {
    return `<label class="num-row"><span>${label}</span><input type="number" data-num="${path}" min="${min == null ? 0 : min}" max="${max == null ? 9999 : max}" value="${pathGet(path)}"><em>${unit || ''}</em></label>`;
  }
  function probHTML() {
    const st = S(), p = st.prob;
    const groups = st.cards.groups;
    const puncs = ['，', '。', '！', '？', '~', '……'];
    return `<div class="prob-wrap">
      <p class="prob-tip">滑块为相对出现权重：0% 表示不会出现，数值越高出现越频繁。</p>
      <details class="prob-section" open>
        <summary>聊天概率</summary>
        <div class="prob-sub">字卡类型</div>
        ${probRow('主字卡', 'prob.chat.main')}
        ${probRow('颜文字', 'prob.chat.kaomoji')}
        ${probRow('Emoji', 'prob.chat.emoji')}
        ${probRow('表情包', 'prob.chat.sticker')}
        ${probRow('拍一拍', 'prob.chat.pat')}
        ${probRow('语音', 'prob.chat.voice')}
        ${probRow('自由造句', 'prob.chat.free')}
        <div class="prob-sub">主字卡分组权重</div>
        ${probRow('未分组', 'prob.chat.groups.__ungrouped')}
        ${groups.map((g) => probRow(g.name, 'prob.chat.groups.' + g.id)).join('') || '<p class="editor-hint">还没有分组</p>'}
        <div class="prob-sub">回复行为</div>
        ${probRow('已读不回', 'prob.chat.noReply')}
        <div class="num-pair">${numRow('回复最快', 'prob.chat.replyMin', '秒', 0, 600)}${numRow('回复最慢', 'prob.chat.replyMax', '秒', 0, 600)}</div>
        <div class="num-pair">${numRow('最少字卡', 'prob.chat.minCards', '条', 1, 12)}${numRow('最多字卡', 'prob.chat.maxCards', '条', 1, 12)}</div>
        <div class="prob-sub">通话</div>
        ${probRow('对方主动来电', 'prob.chat.callIn')}
        ${probRow('拨打时接听', 'prob.chat.answer')}
      </details>

      <details class="prob-section">
        <summary>信箱概率</summary>
        <div class="num-pair">${numRow('信中最少字卡', 'prob.mailbox.minCards', '条', 1, 30)}${numRow('信中最多字卡', 'prob.mailbox.maxCards', '条', 1, 30)}</div>
        <div class="prob-sub">随机标点</div>
        <div class="punct-row">${puncs.map((x) => `<button class="punct-chip ${p.mailbox.punctuation.includes(x) ? 'on' : ''}" data-punct="${x}">${x}</button>`).join('')}</div>
        ${probRow('联系人主动写信', 'prob.mailbox.writeChance')}
        <div class="num-pair">${numRow('每天最多', 'prob.mailbox.maxPerDay', '封', 1, 20)}${numRow('最短间隔', 'prob.mailbox.gapMin', '分钟', 1, 10000)}</div>
        <div class="num-pair">${numRow('最长间隔', 'prob.mailbox.gapMax', '分钟', 1, 20000)}${numRow('回信最快', 'prob.mailbox.replyMin', '分钟', 0, 1000)}</div>
        <div class="num-pair">${numRow('回信最慢', 'prob.mailbox.replyMax', '分钟', 0, 2000)}${numRow('回信使用 Emoji', 'prob.mailbox.emoji', '%', 0, 100)}</div>
        <div class="num-pair">${numRow('回信使用颜文字', 'prob.mailbox.kaomoji', '%', 0, 100)}${numRow('回信使用表情包', 'prob.mailbox.sticker', '%', 0, 100)}</div>
      </details>

      <details class="prob-section">
        <summary>朋友圈概率</summary>
        <div class="num-pair">${numRow('Emoji 概率', 'prob.moments.emoji', '%', 0, 100)}${numRow('颜文字概率', 'prob.moments.kaomoji', '%', 0, 100)}</div>
        <div class="num-pair">${numRow('表情包概率', 'prob.moments.sticker', '%', 0, 100)}${numRow('点赞概率', 'prob.moments.likeChance', '%', 0, 100)}</div>
        <div class="num-pair">${numRow('评论概率', 'prob.moments.commentChance', '%', 0, 100)}${numRow('评论最快', 'prob.moments.commentMin', '分钟', 0, 1000)}</div>
        <div class="num-pair">${numRow('评论最慢', 'prob.moments.commentMax', '分钟', 0, 2000)}${numRow('回复评论概率', 'prob.moments.replyChance', '%', 0, 100)}</div>
        <div class="num-pair">${numRow('回复最快', 'prob.moments.replyMin', '分钟', 0, 1000)}${numRow('回复最慢', 'prob.moments.replyMax', '分钟', 0, 2000)}</div>
        <div class="num-pair">${numRow('主动发朋友圈', 'prob.moments.postChance', '%', 0, 100)}${numRow('每天最多', 'prob.moments.maxPostsPerDay', '条', 1, 30)}</div>
        <div class="num-pair">${numRow('最少字卡', 'prob.moments.cardMin', '条', 1, 30)}${numRow('最多字卡', 'prob.moments.cardMax', '条', 1, 30)}</div>
      </details>

      <details class="prob-section">
        <summary>其他功能概率</summary>
        ${probRow('链接状态出现', 'prob.other.linkChance')}
        ${probRow('对方时间出现', 'prob.other.partnerTimeChance')}
        <p class="editor-hint">链接状态会在满格到一格之间随机；我方时间使用联网时间校准。</p>
      </details>
    </div>`;
  }

  /* ---------------- 桌面美化 ---------------- */
  function beautifyHTML() {
    const st = S(), t = st.theme;
    const customWall = !!t.wallpaper;
    const presetCss = (PHONE.WALLPAPERS.find((w) => w.id === t.preset) || PHONE.WALLPAPERS[0]).css;
    return `<div class="sub-page beautify-page">
      <div class="sub-head"><button class="icon-btn" data-action="sub-back">${PHONE.icon('back', 20)}</button><div class="sub-title"><h2>手机桌面美化</h2><span>把这里变成只属于你们的样子</span></div><span class="sub-spacer"></span></div>

      <section class="settings-section">
        <h3>桌面壁纸</h3>
        <div class="wall-large" style="background-image:${customWall ? `url('${t.wallpaper}')` : presetCss}"></div>
        <div class="wall-presets big">${PHONE.WALLPAPERS.map((w) => `<button class="wall-preset ${!customWall && t.preset === w.id ? 'active' : ''}" data-preset-wall="${w.id}"><span style="background:${w.css}"></span><em>${w.name}</em></button>`).join('')}</div>
        <div class="btn-row"><button class="btn soft" data-action="wall-upload">${PHONE.icon('image', 15)} 上传壁纸</button><button class="btn ghost" data-action="wall-clear">移除自定义</button></div>
        ${rangeHTML('壁纸遮罩', 'theme.dim', t.dim, 0, 70, 1, '%')}
        ${rangeHTML('壁纸模糊', 'theme.blur', t.blur, 0, 20, 1, 'px')}
      </section>

      <section class="settings-section">
        <h3>主题色</h3>
        <div class="accent-row">${ACCENTS.map((c) => `<button class="accent-dot ${t.accent.toLowerCase() === c ? 'active' : ''}" data-accent="${c}" style="background:${c}"></button>`).join('')}<label class="accent-pick">${PHONE.icon('palette', 15)}<input type="color" data-accent-input value="${t.accent}"></label></div>
        <p class="editor-hint">主题色会影响按钮、图标高亮、聊天气泡和小组件细节。</p>
      </section>

      <section class="settings-section">
        <h3>状态栏</h3>
        ${rowHTML('显示名字', '在时间下方显示 ' + PHONE.esc(HIM()), switchHTML('statusbar.showName', st.statusbar.showName))}
        ${rowHTML('蓝牙已连接', '显示蓝牙连接图标', switchHTML('statusbar.bluetooth', st.statusbar.bluetooth))}
        ${rowHTML('电量百分比', '在电池旁显示数字', switchHTML('statusbar.batteryPercent', st.statusbar.batteryPercent))}
        <label class="field"><span>信号格数</span><select data-select="statusbar.signal">${[1, 2, 3, 4].map((n) => `<option value="${n}" ${Number(st.statusbar.signal) === n ? 'selected' : ''}>${n} 格</option>`).join('')}</select></label>
      </section>

      <section class="settings-section">
        <h3>桌面页面</h3>
        <div class="page-manage">${st.desktop.pages.map((p, i) => `<div class="page-row" data-page-row="${p.id}"><span class="page-idx">${i + 1}</span><input data-page-name="${p.id}" value="${PHONE.esc(p.name)}" maxlength="12"><em>${p.items.length} 项</em><button data-page-del="${p.id}" ${st.desktop.pages.length <= 1 ? 'disabled' : ''}>${PHONE.icon('trash', 15)}</button></div>`).join('')}</div>
        <button class="btn soft full" data-action="page-add">${PHONE.icon('plus', 15)} 添加桌面新页面</button>
      </section>

      <section class="settings-section">
        <h3>软件图标</h3>
        <div class="app-icon-manage">${PHONE.apps.map((a) => `<div class="app-icon-row"><span class="app-icon-preview" style="background:${a.color}">${st.appIcons[a.id] ? `<img src="${st.appIcons[a.id]}" alt="">` : PHONE.icon(a.icon, 22)}</span><span><b>${a.name}</b><small>${st.appIcons[a.id] ? '自定义图标' : '默认图标'}</small></span><button class="mini-btn" data-icon-upload="${a.id}">更换</button><button class="mini-btn" data-icon-reset="${a.id}">重置</button></div>`).join('')}</div>
      </section>

      <section class="settings-section">
        <h3>字体</h3>
        <div class="font-current"><b>${t.font && t.font.name ? PHONE.esc(t.font.name) : '系统默认字体'}</b><span>支持 .ttf / .otf / .woff / .woff2</span></div>
        <div class="btn-row"><button class="btn soft" data-action="font-upload">${PHONE.icon('upload', 15)} 上传字体</button><button class="btn ghost" data-action="font-reset">恢复默认</button></div>
        <p class="editor-hint">字体会应用到整个应用。字体文件较大，建议使用精简字库。</p>
      </section>

      <section class="settings-section">
        <button class="wide-link" data-action="enter-edit"><span class="wl-ico">${PHONE.icon('grid', 20)}</span><span><b>进入桌面编辑模式</b><small>拖动图标和小组件、删除或添加</small></span>${PHONE.icon('forward', 17)}</button>
      </section>
    </div>`;
  }

  /* ---------------- 渲染与事件 ---------------- */
  function render(root) {
    rootEl = root;
    root.classList.add('settings-app');
    root.innerHTML = `
      <header class="app-top settings-top">
        <button class="icon-btn" data-action="back">${PHONE.icon('back', 22)}</button>
        <div class="set-tabs">
          <button class="set-tab ${tab === 'general' ? 'active' : ''}" data-tab="general"><span>${PHONE.icon('settings', 20)}</span><em>通用</em></button>
          <button class="set-tab ${tab === 'cards' ? 'active' : ''}" data-tab="cards"><span>${PHONE.icon('cards', 20)}</span><em>字卡 · 概率</em></button>
        </div>
        <span class="top-spacer"></span>
      </header>
      <main class="settings-body" data-settings-body></main>`;
    bodyEl = root.querySelector('[data-settings-body]');
    bind();
    paintBody();
  }

  function paintHeader() {
    if (!rootEl) return;
    rootEl.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  }

  function paintBody() {
    if (!bodyEl) return;
    if (sub && sub.type === 'beautify') bodyEl.innerHTML = beautifyHTML();
    else if (sub && sub.type === 'lib') bodyEl.innerHTML = libManageHTML();
    else if (tab === 'general') bodyEl.innerHTML = generalHTML();
    else bodyEl.innerHTML = cardsHTML();
    paintHeader();
    bodyEl.scrollTop = 0;
  }

  function bind() {
    rootEl.querySelectorAll('[data-tab]').forEach((b) => {
      b.addEventListener('click', () => {
        tab = b.dataset.tab; sub = null;
        bodyEl.innerHTML = tab === 'general' ? generalHTML() : cardsHTML();
        paintHeader();
      });
    });
    rootEl.querySelector('.settings-top [data-action="back"]').addEventListener('click', () => {
      if (sub) { sub = null; paintBody(); }
      else PHONE.closeApp();
    });
    attachBodyEvents();
  }

  function attachBodyEvents() {
    bodyEl.addEventListener('click', async (e) => {
      const tabBtn = e.target.closest('[data-cards-tab]');
      if (tabBtn) { cardsTab = tabBtn.dataset.cardsTab; paintBody(); return; }
      const libOpen = e.target.closest('[data-action="lib-open"]');
      if (libOpen) {
        libState = { key: libOpen.dataset.key, search: '', group: 'all', selecting: false, selected: new Set() };
        sub = { type: 'lib', key: libOpen.dataset.key };
        paintBody(); return;
      }
      const sw = e.target.closest('[data-switch]');
      if (sw) { toggleSwitch(sw); return; }
      const actEl = e.target.closest('[data-action]');
      const act = actEl && actEl.dataset.action;
      if (act) { await handleAction(act, actEl, e); return; }
      const delSticker = e.target.closest('[data-del]')?.dataset.del;
      if (delSticker && e.target.closest('.sticker-cell')) {
        const key = currentLib()?.key; if (!key) return;
        S().cards[key] = S().cards[key].filter((c) => c.id !== delSticker);
        save(); paintBody(); return;
      }
      const groupFilter = e.target.closest('[data-group-filter]')?.dataset.groupFilter;
      if (groupFilter) { libState.group = groupFilter; paintBody(); return; }
      const preset = e.target.closest('[data-preset-wall]')?.dataset.presetWall;
      if (preset) { setWallpaperPreset(preset); return; }
      const accent = e.target.closest('[data-accent]')?.dataset.accent;
      if (accent) { S().theme.accent = accent; save(); PHONE.applyTheme(); paintBody(); return; }
      const punct = e.target.closest('[data-punct]')?.dataset.punct;
      if (punct) {
        const arr = S().prob.mailbox.punctuation;
        const i = arr.indexOf(punct);
        if (i >= 0) arr.splice(i, 1); else arr.push(punct);
        if (!arr.length) arr.push('。');
        save(); e.target.closest('[data-punct]').classList.toggle('on'); return;
      }
      const iconUpload = e.target.closest('[data-icon-upload]')?.dataset.iconUpload;
      if (iconUpload) { uploadIcon(iconUpload); return; }
      const iconReset = e.target.closest('[data-icon-reset]')?.dataset.iconReset;
      if (iconReset) { delete S().appIcons[iconReset]; save(); PHONE.renderDesktop(); paintBody(); PHONE.toast('已恢复默认图标'); return; }
      const pageDel = e.target.closest('[data-page-del]')?.dataset.pageDel;
      if (pageDel) {
        if (S().desktop.pages.length <= 1) return;
        if (!(await PHONE.confirm('删除桌面页面', '页面上的图标和小组件会一起移除，确定吗？', { danger: true }))) return;
        S().desktop.pages = S().desktop.pages.filter((p) => p.id !== pageDel);
        S().desktop.current = Math.min(S().desktop.current, S().desktop.pages.length - 1);
        save(); PHONE.renderDesktop(); paintBody(); PHONE.toast('页面已删除'); return;
      }
      const card = e.target.closest('[data-card]');
      const check = e.target.closest('[data-check]');
      if (check) {
        const id = check.dataset.check;
        if (libState.selected.has(id)) libState.selected.delete(id); else libState.selected.add(id);
        paintBody(); return;
      }
      if (card && libState.selecting) {
        const id = card.dataset.card;
        if (libState.selected.has(id)) libState.selected.delete(id); else libState.selected.add(id);
        paintBody(); return;
      }
      const edit = e.target.closest('[data-edit]')?.dataset.edit;
      if (edit) { openEditCard(edit); return; }
      const del = e.target.closest('[data-del]')?.dataset.del;
      if (del) {
        const key = currentLib()?.key; if (!key) return;
        S().cards[key] = S().cards[key].filter((c) => c.id !== del);
        save(); paintBody(); PHONE.toast('已删除'); return;
      }
    });

    bodyEl.addEventListener('input', (e) => {
      const range = e.target.closest('[data-range]');
      if (range) {
        const path = range.dataset.range;
        const v = Number(range.value);
        pathSet(path, v); save(); PHONE.applyTheme();
        const label = range.closest('.setting-range')?.querySelector('[data-range-label]');
        if (label) label.textContent = v + (range.dataset.unit || '');
        return;
      }
      const prob = e.target.closest('[data-prob]');
      if (prob) {
        const path = prob.dataset.prob, v = Number(prob.value);
        pathSet(path, v); save();
        const row = prob.closest('.prob-row');
        const num = row.querySelector('[data-probnum]'); if (num) num.value = v;
        const out = row.querySelector('[data-v]'); if (out) out.textContent = v + '%';
        return;
      }
      const probnum = e.target.closest('[data-probnum]');
      if (probnum) {
        const path = probnum.dataset.probnum; const v = PHONE.clamp(Number(probnum.value) || 0, 0, 100);
        pathSet(path, v); save();
        const row = probnum.closest('.prob-row');
        const range = row.querySelector('[data-prob]'); if (range) range.value = v;
        const out = row.querySelector('[data-v]'); if (out) out.textContent = v + '%';
        return;
      }
      const num = e.target.closest('[data-num]');
      if (num) { pathSet(num.dataset.num, Number(num.value) || 0); save(); return; }
      const field = e.target.closest('[data-field]');
      if (field) { pathSet(field.dataset.field, field.value); afterPathChange(field.dataset.field); return; }
      const search = e.target.closest('[data-lib-search]');
      if (search) { libState.search = search.value; filterRows(search.value); return; }
      const pageName = e.target.closest('[data-page-name]');
      if (pageName) {
        const p = S().desktop.pages.find((x) => x.id === pageName.dataset.pageName);
        if (p) { p.name = pageName.value || '页面'; save(); PHONE.renderDesktop(); }
      }
    });
    bodyEl.addEventListener('change', (e) => {
      const sel = e.target.closest('[data-select]');
      if (sel) { pathSet(sel.dataset.select, sel.value); save(); afterPathChange(sel.dataset.select); return; }
      const field = e.target.closest('[data-field]');
      if (field) { pathSet(field.dataset.field, field.value); afterPathChange(field.dataset.field); }
      const accentInput = e.target.closest('[data-accent-input]');
      if (accentInput) { S().theme.accent = accentInput.value; save(); PHONE.applyTheme(); paintBody(); }
      const rename = e.target.closest('[data-rename]');
      if (rename) { const g = S().cards.groups.find((x) => x.id === rename.dataset.rename); if (g && rename.value.trim()) { g.name = rename.value.trim(); save(); } }
    });
  }

  function filterRows(q) {
    const query = q.toLowerCase();
    bodyEl.querySelectorAll('.lib-row').forEach((row) => {
      row.style.display = row.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
    bodyEl.querySelectorAll('.sticker-cell').forEach((c) => { c.style.display = ''; });
  }

  function toggleSwitch(sw) {
    const path = sw.dataset.switch;
    const v = !pathGet(path);
    pathSet(path, v);
    sw.classList.toggle('on', v);
    sw.setAttribute('aria-checked', String(v));
    save();
    afterPathChange(path, v);
  }

  function afterPathChange(path, v) {
    if (path === 'settings.fullscreen') { PHONE.applyChrome(); }
    else if (path === 'settings.keepAlive') { PHONE.engine.setKeepAlive(!!pathGet(path)); }
    else if (path === 'settings.backgroundNotify') {
      if (pathGet(path)) PHONE.engine.requestNotifyPermission().then((ok) => { if (!ok) PHONE.toast('未获得通知权限，可稍后在浏览器设置中允许'); });
    } else if (path === 'statusbar.bluetooth' || path === 'statusbar.batteryPercent' || path === 'statusbar.signal' || path === 'statusbar.showName') {
      PHONE.applyChrome();
    } else if (path === 'profile.contactName' || path === 'profile.myName') {
      PHONE.applyChrome();
      PHONE.renderDesktop();
      if (PHONE.updateBadges) PHONE.updateBadges();
    } else if (path === 'profile.togetherSince') {
      PHONE.renderDesktop();
    } else if (path === 'theme.dim' || path === 'theme.blur') {
      PHONE.applyTheme();
    }
    save();
  }

  async function handleAction(act, el, e) {
    if (act === 'beautify') { sub = { type: 'beautify' }; paintBody(); return; }
    if (act === 'sub-back' || act === 'lib-back') { sub = null; paintBody(); return; }
    if (act === 'export') {
      PHONE.download(`Blaise-phone-backup-${PHONE.todayKey()}.json`, PHONE.exportState());
      PHONE.toast('数据已导出'); return;
    }
    if (act === 'import') {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
      inp.onchange = async () => {
        try {
          const text = await PHONE.readFile(inp.files[0], 'text');
          if (!(await PHONE.confirm('导入数据', '导入会覆盖当前全部数据，建议先导出一份备份。继续吗？'))) return;
          PHONE.importState(text);
          PHONE.toast('导入成功，正在刷新');
          setTimeout(() => location.reload(), 700);
        } catch (err) { PHONE.toast(err.message || '导入失败'); }
      };
      inp.click(); return;
    }
    if (act === 'reset') {
      if (!(await PHONE.confirm('恢复初始数据', '所有字卡、聊天、信件和设置都会被清空，且无法恢复。确定吗？', { danger: true }))) return;
      PHONE.resetState(); location.reload(); return;
    }
    if (act === 'pick-avatar') {
      const who = el.dataset.who;
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = async () => {
        try {
          const src = await PHONE.compressImage(inp.files[0], { max: 400, quality: 0.85 });
          if (who === 'me') S().profile.myAvatar = src; else S().profile.contactAvatar = src;
          save(); PHONE.renderDesktop(); paintBody(); PHONE.toast('头像已更新');
        } catch (err) { PHONE.toast(err.message); }
      };
      inp.click(); return;
    }
    if (act === 'test-in') { PHONE.sound.play('incoming'); return; }
    if (act === 'test-out') { PHONE.sound.play('outgoing'); return; }
    if (act === 'upload-sound') {
      const who = el.dataset.who;
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'audio/*';
      inp.onchange = async () => {
        const f = inp.files[0]; if (!f) return;
        if (f.size > 900000) { PHONE.toast('音频文件过大，请控制在 900KB 内'); return; }
        try {
          const data = await PHONE.readFile(f);
          if (who === 'in') S().settings.sounds.customIncoming = data; else S().settings.sounds.customOutgoing = data;
          save(); paintBody(); PHONE.toast('自定义音效已保存');
        } catch (err) { PHONE.toast('读取失败'); }
      };
      inp.click(); return;
    }
    if (act === 'clear-sound') {
      if (el.dataset.who === 'in') S().settings.sounds.customIncoming = ''; else S().settings.sounds.customOutgoing = '';
      save(); paintBody(); return;
    }
    if (act === 'wall-upload') {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = async () => {
        try {
          S().theme.wallpaper = await PHONE.compressImage(inp.files[0], { max: 1600, quality: 0.82 });
          S().theme.preset = ''; save(); PHONE.applyTheme(); paintBody(); PHONE.toast('壁纸已更换');
        } catch (err) { PHONE.toast(err.message); }
      };
      inp.click(); return;
    }
    if (act === 'wall-clear') { S().theme.wallpaper = ''; S().theme.preset = 'mist'; save(); PHONE.applyTheme(); paintBody(); return; }
    if (act === 'page-add') {
      const p = { id: PHONE.uid('p_'), name: '新页面', items: [] };
      S().desktop.pages.push(p); save(); PHONE.renderDesktop(); paintBody(); PHONE.toast('已添加桌面页面'); return;
    }
    if (act === 'font-upload') {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.ttf,.otf,.woff,.woff2,font/ttf,font/otf';
      inp.onchange = async () => {
        const f = inp.files[0]; if (!f) return;
        if (f.size > 4500000) { PHONE.toast('字体文件过大，请使用精简字库（小于 4.5MB）'); return; }
        try {
          const data = await PHONE.readFile(f);
          const name = f.name.replace(/\.[^.]+$/, '');
          const face = new FontFace('BlaiseCustomFont', `url(${data})`);
          await face.load();
          document.fonts.add(face);
          S().theme.font = { name, data };
          save(); PHONE.applyFont(); paintBody(); PHONE.toast('字体已应用');
        } catch (err) { PHONE.toast('字体加载失败：' + (err.message || '')); }
      };
      inp.click(); return;
    }
    if (act === 'font-reset') { S().theme.font = { name: '', data: '' }; save(); PHONE.applyFont(); paintBody(); return; }
    if (act === 'enter-edit') { PHONE.closeApp(); setTimeout(() => PHONE.enterEditMode && PHONE.enterEditMode(), 320); return; }
    if (act === 'lib-add') { openAddCard(); return; }
    if (act === 'sticker-add') {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
      inp.onchange = async () => {
        let n = 0;
        const files = Array.from(inp.files);
        PHONE.toast(`正在导入 ${files.length} 张图片…`, 1800);
        for (const f of files) {
          try { const src = await PHONE.compressImage(f, { max: 480, quality: 0.8 }); S().cards.sticker.push({ id: PHONE.uid('st_'), src }); n++; } catch (err) {}
          if (n % 10 === 0) await new Promise((r) => setTimeout(r, 0));
        }
        save(); paintBody(); PHONE.toast(`已导入 ${n} 张表情包`);
      };
      inp.click(); return;
    }
    if (act === 'lib-import') { openImport(); return; }
    if (act === 'lib-export') {
      const cur = currentLib(); if (!cur) return;
      if (cur.cfg.kind === 'image') PHONE.download(`${cur.key}-stickers.json`, JSON.stringify({ key: cur.key, items: cur.list }, null, 2));
      else PHONE.download(`${cur.key}-cards.txt`, cur.list.map((c) => c.text).join('\n'), 'text/plain;charset=utf-8');
      PHONE.toast('已导出'); return;
    }
    if (act === 'lib-batch') { libState.selecting = !libState.selecting; libState.selected.clear(); paintBody(); return; }
    if (act === 'select-all') { filteredList().forEach((c) => libState.selected.add(c.id)); paintBody(); return; }
    if (act === 'delete-selected') {
      if (!libState.selected.size) { PHONE.toast('还没有选择'); return; }
      if (!(await PHONE.confirm('批量删除', `确定删除 ${libState.selected.size} 条吗？`, { danger: true }))) return;
      const key = currentLib()?.key; S().cards[key] = S().cards[key].filter((c) => !libState.selected.has(c.id));
      libState.selected.clear(); save(); paintBody(); PHONE.toast('已删除'); return;
    }
    if (act === 'assign-group') { assignGroup(); return; }
    if (act === 'group-manage') { openGroups(); return; }
    if (act === 'lib-clear') {
      const cur = currentLib(); if (!cur) return;
      if (!(await PHONE.confirm('清空字卡库', `确定清空「${cur.cfg.name}」的全部内容吗？`, { danger: true }))) return;
      S().cards[cur.key] = []; save(); paintBody(); PHONE.toast('已清空'); return;
    }
    if (act === 'import-all-cards') {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
      inp.onchange = async () => {
        try {
          const data = JSON.parse(await PHONE.readFile(inp.files[0], 'text'));
          const cards = data.cards || data;
          if (!cards || !cards.main) throw new Error('不是字卡备份文件');
          if (!(await PHONE.confirm('导入全部字卡', '当前字卡库会被覆盖，确定继续吗？'))) return;
          S().cards = PHONE.mergeDefaults(S().cards, cards);
          save(); paintBody(); PHONE.toast('字卡已导入');
        } catch (err) { PHONE.toast(err.message || '导入失败'); }
      };
      inp.click(); return;
    }
    if (act === 'export-all-cards') {
      PHONE.download(`Blaise-cards-${PHONE.todayKey()}.json`, JSON.stringify({ cards: S().cards }, null, 2));
      PHONE.toast('全部字卡已导出'); return;
    }
  }

  function setWallpaperPreset(id) {
    const w = PHONE.WALLPAPERS.find((x) => x.id === id);
    if (!w) return;
    S().theme.wallpaper = ''; S().theme.preset = id; save(); PHONE.applyTheme(); paintBody();
  }

  function uploadIcon(appId) {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => {
      try {
        S().appIcons[appId] = await PHONE.compressImage(inp.files[0], { max: 300, quality: 0.85 });
        save(); PHONE.renderDesktop(); paintBody(); PHONE.toast('图标已更换');
      } catch (err) { PHONE.toast(err.message); }
    };
    inp.click();
  }

  PHONE.registerApp({
    id: 'settings', name: '设置', icon: 'settings', color: '#b8b0c4',
    render(root) {
      tab = 'general'; sub = null; cardsTab = 'chat';
      render(root);
    },
    onClose() { sub = null; }
  });
  PHONE.settingsApp = { openBeautify: () => { tab = 'general'; sub = { type: 'beautify' }; if (PHONE.currentApp === 'settings') paintBody(); }, paintBody };
})();
