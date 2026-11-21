/* ============================================================
   Blaise Phone · 消息（仿微信聊天）
   ============================================================ */
(function () {
  const S = () => PHONE.state;
  const EMOJI = ['😊', '🥰', '😘', '😴', '🌙', '✨', '💫', '❤️', '🫶', '💌', '🌸', '🍰', '☕️', '🌧️', '🕯️', '🎧', '📖', '🐈‍⬛', '😭', '😤', '🙃', '😌', '🤍', '💚', '🖤', '🦋', '🌿', '🍂', '🎐', '🫧', '😳', '🥺', '😏', '🤭', '😔', '🫠', '🌹', '🍷', '🎵', '🕊️'];
  const KAO = ['(˶ᵔ ᵕ ᵔ˶)', '(๑•́ ₃ •̀๑)', '(｡•̀ᴗ-)✧', '(¬‿¬)', '♡(˃͈ દ ˂͈ ༶ )', '(*/ω＼*)', '(´;ω;｀)', '(￣▽￣)ノ'];
  const WALLS = [
    { id: 'mist', css: 'linear-gradient(160deg,#efe7ec 0%,#e4dbe8 45%,#d9d3e3 100%)' },
    { id: 'dusk', css: 'linear-gradient(160deg,#f6e7dd 0%,#e7c9c6 48%,#b9a2b8 100%)' },
    { id: 'sage', css: 'linear-gradient(160deg,#e6ece4 0%,#cbd8cd 50%,#aebfb4 100%)' },
    { id: 'ink', css: 'linear-gradient(160deg,#3c3742 0%,#2c2932 55%,#1f1d24 100%)' },
    { id: 'paper', css: 'linear-gradient(160deg,#fbf8f1 0%,#f3ece0 60%,#e9dfd1 100%)' },
    { id: 'night', css: 'linear-gradient(160deg,#2a3040 0%,#39415a 56%,#5b536d 100%)' }
  ];

  let rootEl = null, scrollEl = null, taEl = null;
  let typing = false, moreOpen = false, emojiOpen = false;
  let incomingTimer = null;
  let bound = false;
  let unreadBeforeOpen = 0;

  const isOpen = () => PHONE.currentApp === 'chat';
  function now() { return PHONE.now(); }
  function save() { PHONE.save(); }
  function cssImage(v) {
    if (!v) return '';
    return /^(linear-gradient|radial-gradient|url\()/.test(v) ? v : `url("${v}")`;
  }
  function me() { return S().profile.myName; }
  function him() { return S().profile.contactName; }

  function msgAvatar(from) {
    const st = S();
    return from === 'me'
      ? PHONE.avatarHTML(st.profile.myAvatar, st.profile.myName, 'msg-avatar-inner')
      : PHONE.avatarHTML(st.profile.contactAvatar, st.profile.contactName, 'msg-avatar-inner');
  }

  function dayLabel(ts) {
    const d = new Date(ts), n = new Date(now());
    if (d.toDateString() === n.toDateString()) return PHONE.fmtClock(ts);
    const y = new Date(n); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return '昨天 ' + PHONE.fmtClock(ts);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${PHONE.fmtClock(ts)}`;
  }

  function insideHTML(m) {
    if (m.type === 'image') return `<img class="msg-image" src="${m.src}" alt="图片" data-img="${m.id}">`;
    if (m.type === 'sticker') return `<img class="msg-sticker" src="${m.src}" alt="表情包" data-img="${m.id}">`;
    if (m.type === 'voice') {
      return `<button class="voice-bubble" data-voice="${m.id}" style="width:${PHONE.clamp(78 + (m.duration || 3) * 5, 96, 200)}px">
        <span class="voice-waves"><i></i><i></i><i></i><i></i></span>
        <span class="voice-dur">${m.duration || 1}″</span>
        ${m.from === 'them' ? '<span class="voice-dot"></span>' : ''}
      </button>`;
    }
    if (m.type === 'redpacket') {
      return `<button class="redpacket-bubble ${m.opened ? 'is-opened' : ''}" data-rp="${m.id}">
        <span class="rp-symbol">${PHONE.icon('gift', 22)}</span>
        <span class="rp-copy"><b>${PHONE.esc(m.note || '恭喜发财，大吉大利')}</b><em>${m.opened ? '已领取' : (m.from === 'me' ? '等待对方领取' : '点击领取红包')}</em></span>
        <span class="rp-arrow">${PHONE.icon('forward', 16)}</span>
      </button>`;
    }
    return `<div class="msg-bubble">${PHONE.esc(m.text || '')}</div>`;
  }

  function messageHTML(m, prev) {
    let out = '';
    if (!prev || m.ts - prev.ts > 10 * 60000 || new Date(m.ts).toDateString() !== new Date(prev.ts).toDateString()) {
      out += `<div class="chat-day"><span>${dayLabel(m.ts)}</span></div>`;
    }
    if (m.type === 'pat') {
      const prefix = m.from === 'me' ? `我 拍了拍 ${him()}` : `${him()} 拍了拍我`;
      return out + `<div class="chat-pat">${PHONE.icon('heart', 12)} <span>${PHONE.esc(prefix + (m.text || ''))}</span></div>`;
    }
    if (m.type === 'call' || m.from === 'system') {
      return out + `<div class="chat-call">${PHONE.icon(m.type === 'call' ? 'phone' : 'info', 12)} <span>${PHONE.esc(m.text || '')}</span></div>`;
    }
    const mine = m.from === 'me';
    return out + `<div class="msg-row ${mine ? 'mine' : 'theirs'}" data-msg="${m.id}">
      <div class="msg-avatar">${msgAvatar(m.from)}</div>
      <div class="msg-stack">${insideHTML(m)}</div>
    </div>`;
  }

  function renderMessages(forceBottom) {
    if (!scrollEl) return;
    const st = S();
    const msgs = st.chat.messages || [];
    const nearBottom = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < 160;
    let html = '';
    msgs.forEach((m, i) => { html += messageHTML(m, i ? msgs[i - 1] : null); });
    if (!msgs.length) html = `<div class="chat-empty"><span>${PHONE.icon('chat', 30)}</span><p>还没有消息。说点什么吧，${PHONE.esc(him())} 会从字卡库里回应你。</p></div>`;
    if (typing) html += `<div class="typing-row"><div class="msg-avatar">${msgAvatar('them')}</div><div class="typing-bubble"><i></i><i></i><i></i></div></div>`;
    scrollEl.innerHTML = html;
    const sub = rootEl && rootEl.querySelector('[data-chat-sub]');
    if (sub) sub.textContent = typing ? '对方正在输入…' : '在线';
    if (forceBottom || nearBottom) scrollEl.scrollTop = scrollEl.scrollHeight;
  }

  function updateHeader() {
    if (!rootEl) return;
    const name = rootEl.querySelector('[data-chat-name]');
    if (name) name.textContent = him();
    const sub = rootEl.querySelector('[data-chat-sub]');
    if (sub) sub.textContent = typing ? '对方正在输入…' : '在线';
  }

  function applyWallpaper() {
    if (!rootEl) return;
    const st = S();
    const wall = rootEl.querySelector('.chat-wallpaper');
    if (!wall) return;
    const v = st.settings.chat.wallpaper;
    if (v) wall.style.backgroundImage = cssImage(v);
    else wall.style.backgroundImage = WALLS[0].css;
    wall.style.setProperty('--chat-dim', String((Number(st.settings.chat.dim) || 0) / 100));
    rootEl.style.setProperty('--chat-font', (st.settings.chat.fontScale || 15) + 'px');
  }

  function applyBubbleCss() {
    let tag = document.getElementById('chat-user-css');
    if (!tag) { tag = document.createElement('style'); tag.id = 'chat-user-css'; document.head.appendChild(tag); }
    tag.textContent = S().settings.chat.bubbleCss || '';
  }

  /* ---------------- 发送 ---------------- */
  function pushMy(msg) {
    const base = Object.assign({ id: PHONE.uid('msg_'), from: 'me', ts: now() }, msg);
    S().chat.messages.push(base);
    S().chat.unread = 0;
    save();
    PHONE.sound.play('outgoing');
    renderMessages(true);
    PHONE.bus.emit('chat:change');
    return base;
  }

  function sendText() {
    if (!taEl) return;
    const text = taEl.value.trim();
    if (!text) return;
    taEl.value = '';
    taEl.style.height = 'auto';
    rootEl.querySelector('.send-btn')?.classList.remove('visible');
    pushMy({ type: 'text', text });
    closePanels();
    PHONE.engine.scheduleReply();
  }

  function sendImages(files) {
    const arr = Array.from(files || []).slice(0, 9);
    if (!arr.length) return;
    (async () => {
      for (const f of arr) {
        try {
          const src = await PHONE.compressImage(f, { max: 1400, quality: 0.8 });
          pushMy({ type: 'image', src });
        } catch (e) { PHONE.toast(e.message); }
      }
      if (PHONE.chance(70)) PHONE.engine.scheduleReply({ delay: PHONE.randInt(3, 8) * 1000 });
    })();
  }

  function pickImages(capture) {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    if (capture) input.setAttribute('capture', 'environment');
    else input.multiple = true;
    input.onchange = () => sendImages(input.files);
    input.click();
  }

  function sendVoice(duration) {
    pushMy({ type: 'voice', text: '', duration });
    if (PHONE.chance(85)) PHONE.engine.scheduleReply({ delay: PHONE.randInt(3, 9) * 1000 });
  }

  function sendPatMe() {
    const card = PHONE.pick(S().cards.patMine);
    if (!card) { PHONE.toast('请先在设置中添加拍一拍字卡'); return; }
    const msg = { id: PHONE.uid('pat_'), from: 'me', type: 'pat', text: card.text, ts: now() };
    S().chat.messages.push(msg); save(); renderMessages(true);
    if (PHONE.chance(40)) {
      setTimeout(() => {
        const back = PHONE.pick(S().cards.patTheirs);
        if (back) {
          const m = { id: PHONE.uid('pat_'), from: 'them', type: 'pat', text: back.text, ts: now() };
          S().chat.messages.push(m); save(); PHONE.bus.emit('chat:new', m);
        }
      }, PHONE.randInt(1500, 3800));
    }
  }

  /* ---------------- 红包 ---------------- */
  function redPacketSheet() {
    const host = document.createElement('div');
    host.innerHTML = `
      <div class="rp-compose">
        <div class="rp-compose-ico">${PHONE.icon('gift', 30)}</div>
        <label class="field"><span>金额（元）</span><input id="rp-amount" type="number" min="0.01" max="200" step="0.01" value="13.14"></label>
        <label class="field"><span>留言</span><input id="rp-note" maxlength="24" value="恭喜发财，大吉大利"></label>
        <p class="editor-hint">你发红包后，对方有一定概率回发一个红包。</p>
      </div>`;
    const sheet = PHONE.sheet({
      title: '发红包', subtitle: '给对方设一个额度', content: host,
      footer: `<button class="btn ghost" data-x>取消</button><button class="btn primary" data-send>塞进红包</button>`
    });
    sheet.footerEl.querySelector('[data-x]').onclick = sheet.close;
    sheet.footerEl.querySelector('[data-send]').onclick = () => {
      const amount = Math.max(0.01, Math.min(200, Number(host.querySelector('#rp-amount').value) || 0));
      const note = host.querySelector('#rp-note').value.trim() || '恭喜发财，大吉大利';
      const msg = pushMy({ type: 'redpacket', amount: Number(amount.toFixed(2)), note, opened: false });
      sheet.close();
      scheduleContactOpen(msg);
    };
  }

  function scheduleContactOpen(msg) {
    if (msg._openTimer) return;
    msg._openTimer = true;
    setTimeout(() => {
      if (msg.opened) return;
      msg.opened = true; save();
      if (isOpen()) renderMessages();
      PHONE.engine.notify({ app: 'chat', title: him(), body: `领取了你的红包 · ¥${msg.amount.toFixed(2)}`, open: () => PHONE.openApp('chat') });
      setTimeout(() => {
        if (!PHONE.chance(38)) return;
        const amount = PHONE.pick([5.2, 13.14, 20, 52, 66.66, 99.99, 131.4]);
        const st = S();
        const m = { id: PHONE.uid('rp_'), from: 'them', type: 'redpacket', amount, note: '一点心意，收好。', opened: false, ts: now() };
        st.chat.messages.push(m);
        st.chat.lastIncoming = m.ts;
        if (!isOpen()) st.chat.unread = (st.chat.unread || 0) + 1;
        save();
        PHONE.bus.emit('chat:new', m);
        PHONE.engine.notify({ app: 'chat', title: him(), body: `给你发了一个红包 · ¥${amount.toFixed(2)}`, open: () => PHONE.openApp('chat') });
      }, PHONE.randInt(2200, 5200));
    }, PHONE.randInt(2600, 7000));
  }

  function openRedPacket(id) {
    const m = S().chat.messages.find((x) => x.id === id);
    if (!m) return;
    if (m.type !== 'redpacket') return;
    if (m.from === 'me') {
      const host = document.createElement('div');
      host.innerHTML = `<div class="rp-status"><div class="rp-status-ico">${PHONE.icon('gift', 34)}</div>
        <b>${m.opened ? '对方已领取' : '等待对方领取'}</b>
        <span>¥ ${Number(m.amount).toFixed(2)}</span>
        <p>${PHONE.esc(m.note || '')}</p></div>`;
      PHONE.sheet({ title: '我的红包', content: host });
      return;
    }
    const l = document.getElementById('overlay-layer');
    const ov = document.createElement('div');
    ov.className = 'redpacket-overlay theme-red';
    ov.innerHTML = `
      <div class="rp-bg-glow"></div>
      <button class="rp-close" aria-label="关闭">${PHONE.icon('close', 20)}</button>
      <div class="rp-card">
        <div class="rp-card-top">
          <div class="rp-avatar">${PHONE.avatarHTML(S().profile.contactAvatar, him())}</div>
          <div class="rp-from">${PHONE.esc(him())} 的红包</div>
          <div class="rp-note">${PHONE.esc(m.note || '恭喜发财，大吉大利')}</div>
        </div>
        <button class="rp-open-btn">開</button>
        <div class="rp-reveal"><small>已存入零钱</small><b>¥ ${Number(m.amount).toFixed(2)}</b></div>
        <div class="rp-foot">Blaise · 只想把好的都给你</div>
      </div>`;
    l.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('show'));
    const close = () => { ov.classList.remove('show'); setTimeout(() => ov.remove(), 260); };
    ov.querySelector('.rp-close').onclick = close;
    const openBtn = ov.querySelector('.rp-open-btn');
    const reveal = ov.querySelector('.rp-reveal');
    openBtn.onclick = () => {
      if (m.opened) { openBtn.style.display = 'none'; reveal.classList.add('show'); return; }
      m.opened = true; save();
      openBtn.classList.add('spinning');
      setTimeout(() => {
        ov.querySelector('.rp-card').classList.add('revealed');
        openBtn.style.display = 'none';
        reveal.classList.add('show');
        renderMessages();
        PHONE.sound.play('incoming');
      }, 620);
    };
    if (m.opened) {
      openBtn.style.display = 'none';
      reveal.classList.add('show');
      ov.querySelector('.rp-card').classList.add('revealed');
    }
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
  }

  /* ---------------- 聊天设置 ---------------- */
  function chatSettings() {
    const st = S();
    const host = document.createElement('div');
    host.innerHTML = `
      <div class="settings-form">
        <section class="form-section">
          <h4>联系人</h4>
          <label class="field"><span>对方昵称</span><input id="cs-name" value="${PHONE.esc(him())}" maxlength="18"></label>
          <label class="field"><span>我的昵称</span><input id="cs-me" value="${PHONE.esc(me())}" maxlength="18"></label>
          <p class="editor-hint">昵称会同步到桌面、聊天、信箱、朋友圈和小组件。</p>
        </section>
        <section class="form-section">
          <h4>聊天壁纸</h4>
          <div class="wall-preview" id="cs-wall-preview"></div>
          <div class="wall-presets">${WALLS.map((w) => `<button class="wall-dot" data-wall="${w.id}" style="background:${w.css}" title="${w.id}"></button>`).join('')}</div>
          <div class="btn-row">
            <button class="btn soft" data-act="wall-upload">${PHONE.icon('image', 15)} 上传图片</button>
            <button class="btn ghost" data-act="wall-reset">恢复默认</button>
          </div>
          <label class="field range-field"><span>壁纸遮罩 <b id="cs-dim-label">${st.settings.chat.dim}%</b></span><input id="cs-dim" type="range" min="0" max="70" value="${st.settings.chat.dim}"></label>
        </section>
        <section class="form-section">
          <h4>页面美化 · 气泡 CSS</h4>
          <label class="field"><span>自定义 CSS（作用于聊天气泡）</span><textarea id="cs-css" rows="5" placeholder=".msg-bubble { border-radius: 20px; }\n.msg-row.mine .msg-bubble { background: #7c6a8a; color: white; }">${PHONE.esc(st.settings.chat.bubbleCss || '')}</textarea></label>
          <div class="btn-row">
            <button class="btn soft" data-act="css-import">${PHONE.icon('upload', 15)} 导入 CSS</button>
            <button class="btn soft" data-act="css-apply">${PHONE.icon('check', 15)} 应用样式</button>
          </div>
          <p class="editor-hint">可以自由更换气泡圆角、颜色、阴影、字体。导入的 CSS 只在本应用内生效。</p>
        </section>
        <section class="form-section">
          <h4>通话</h4>
          <div class="call-bg-preview" id="cs-call-preview"></div>
          <div class="btn-row">
            <button class="btn soft" data-act="call-upload">${PHONE.icon('image', 15)} 上传视频通话背景</button>
            <button class="btn ghost" data-act="call-reset">恢复默认</button>
          </div>
          <button class="btn soft full" data-act="test-call">${PHONE.icon('video', 16)} 模拟对方来电</button>
        </section>
        <section class="form-section">
          <h4>聊天字号</h4>
          <label class="field range-field"><span>字号 <b id="cs-font-label">${st.settings.chat.fontScale}px</b></span><input id="cs-font" type="range" min="13" max="19" value="${st.settings.chat.fontScale}"></label>
          <p class="editor-hint">全局字体更换请到「设置 → 通用 → 桌面美化 → 字体」。</p>
        </section>
        <section class="form-section danger-zone">
          <h4>聊天记录</h4>
          <button class="btn danger full" data-act="clear">${PHONE.icon('trash', 15)} 清空聊天记录</button>
        </section>
      </div>`;
    const sheet = PHONE.sheet({
      title: '聊天设置', subtitle: '壁纸、样式与联系人', content: host,
      footer: `<button class="btn ghost" data-x>取消</button><button class="btn primary" data-save>保存</button>`
    });
    const preview = host.querySelector('#cs-wall-preview');
    const renderPreview = () => {
      const v = st.settings.chat.wallpaper;
      preview.style.backgroundImage = v ? cssImage(v) : WALLS[0].css;
    };
    renderPreview();
    const callPrev = host.querySelector('#cs-call-preview');
    const renderCallPrev = () => {
      callPrev.innerHTML = st.settings.chat.callBackground
        ? `<img src="${st.settings.chat.callBackground}" alt="">`
        : `<div class="call-bg-placeholder">${PHONE.icon('video', 20)} 默认动态背景</div>`;
    };
    renderCallPrev();

    host.querySelector('[data-act="wall-upload"]').onclick = () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = async () => {
        try {
          const src = await PHONE.compressImage(inp.files[0], { max: 1500, quality: 0.8 });
          st.settings.chat.wallpaper = src; save(); renderPreview(); applyWallpaper();
        } catch (e) { PHONE.toast(e.message); }
      };
      inp.click();
    };
    host.querySelector('[data-act="wall-reset"]').onclick = () => { st.settings.chat.wallpaper = ''; save(); renderPreview(); applyWallpaper(); };
    host.querySelectorAll('[data-wall]').forEach((b) => {
      b.onclick = () => {
        const w = WALLS.find((x) => x.id === b.dataset.wall);
        if (!w) return;
        st.settings.chat.wallpaper = w.css; save(); renderPreview(); applyWallpaper();
      };
    });
    host.querySelector('#cs-dim').oninput = (e) => { st.settings.chat.dim = Number(e.target.value); host.querySelector('#cs-dim-label').textContent = e.target.value + '%'; applyWallpaper(); };
    host.querySelector('#cs-font').oninput = (e) => { st.settings.chat.fontScale = Number(e.target.value); host.querySelector('#cs-font-label').textContent = e.target.value + 'px'; applyWallpaper(); };
    host.querySelector('[data-act="css-apply"]').onclick = () => { st.settings.chat.bubbleCss = host.querySelector('#cs-css').value; save(); applyBubbleCss(); PHONE.toast('气泡样式已应用'); };
    host.querySelector('[data-act="css-import"]').onclick = () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.css,text/css,text/plain';
      inp.onchange = async () => { const t = await PHONE.readFile(inp.files[0], 'text'); host.querySelector('#cs-css').value = t; st.settings.chat.bubbleCss = t; save(); applyBubbleCss(); PHONE.toast('CSS 已导入并应用'); };
      inp.click();
    };
    host.querySelector('[data-act="call-upload"]').onclick = () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = async () => {
        try { const src = await PHONE.compressImage(inp.files[0], { max: 1200, quality: 0.8 }); st.settings.chat.callBackground = src; save(); renderCallPrev(); }
        catch (e) { PHONE.toast(e.message); }
      };
      inp.click();
    };
    host.querySelector('[data-act="call-reset"]').onclick = () => { st.settings.chat.callBackground = ''; save(); renderCallPrev(); };
    host.querySelector('[data-act="test-call"]').onclick = () => { sheet.close(); setTimeout(() => PHONE.Call.start({ incoming: true, video: PHONE.chance(55) }), 220); };
    host.querySelector('[data-act="clear"]').onclick = async () => {
      if (await PHONE.confirm('清空聊天记录', '聊天记录会全部删除，且不可恢复。确定吗？', { danger: true })) {
        st.chat.messages = []; st.chat.unread = 0; save(); renderMessages(true); sheet.close(); PHONE.toast('聊天记录已清空');
      }
    };
    sheet.footerEl.querySelector('[data-x]').onclick = sheet.close;
    sheet.footerEl.querySelector('[data-save]').onclick = () => {
      const name = host.querySelector('#cs-name').value.trim();
      const mine = host.querySelector('#cs-me').value.trim();
      if (name) st.profile.contactName = name;
      if (mine) st.profile.myName = mine;
      st.settings.chat.bubbleCss = host.querySelector('#cs-css').value;
      save(); applyBubbleCss(); updateHeader(); applyWallpaper(); sheet.close();
      if (PHONE.renderDesktop) PHONE.renderDesktop();
      PHONE.toast('已保存');
    };
  }

  /* ---------------- 面板 / 录音 ---------------- */
  function closePanels() {
    moreOpen = false; emojiOpen = false;
    rootEl?.querySelector('[data-more-panel]')?.classList.remove('open');
    rootEl?.querySelector('[data-emoji-panel]')?.classList.remove('open');
  }
  function toggleMore() {
    moreOpen = !moreOpen; emojiOpen = false;
    rootEl.querySelector('[data-more-panel]').classList.toggle('open', moreOpen);
    rootEl.querySelector('[data-emoji-panel]').classList.remove('open');
    if (moreOpen) snapBottom();
  }
  function toggleEmoji() {
    emojiOpen = !emojiOpen; moreOpen = false;
    rootEl.querySelector('[data-emoji-panel]').classList.toggle('open', emojiOpen);
    rootEl.querySelector('[data-more-panel]').classList.remove('open');
    if (emojiOpen) snapBottom();
  }
  function snapBottom() { requestAnimationFrame(() => { if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight; }); }

  function startRecording(e) {
    e.preventDefault();
    if (!e.isPrimary && e.pointerType !== 'touch') return;
    const mic = rootEl.querySelector('[data-act="mic"]');
    try { mic.setPointerCapture(e.pointerId); } catch (err) {}
    const hud = document.createElement('div');
    hud.className = 'record-hud';
    hud.innerHTML = `<div class="record-wave"><i></i><i></i><i></i><i></i><i></i></div><b><span data-rec-sec>0</span>″</b><small>松开发送 · 上滑取消</small>`;
    rootEl.appendChild(hud);
    const start = Date.now();
    let cancel = false, raf = 0;
    const upd = () => {
      const sec = Math.floor((Date.now() - start) / 1000);
      const sEl = hud.querySelector('[data-rec-sec]'); if (sEl) sEl.textContent = String(sec);
      raf = requestAnimationFrame(upd);
    };
    upd();
    const move = (ev) => {
      if (start && Math.abs(ev.clientY - e.clientY) > 70) cancel = true;
      hud.classList.toggle('cancel', cancel);
    };
    const up = () => {
      cancelAnimationFrame(raf);
      const sec = Math.max(1, Math.round((Date.now() - start) / 1000));
      hud.remove();
      mic.removeEventListener('pointermove', move);
      mic.removeEventListener('pointerup', up);
      mic.removeEventListener('pointercancel', up);
      if (cancel) { PHONE.toast('已取消'); return; }
      if (sec < 1) { PHONE.toast('说话时间太短'); return; }
      sendVoice(Math.min(sec, 60));
    };
    mic.addEventListener('pointermove', move);
    mic.addEventListener('pointerup', up);
    mic.addEventListener('pointercancel', up);
  }

  /* ---------------- 主渲染 ---------------- */
  function render(root) {
    rootEl = root;
    unreadBeforeOpen = S().chat.unread || 0;
    S().chat.unread = 0; S().chat.lastReadTs = now(); save();
    root.classList.add('chat-app');
    root.innerHTML = `
      <div class="chat-shell">
        <header class="chat-top">
          <button class="icon-btn" data-act="back" aria-label="返回">${PHONE.icon('back', 22)}</button>
          <div class="chat-title"><div class="chat-title-name" data-chat-name>${PHONE.esc(him())}</div><div class="chat-title-sub" data-chat-sub>在线</div></div>
          <button class="icon-btn" data-act="settings" aria-label="聊天设置">${PHONE.icon('gear', 21)}</button>
        </header>
        <main class="chat-main">
          <div class="chat-wallpaper"></div>
          <div class="chat-scroll" data-chat-scroll></div>
        </main>
        <footer class="composer">
          <div class="emoji-panel" data-emoji-panel>
            <div class="emoji-tabs"><button class="active" data-etab="emoji">Emoji</button><button data-etab="kao">颜文字</button></div>
            <div class="emoji-grid" data-emoji-grid>${EMOJI.map((x) => `<button data-emoji="${x}">${x}</button>`).join('')}</div>
            <div class="emoji-grid kao" data-kao-grid>${KAO.map((x) => `<button data-emoji="${x}">${x}</button>`).join('')}</div>
          </div>
          <div class="more-panel" data-more-panel>
            <div class="more-grid">
              <button data-more="album"><span>${PHONE.icon('image', 23)}</span><em>相册</em></button>
              <button data-more="camera"><span>${PHONE.icon('camera', 23)}</span><em>拍摄</em></button>
              <button data-more="redpacket"><span>${PHONE.icon('gift', 23)}</span><em>红包</em></button>
              <button data-more="call"><span>${PHONE.icon('phone', 23)}</span><em>语音通话</em></button>
              <button data-more="video"><span>${PHONE.icon('video', 23)}</span><em>视频通话</em></button>
              <button data-more="pat"><span>${PHONE.icon('heart', 23)}</span><em>拍一拍</em></button>
              <button data-more="location"><span>${PHONE.icon('link', 23)}</span><em>位置</em></button>
              <button data-more="card"><span>${PHONE.icon('user', 23)}</span><em>名片</em></button>
            </div>
          </div>
          <div class="composer-bar">
            <button class="composer-btn" data-act="mic" aria-label="语音">${PHONE.icon('mic', 22)}</button>
            <div class="input-wrap">
              <textarea rows="1" data-chat-input placeholder="说点什么…" maxlength="2000"></textarea>
              <button class="send-btn" data-act="send" aria-label="发送">${PHONE.icon('send', 17)}</button>
            </div>
            <button class="composer-btn" data-act="emoji" aria-label="表情">${PHONE.icon('smile', 22)}</button>
            <button class="composer-btn auto-btn" data-act="auto" aria-label="让对方抽取字卡" title="让对方自动抽取字卡">${PHONE.icon('bubbleSpark', 22)}</button>
            <button class="composer-btn" data-act="more" aria-label="更多">${PHONE.icon('dots', 22)}</button>
          </div>
        </footer>
      </div>`;

    scrollEl = root.querySelector('[data-chat-scroll]');
    taEl = root.querySelector('[data-chat-input]');
    applyWallpaper();
    applyBubbleCss();
    renderMessages(true);
    bind();
    if (!bound) { bindBus(); bound = true; }
    scheduleIncomingCall();
  }

  function bindBus() {
    PHONE.bus.on('chat:new', () => {
      if (isOpen()) { renderMessages(); if (S().chat.unread) { S().chat.unread = 0; save(); } }
    });
    PHONE.bus.on('chat:typing', (v) => {
      typing = !!v;
      if (isOpen()) renderMessages();
    });
    PHONE.bus.on('chat:read-no-reply', () => {
      typing = false;
      if (isOpen()) {
        const sub = rootEl.querySelector('[data-chat-sub]');
        if (sub) sub.textContent = '已读';
        setTimeout(() => { if (isOpen()) { const s2 = rootEl.querySelector('[data-chat-sub]'); if (s2) s2.textContent = '在线'; } }, 2200);
      }
    });
  }

  function bind() {
    const ac = new AbortController();
    rootEl.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'back') { PHONE.closeApp(); return; }
      if (act === 'settings') { chatSettings(); return; }
      if (act === 'send') { sendText(); return; }
      if (act === 'emoji') { toggleEmoji(); return; }
      if (act === 'more') { toggleMore(); return; }
      if (act === 'auto') {
        if (typing) return;
        closePanels();
        typing = true; renderMessages(true);
        setTimeout(() => {
          const p = S().prob.chat;
          const n = PHONE.randInt(PHONE.clamp(Number(p.minCards) || 1, 1, 6), PHONE.clamp(Number(p.maxCards) || 2, 1, 6));
          PHONE.engine.sendContactCards(n, { sound: true });
        }, PHONE.randInt(600, 1600));
        return;
      }
      const more = e.target.closest('[data-more]')?.dataset.more;
      if (more) {
        closePanels();
        if (more === 'album') pickImages(false);
        else if (more === 'camera') pickImages(true);
        else if (more === 'redpacket') redPacketSheet();
        else if (more === 'call') PHONE.Call.start({ video: false });
        else if (more === 'video') PHONE.Call.start({ video: true });
        else if (more === 'pat') sendPatMe();
        else PHONE.toast('这个功能还在路上');
        return;
      }
      const etab = e.target.closest('[data-etab]')?.dataset.etab;
      if (etab) {
        rootEl.querySelectorAll('[data-etab]').forEach((b) => b.classList.toggle('active', b === e.target.closest('[data-etab]')));
        rootEl.querySelector('[data-emoji-grid]').style.display = etab === 'emoji' ? '' : 'none';
        rootEl.querySelector('[data-kao-grid]').style.display = etab === 'kao' ? 'grid' : 'none';
        return;
      }
      const em = e.target.closest('[data-emoji]')?.dataset.emoji;
      if (em && taEl) {
        const start = taEl.selectionStart || taEl.value.length;
        const end = taEl.selectionEnd || taEl.value.length;
        taEl.value = taEl.value.slice(0, start) + em + taEl.value.slice(end);
        taEl.focus(); taEl.selectionStart = taEl.selectionEnd = start + em.length;
        autoGrow();
        return;
      }
      const rp = e.target.closest('[data-rp]')?.dataset.rp;
      if (rp) { openRedPacket(rp); return; }
      const voice = e.target.closest('[data-voice]')?.dataset.voice;
      if (voice) {
        const m = S().chat.messages.find((x) => x.id === voice);
        PHONE.sound.play('incoming');
        if (m && m.text) PHONE.toast(m.text, 2600); else PHONE.toast('语音消息 · 已播放');
        e.target.closest('.voice-bubble')?.classList.add('playing');
        setTimeout(() => e.target.closest('.voice-bubble')?.classList.remove('playing'), 900);
        return;
      }
      const img = e.target.closest('[data-img]')?.dataset.img;
      if (img) { const m = S().chat.messages.find((x) => x.id === img); if (m) viewImage(m.src); return; }
      if (!e.target.closest('.composer')) closePanels();
    }, { signal: ac.signal });

    rootEl.querySelector('[data-chat-input]').addEventListener('input', autoGrow, { signal: ac.signal });
    rootEl.querySelector('[data-chat-input]').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendText(); }
    }, { signal: ac.signal });
    rootEl.querySelector('[data-act="mic"]').addEventListener('pointerdown', startRecording, { signal: ac.signal });
  }

  function autoGrow() {
    if (!taEl) return;
    taEl.style.height = 'auto';
    taEl.style.height = Math.min(92, taEl.scrollHeight) + 'px';
    const btn = rootEl.querySelector('.send-btn');
    if (btn) btn.classList.toggle('visible', !!taEl.value.trim());
  }

  function viewImage(src) {
    const l = document.getElementById('overlay-layer');
    const ov = document.createElement('div');
    ov.className = 'image-viewer';
    ov.innerHTML = `<button class="image-viewer-close">${PHONE.icon('close', 22)}</button><img src="${src}" alt="">`;
    l.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('show'));
    const close = () => { ov.classList.remove('show'); setTimeout(() => ov.remove(), 250); };
    ov.onclick = close;
    ov.querySelector('img').onclick = (e) => e.stopPropagation();
  }

  function scheduleIncomingCall() {
    clearTimeout(incomingTimer);
    if (PHONE.Call.isActive()) return;
    incomingTimer = setTimeout(() => {
      if (!isOpen() || PHONE.Call.isActive()) return;
      if (PHONE.chance(Number(S().prob.chat.callIn) || 0)) {
        PHONE.Call.start({ incoming: true, video: PHONE.chance(55) });
      } else scheduleIncomingCall();
    }, PHONE.randInt(55000, 160000));
  }

  PHONE.registerApp({
    id: 'chat', name: '消息', icon: 'chat', color: '#9db8e8',
    render,
    onClose() { typing = false; closePanels(); clearTimeout(incomingTimer); }
  });

  PHONE.chat = {
    isOpen,
    refresh: () => { if (isOpen() && scrollEl) renderMessages(true); },
    openSettings: chatSettings,
    sendPatMe
  };
})();
