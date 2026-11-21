/* ============================================================
   Blaise Phone · 字卡引擎 / 通知 / 音效 / 后台节拍
   ============================================================ */
(function () {
  const E = {};
  const S = () => PHONE.state;

  /* ---------------- 文本与字卡 ---------------- */
  function fill(text) {
    const st = S();
    return String(text || '')
      .replace(/\{name\}/g, st.profile.contactName)
      .replace(/\{contact\}/g, st.profile.contactName)
      .replace(/\{me\}/g, st.profile.myName)
      .replace(/\{days\}/g, String(PHONE.daysTogether(st.profile.togetherSince)));
  }

  function cardTypes() {
    const c = S().cards, p = S().prob.chat;
    return [
      { key: 'main', w: Number(p.main), ok: c.main.length > 0 },
      { key: 'kaomoji', w: Number(p.kaomoji), ok: c.kaomoji.length > 0 },
      { key: 'emoji', w: Number(p.emoji), ok: c.emoji.length > 0 },
      { key: 'sticker', w: Number(p.sticker), ok: c.stickers.length > 0 },
      { key: 'pat', w: Number(p.pat), ok: c.patTheirs.length > 0 },
      { key: 'voice', w: Number(p.voice), ok: c.voice.length > 0 },
      { key: 'free', w: Number(p.free), ok: c.free.length > 0 }
    ].filter((t) => t.ok && t.w > 0);
  }

  function mainCard() {
    const st = S(), c = st.cards, p = st.prob.chat;
    const groupIds = new Set(c.groups.map((g) => g.id));
    const buckets = [];
    const ungrouped = c.main.filter((x) => !x.group || !groupIds.has(x.group));
    if (ungrouped.length) buckets.push({ cards: ungrouped, w: Number(p.groups.__ungrouped == null ? 20 : p.groups.__ungrouped) });
    c.groups.forEach((g) => {
      const cards = c.main.filter((x) => x.group === g.id);
      if (cards.length) buckets.push({ cards, w: Number(p.groups[g.id] == null ? 40 : p.groups[g.id]) });
    });
    if (!buckets.length) return undefined;
    const chosen = PHONE.weighted(buckets, (b) => b.w) || buckets[0];
    return PHONE.pick(chosen.cards);
  }

  function buildCard(type) {
    const st = S(), c = st.cards;
    if (type === 'main') {
      const card = mainCard();
      if (card) return { kind: 'main', text: fill(card.text) };
    }
    if (type === 'free') {
      const card = PHONE.pick(c.free);
      if (card) return { kind: 'free', text: fill(card.text) };
    }
    if (type === 'kaomoji') { const card = PHONE.pick(c.kaomoji); if (card) return { kind: 'kaomoji', text: card.text }; }
    if (type === 'emoji') { const card = PHONE.pick(c.emoji); if (card) return { kind: 'emoji', text: card.text }; }
    if (type === 'sticker') { const card = PHONE.pick(c.stickers); if (card && card.src) return { kind: 'sticker', src: card.src }; }
    if (type === 'pat') {
      const card = PHONE.pick(c.patTheirs);
      if (card) return { kind: 'pat', text: fill(card.text) };
    }
    if (type === 'voice') {
      const card = PHONE.pick(c.voice);
      if (card) {
        const text = fill(card.text);
        return { kind: 'voice', text, duration: PHONE.clamp(Math.round(text.length / 2.4) + 2, 2, 28) };
      }
    }
    return undefined;
  }

  E.drawOne = function () {
    const types = cardTypes();
    if (!types.length) {
      const card = mainCard() || PHONE.pick(S().cards.kaomoji) || { text: '……' };
      return { kind: 'main', text: fill(card.text) };
    }
    const chosen = PHONE.weighted(types, (t) => t.w) || types[0];
    return buildCard(chosen.key) || buildCard('main') || { kind: 'main', text: '……' };
  };

  E.drawMany = function (n) {
    const out = [];
    const max = PHONE.clamp(Number(n) || 1, 1, 12);
    for (let i = 0; i < max; i++) out.push(E.drawOne());
    return out;
  };

  function cardToMessage(card) {
    const base = { id: PHONE.uid('msg_'), from: 'them', ts: PHONE.now() };
    if (card.kind === 'sticker') return Object.assign(base, { type: 'sticker', src: card.src, text: '' });
    if (card.kind === 'voice') return Object.assign(base, { type: 'voice', text: card.text, duration: card.duration });
    if (card.kind === 'pat') return Object.assign(base, { type: 'pat', text: card.text, from: 'them' });
    return Object.assign(base, { type: 'text', text: card.text, kind: card.kind });
  }

  function notifyNewMessage(msg) {
    const st = S();
    const body = msg.type === 'sticker' ? '[表情]' : msg.type === 'voice' ? '[语音] ' + (msg.text || '') : msg.type === 'pat' ? `${st.profile.contactName} 拍了拍你${msg.text || ''}` : msg.type === 'redpacket' ? `给你发了一个红包 · ¥${Number(msg.amount || 0).toFixed(2)}` : (msg.text || '');
    E.notify({ app: 'chat', title: st.profile.contactName, body, open: () => PHONE.openApp && PHONE.openApp('chat') });
  }

  E.addContactMessage = function (card, opts) {
    const msg = cardToMessage(card);
    const st = S();
    st.chat.messages.push(msg);
    st.chat.lastIncoming = msg.ts;
    const isOpen = PHONE.chat && PHONE.chat.isOpen && PHONE.chat.isOpen();
    if (!isOpen) st.chat.unread = (st.chat.unread || 0) + 1;
    else { st.chat.unread = 0; st.chat.lastReadTs = msg.ts; }
    if (!isOpen && !(opts && opts.silentNotice)) notifyNewMessage(msg);
    PHONE.save();
    PHONE.bus.emit('chat:new', msg);
    return msg;
  };

  E.sendContactCards = function (count, opts) {
    const st = S();
    const n = PHONE.clamp(Number(count) || 1, 1, 12);
    const cards = E.drawMany(n);
    const isOpen = PHONE.chat && PHONE.chat.isOpen && PHONE.chat.isOpen();
    if (isOpen) PHONE.bus.emit('chat:typing', true);
    let i = 0;
    const deliver = () => {
      const card = cards[i];
      if (!card) {
        if (isOpen) PHONE.bus.emit('chat:typing', false);
        return;
      }
      E.addContactMessage(card, { silentNotice: i < cards.length - 1 });
      if (opts && opts.sound && i === 0) PHONE.sound.play('incoming');
      i += 1;
      if (i < cards.length) setTimeout(deliver, PHONE.randInt(260, 620));
      else if (isOpen) setTimeout(() => PHONE.bus.emit('chat:typing', false), 280);
    };
    deliver();
  };

  E.scheduleReply = function (opts) {
    const p = S().prob.chat;
    if (PHONE.chance(Number(p.noReply))) {
      PHONE.bus.emit('chat:read-no-reply');
      return;
    }
    const min = Math.max(1, Number(p.replyMin) || 1);
    const max = Math.max(min, Number(p.replyMax) || min);
    const delay = (opts && opts.delay != null) ? opts.delay : PHONE.randInt(min, max) * 1000;
    const open = PHONE.chat && PHONE.chat.isOpen && PHONE.chat.isOpen();
    if (open) {
      setTimeout(() => PHONE.bus.emit('chat:typing', true), Math.min(600, delay * 0.3));
    }
    setTimeout(() => {
      if (PHONE.chat && PHONE.chat.isOpen && PHONE.chat.isOpen()) PHONE.bus.emit('chat:typing', true);
      const minC = PHONE.clamp(Number(p.minCards) || 1, 1, 12);
      const maxC = PHONE.clamp(Number(p.maxCards) || minC, minC, 12);
      const count = PHONE.randInt(minC, maxC);
      E.sendContactCards(count, { sound: true });
    }, delay);
  };

  E.autoMessage = function () {
    const p = S().prob.chat;
    const n = PHONE.randInt(1, PHONE.clamp(Number(p.maxCards) || 2, 1, 3));
    E.sendContactCards(n, { sound: true });
  };

  /* ---------------- 组合文本（信件 / 朋友圈） ---------------- */
  E.composeText = function (opts) {
    const o = Object.assign({ min: 2, max: 5, punct: true, emoji: 0, kaomoji: 0 }, opts || {});
    const st = S();
    const n = PHONE.randInt(Math.max(1, o.min), Math.max(o.min, o.max));
    const parts = [];
    for (let i = 0; i < n; i++) {
      const c = mainCard() || PHONE.pick(st.cards.main);
      if (c) parts.push(fill(c.text));
    }
    if (PHONE.chance(o.emoji) && st.cards.emoji.length) parts.push(PHONE.pick(st.cards.emoji).text);
    if (PHONE.chance(o.kaomoji) && st.cards.kaomoji.length) parts.push(PHONE.pick(st.cards.kaomoji).text);
    const puncts = (st.prob.mailbox.punctuation || []).slice();
    let out = '';
    parts.forEach((p, i) => {
      out += p;
      if (o.punct && puncts.length) out += (i === parts.length - 1 ? PHONE.pick(['。', '！', '……', '~']) : PHONE.pick(puncts));
      else if (i < parts.length - 1) out += ' ';
    });
    return out;
  };

  E.letterBody = function () {
    const p = S().prob.mailbox;
    const st = S();
    const n = PHONE.randInt(Math.max(1, p.minCards), Math.max(p.minCards, p.maxCards));
    const parts = [];
    for (let i = 0; i < n; i++) {
      const c = mainCard();
      if (c) parts.push(fill(c.text));
    }
    if (PHONE.chance(p.emoji) && st.cards.emoji.length) parts.push(PHONE.pick(st.cards.emoji).text);
    if (PHONE.chance(p.kaomoji) && st.cards.kaomoji.length) parts.push(PHONE.pick(st.cards.kaomoji).text);
    if (PHONE.chance(p.sticker) && st.cards.stickers.length) parts.push('[表情]');
    const puncts = p.punctuation && p.punctuation.length ? p.punctuation : ['。'];
    return parts.map((t, i) => t + (i === parts.length - 1 ? PHONE.pick(['。', '！', '……', '~']) : PHONE.pick(puncts))).join('');
  };

  /* ---------------- 通知 ---------------- */
  function pushNotification(item) {
    const st = S();
    st.notifications.unshift(item);
    st.notifications = st.notifications.slice(0, 30);
    PHONE.save();
    PHONE.bus.emit('notification:new', item);
  }

  E.notify = function (opts) {
    const st = S();
    const app = opts.app || 'chat';
    const title = opts.title || 'Blaise·Zabini';
    const body = opts.body || '';
    const item = { id: PHONE.uid('nt_'), app, title, body, ts: PHONE.now(), read: false };
    pushNotification(item);

    const current = PHONE.currentApp || null;
    const onDesktop = !current;
    const showBanner = (onDesktop && st.settings.desktopPopup) || (!onDesktop && st.settings.backgroundNotify && current !== app);
    if (showBanner) E.showBanner(item, opts.open);
    if (st.settings.backgroundNotify && current !== app) {
      systemNotify(title, body, app);
    }
    if (PHONE.island) PHONE.island.show({ text: title + ' · ' + body, icon: app === 'chat' ? 'chat' : app === 'mailbox' ? 'mailbox' : 'moments' });
    return item;
  };

  E.showBanner = function (item, onClick) {
    const layer = document.getElementById('banner-layer');
    if (!layer) return;
    const appDef = PHONE.apps && PHONE.apps.find((a) => a.id === item.app);
    const el = document.createElement('button');
    el.className = 'notification-banner';
    el.innerHTML = `
      <span class="nb-icon">${PHONE.icon(appDef ? appDef.icon : 'chat', 20)}</span>
      <span class="nb-copy"><b>${PHONE.esc(item.title)}</b><span>${PHONE.esc(item.body)}</span></span>
      <span class="nb-time">${PHONE.fmtClock(item.ts)}</span>`;
    el.addEventListener('click', () => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 260);
      if (onClick) onClick();
    });
    layer.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    while (layer.children.length > 3) layer.firstElementChild.remove();
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 4600);
  };

  function systemNotify(title, body, app) {
    try {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const n = new Notification(title, { body, tag: 'blaise-' + app, silent: false });
      n.onclick = () => { window.focus(); if (PHONE.openApp) PHONE.openApp(app); n.close(); };
    } catch (e) { /* 浏览器不支持时忽略 */ }
  }
  E.systemNotify = systemNotify;
  E.requestNotifyPermission = async function () {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    try { return (await Notification.requestPermission()) === 'granted'; } catch (e) { return false; }
  };

  /* ---------------- 音效 ---------------- */
  let audioCtx = null;
  let keepAliveNodes = null;
  let ringTimer = null;
  function ctx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  }
  function tone(freq, start, dur, type, gain) {
    const c = ctx(); if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, c.currentTime + start);
    g.gain.linearRampToValueAtTime(gain == null ? 0.08 : gain, c.currentTime + start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime + start); o.stop(c.currentTime + start + dur + 0.05);
  }
  const TONES = {
    chime: () => { tone(880, 0, .35, 'sine', .07); tone(1174.7, .12, .5, 'sine', .05); },
    pop: () => { tone(520, 0, .1, 'triangle', .06); tone(300, .05, .12, 'sine', .04); },
    drop: () => { tone(700, 0, .12, 'sine', .05); tone(980, .1, .3, 'sine', .035); },
    bell: () => { tone(1046.5, 0, .6, 'sine', .06); tone(1568, .05, .45, 'sine', .025); },
    none: () => {}
  };
  E.playSound = function (which) {
    const st = S();
    if (!st.settings.sounds.enabled) return;
    const key = which === 'outgoing' ? st.settings.sounds.outgoing : st.settings.sounds.incoming;
    const custom = which === 'outgoing' ? st.settings.sounds.customOutgoing : st.settings.sounds.customIncoming;
    if (custom) {
      try { const a = new Audio(custom); a.volume = .55; a.play().catch(() => {}); return; } catch (e) {}
    }
    (TONES[key] || TONES.chime)();
  };
  E.startRing = function () {
    E.stopRing();
    const step = () => { tone(659, 0, .5, 'sine', .04); tone(880, .25, .5, 'sine', .035); };
    step();
    ringTimer = setInterval(step, 2200);
  };
  E.stopRing = function () { if (ringTimer) { clearInterval(ringTimer); ringTimer = null; } };

  E.setKeepAlive = function (on) {
    try {
      if (on) {
        if (keepAliveNodes) return;
        const c = ctx(); if (!c) return;
        const o = c.createOscillator();
        const g = c.createGain();
        o.frequency.value = 60;
        g.gain.value = 0.00001;
        o.connect(g); g.connect(c.destination);
        o.start();
        keepAliveNodes = { o, g };
      } else if (keepAliveNodes) {
        try { keepAliveNodes.o.stop(); } catch (e) {}
        keepAliveNodes = null;
      }
    } catch (e) { /* 静音保活失败不打扰用户 */ }
  };

  /* ---------------- 后台节拍 ---------------- */
  let tickTimer = null;
  function resetDaily() {
    const st = S();
    const key = PHONE.todayKey();
    if (st.counters.date !== key) { st.counters = { date: key, mail: 0, moments: 0 }; PHONE.save(); }
  }
  E.tick = function () {
    const st = S();
    resetDaily();
    try {
      if (PHONE.mailbox && PHONE.mailbox.tick) PHONE.mailbox.tick();
      if (PHONE.moments && PHONE.moments.tick) PHONE.moments.tick();
    } catch (e) { console.warn(e); }
    const chatOpen = PHONE.chat && PHONE.chat.isOpen && PHONE.chat.isOpen();
    if (!chatOpen && st.settings.backgroundNotify && PHONE.now() - (st.chat.lastIncoming || 0) > 3 * 60000) {
      if (PHONE.chance(10)) E.autoMessage();
    }
    PHONE.save();
  };
  E.startScheduler = function () {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(E.tick, 30000);
    setTimeout(E.tick, 8000);
  };
  E.resetDaily = resetDaily;

  Object.assign(PHONE, { engine: E });
  PHONE.sound = { play: E.playSound, startRing: E.startRing, stopRing: E.stopRing };
  E.sound = PHONE.sound;

  // 首次交互时唤醒音频上下文
  document.addEventListener('pointerdown', function once() {
    ctx();
    document.removeEventListener('pointerdown', once);
  }, { passive: true });
})();
