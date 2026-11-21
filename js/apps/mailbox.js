/* ============================================================
   Blaise Phone · 信箱
   ============================================================ */
(function () {
  const S = () => PHONE.state;
  let rootEl = null, tab = 'in', detailId = null, detailReply = null;
  let timer = null;

  const letterById = (id) => S().mailbox.letters.find((l) => l.id === id);
  const monthGroups = (dir) => {
    const list = S().mailbox.letters.filter((l) => l.dir === dir).sort((a, b) => b.ts - a.ts);
    const groups = [];
    list.forEach((l) => {
      const label = PHONE.monthLabel(l.ts);
      let g = groups.find((x) => x.label === label);
      if (!g) { g = { label, letters: [] }; groups.push(g); }
      g.letters.push(l);
    });
    return groups;
  };
  const unreadCount = () => S().mailbox.letters.filter((l) => l.dir === 'in' && !l.read).length;

  function letterTitle(l) {
    const first = (l.text || '').split('\n').filter(Boolean)[0] || '一封信';
    return first.length > 18 ? first.slice(0, 18) + '…' : first;
  }
  function excerpt(l) {
    return (l.text || '').replace(/\n/g, ' ').slice(0, 70);
  }

  function listHTML() {
    const groups = monthGroups(tab);
    const unread = unreadCount();
    if (!groups.length) {
      return `<div class="mail-empty"><div class="mail-empty-ico">${PHONE.icon(tab === 'in' ? 'mailbox' : 'envelopeOpen', 34)}</div>
        <b>${tab === 'in' ? '还没有收到信' : '还没有寄出信'}</b>
        <p>${tab === 'in' ? '对方会按照概率，在某个普通的时刻寄来一封信。' : '写一封慢慢抵达的信，给 ' + PHONE.esc(S().profile.contactName) + '。'}</p>
        <button class="btn primary" data-mail="compose">${PHONE.icon('pen', 15)} 写一封信</button></div>`;
    }
    return `<div class="mail-summary"><span>${tab === 'in' ? '收到的信' : '寄出的信'}</span><span>${unread && tab === 'in' ? unread + ' 封未读 · ' : ''}共 ${S().mailbox.letters.filter((l) => l.dir === tab).length} 封</span></div>` +
      groups.map((g) => `
        <div class="mail-month"><span>${g.label}</span><i></i><em>${g.letters.length} 封</em></div>
        ${g.letters.map((l) => `
          <button class="mail-item ${l.dir === 'in' && !l.read ? 'unread' : ''}" data-letter="${l.id}">
            <span class="mail-stamp">${PHONE.icon(l.dir === 'in' ? 'mailbox' : 'send', 18)}</span>
            <span class="mail-item-body">
              <span class="mail-item-top"><b>${l.dir === 'in' ? '来自 ' + PHONE.esc(S().profile.contactName) : '寄给 ' + PHONE.esc(S().profile.contactName)}</b><em>${PHONE.fmtTime(l.ts)}</em></span>
              <span class="mail-item-ex">${PHONE.esc(excerpt(l))}</span>
              <span class="mail-item-foot">${l.dir === 'in' ? (l.read ? '已读' : '未读') : (l.replies && l.replies.length ? '已收到回信' : '等待回信')}${l.dir === 'out' && l.replyDue && !l.replies.length ? ' · 在路上' : ''}</span>
            </span>
            ${l.dir === 'in' && !l.read ? '<i class="mail-unread-dot"></i>' : ''}
          </button>`).join('')}
      `).join('');
  }

  function detailHTML(l) {
    const isIn = l.dir === 'in';
    const replies = l.replies || [];
    return `<div class="letter-view">
      <button class="link-back" data-mail="list">${PHONE.icon('back', 16)} 返回${isIn ? '收件箱' : '寄件箱'}</button>
      <div class="letter-paper ${isIn ? 'incoming' : 'outgoing'}">
        <div class="letter-head">
          <span class="letter-seal">${PHONE.icon(isIn ? 'mailbox' : 'send', 17)}</span>
          <div><b>${isIn ? '来自 ' + PHONE.esc(S().profile.contactName) + ' 的信' : '寄给 ' + PHONE.esc(S().profile.contactName) + ' 的信'}</b><em>${PHONE.fmtDateTime(l.ts)}</em></div>
        </div>
        <div class="letter-title">${PHONE.esc(letterTitle(l))}</div>
        <div class="letter-text">${PHONE.esc(l.text).replace(/\n/g, '<br>')}</div>
        <div class="letter-signature">${isIn ? PHONE.esc(S().profile.contactName) : PHONE.esc(S().profile.myName)}</div>
      </div>
      ${!isIn ? `
        <div class="letter-reply-block">
          <div class="letter-reply-head"><span>回信</span><i></i><em>${replies.length ? replies.length + ' 封' : '还没有回信'}</em></div>
          ${replies.length ? replies.map((r) => `
            <button class="reply-card" data-reply="${r.id}">
              <span class="reply-ico">${PHONE.icon('cornerDown', 17)}</span>
              <span><b>${PHONE.fmtDateTime(r.ts)}</b><em>${PHONE.esc((r.text || '').replace(/\n/g, ' ').slice(0, 58))}…</em></span>
              ${PHONE.icon('forward', 15)}
            </button>`).join('') : `<p class="mail-empty-line">${l.replyDue ? '对方还在写，预计 ' + PHONE.fmtTime(l.replyDue) + ' 前抵达。' : '这封信还没有回音。'}</p>`}
        </div>` : `
        <div class="letter-actions">
          <button class="btn soft" data-mail="reply">${PHONE.icon('pen', 15)} 写回信</button>
        </div>`}
    </div>`;
  }

  function renderBody() {
    if (!rootEl) return;
    const body = rootEl.querySelector('[data-mail-body]');
    const head = rootEl.querySelector('[data-mail-title]');
    const tabs = rootEl.querySelector('.mail-tabs');
    if (detailId) {
      const l = letterById(detailId);
      if (!l) { detailId = null; return renderBody(); }
      if (tabs) tabs.style.display = 'none';
      if (head) head.textContent = l.dir === 'in' ? '收信' : '寄信';
      body.innerHTML = detailHTML(l);
    } else {
      if (tabs) tabs.style.display = '';
      if (head) head.textContent = '信箱';
      rootEl.querySelectorAll('[data-mtab]').forEach((b) => b.classList.toggle('active', b.dataset.mtab === tab));
      body.innerHTML = listHTML();
    }
  }

  function openDetail(id) {
    const l = letterById(id);
    if (!l) return;
    detailId = id;
    if (l.dir === 'in' && !l.read) {
      l.read = true;
      S().mailbox.unread = Math.max(0, (S().mailbox.unread || 1) - 1);
      PHONE.save();
      PHONE.bus.emit('mail:change');
      if (PHONE.updateBadges) PHONE.updateBadges();
    }
    renderBody();
    rootEl.querySelector('.mail-body')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function replyHTML(r) {
    return `<div class="letter-paper incoming mini">
      <div class="letter-head"><span class="letter-seal">${PHONE.icon('cornerDown', 17)}</span>
        <div><b>${PHONE.esc(S().profile.contactName)} 的回信</b><em>${PHONE.fmtDateTime(r.ts)}</em></div></div>
      <div class="letter-text">${PHONE.esc(r.text).replace(/\n/g, '<br>')}</div>
      <div class="letter-signature">${PHONE.esc(S().profile.contactName)}</div></div>`;
  }

  function compose(replyTo) {
    const host = document.createElement('div');
    const to = S().profile.contactName;
    host.innerHTML = `
      <div class="compose-letter">
        <div class="compose-to"><span>致</span><b>${PHONE.esc(to)}</b><em>${PHONE.fmtDateTime(PHONE.now())}</em></div>
        <textarea rows="9" data-letter-text placeholder="写点什么吧。也可以让字卡替你写一封慢信。"></textarea>
        <div class="btn-row">
          <button class="btn soft" data-gen>${PHONE.icon('sparkle', 15)} 用字卡写一封</button>
          <span class="compose-count"><b data-count>0</b> 字</span>
        </div>
      </div>`;
    const sheet = PHONE.sheet({
      title: replyTo ? '写回信' : '写一封信', subtitle: '信件会保存在寄出的信中', content: host,
      footer: `<button class="btn ghost" data-x>取消</button><button class="btn primary" data-send>寄出</button>`
    });
    const ta = host.querySelector('[data-letter-text]');
    const count = host.querySelector('[data-count]');
    const upd = () => { count.textContent = ta.value.replace(/\s/g, '').length; };
    ta.addEventListener('input', upd);
    if (replyTo) ta.value = `致 ${to}：\n\n`;
    upd();
    host.querySelector('[data-gen]').onclick = () => {
      const body = PHONE.engine.letterBody();
      ta.value = `致 ${to}：\n${body}\n—— ${S().profile.myName}`;
      upd();
    };
    sheet.footerEl.querySelector('[data-x]').onclick = sheet.close;
    sheet.footerEl.querySelector('[data-send]').onclick = () => {
      let text = ta.value.trim();
      if (!text) {
        text = `致 ${to}：\n${PHONE.engine.letterBody()}\n—— ${S().profile.myName}`;
      }
      const p = S().prob.mailbox;
      const min = Math.max(0, Number(p.replyMin) || 0);
      const max = Math.max(min, Number(p.replyMax) || min);
      const letter = {
        id: PHONE.uid('letter_'), dir: 'out', ts: PHONE.now(), read: true, text,
        replies: [], replyDue: PHONE.now() + PHONE.randInt(min, max) * 60000
      };
      S().mailbox.letters.push(letter);
      PHONE.save(); sheet.close(); detailId = letter.id; renderBody();
      PHONE.toast('信已寄出，对方会在 ' + min + '–' + max + ' 分钟内回信');
      PHONE.bus.emit('mail:change');
    };
  }

  function makeIncoming() {
    const p = S().prob.mailbox;
    const st = S();
    const body = PHONE.engine.letterBody();
    const text = `致 ${st.profile.myName}：\n${body}\n—— ${st.profile.contactName}`;
    const letter = { id: PHONE.uid('letter_'), dir: 'in', ts: PHONE.now(), read: false, text };
    st.mailbox.letters.push(letter);
    st.mailbox.unread = (st.mailbox.unread || 0) + 1;
    st.mailbox.lastAuto = PHONE.now();
    st.counters.mail = (st.counters.mail || 0) + 1;
    PHONE.save();
    PHONE.bus.emit('mail:change');
    if (PHONE.updateBadges) PHONE.updateBadges();
    PHONE.engine.notify({ app: 'mailbox', title: st.profile.contactName + ' 寄来一封信', body: letterTitle(letter), open: () => PHONE.openApp('mailbox') });
    return letter;
  }

  function makeReply(letter) {
    const st = S();
    const text = `致 ${st.profile.myName}：\n${PHONE.engine.letterBody()}\n—— ${st.profile.contactName}`;
    const reply = { id: PHONE.uid('reply_'), ts: PHONE.now(), text };
    letter.replies = letter.replies || [];
    letter.replies.push(reply);
    letter.replyDue = null;
    st.mailbox.unread = (st.mailbox.unread || 0) + 1;
    PHONE.save();
    PHONE.bus.emit('mail:change');
    if (PHONE.updateBadges) PHONE.updateBadges();
    PHONE.engine.notify({ app: 'mailbox', title: '收到 ' + st.profile.contactName + ' 的回信', body: '你寄出的信，有回音了。', open: () => PHONE.openApp('mailbox') });
    return reply;
  }

  const Mail = {};

  Mail.tick = function () {
    const st = S(), p = st.prob.mailbox;
    const now = PHONE.now();
    let changed = false;
    // 到期回信
    (st.mailbox.letters || []).forEach((l) => {
      if (l.dir === 'out' && l.replyDue && l.replyDue <= now) {
        makeReply(l); changed = true;
      }
    });
    // 主动来信
    const gap = PHONE.randInt(Math.max(1, p.gapMin), Math.max(p.gapMin, p.gapMax)) * 60000;
    const today = st.counters.date === PHONE.todayKey() ? (st.counters.mail || 0) : 0;
    if (now - (st.mailbox.lastAuto || 0) > gap && today < Number(p.maxPerDay) && PHONE.chance(Number(p.writeChance))) {
      makeIncoming(); changed = true;
    }
    if (changed) PHONE.save();
  };

  Mail.openCompose = () => compose(null);

  PHONE.registerApp({
    id: 'mailbox', name: '信箱', icon: 'mailbox', color: '#e8b79a',
    render(root) {
      rootEl = root;
      detailId = null;
      root.classList.add('mail-app');
      root.innerHTML = `
        <header class="app-top">
          <button class="icon-btn" data-mail="back-app">${PHONE.icon('back', 22)}</button>
          <div class="app-top-title"><h1 data-mail-title>信箱</h1><span>Letters, slowly.</span></div>
          <button class="icon-btn" data-mail="compose">${PHONE.icon('pen', 21)}</button>
        </header>
        <div class="mail-tabs">
          <button data-mtab="in" class="${tab === 'in' ? 'active' : ''}">收到的信 <b>${unreadCount()}</b></button>
          <button data-mtab="out" class="${tab === 'out' ? 'active' : ''}">寄出的信</button>
        </div>
        <div class="mail-body" data-mail-body></div>`;
      renderBody();
      root.querySelector('.mail-body').addEventListener('click', (e) => {
        const back = e.target.closest('[data-mail="back-app"]');
        if (back) { PHONE.closeApp(); return; }
        const comp = e.target.closest('[data-mail="compose"]');
        if (comp) { compose(null); return; }
        const mt = e.target.closest('[data-mtab]');
        if (mt) { tab = mt.dataset.mtab; detailId = null; renderBody(); return; }
        const list = e.target.closest('[data-mail="list"]');
        if (list) { detailId = null; renderBody(); return; }
        const item = e.target.closest('[data-letter]');
        if (item) { openDetail(item.dataset.letter); return; }
        const reply = e.target.closest('[data-reply]');
        if (reply) {
          const l = letterById(detailId);
          const r = l && (l.replies || []).find((x) => x.id === reply.dataset.reply);
          if (r) {
            const host = document.createElement('div');
            host.innerHTML = replyHTML(r);
            PHONE.sheet({ title: '回信', content: host });
          }
          return;
        }
        if (e.target.closest('[data-mail="reply"]')) {
          const l = letterById(detailId);
          compose(l);
        }
      });
      if (root._mailTimer) clearInterval(root._mailTimer);
      root._mailTimer = setInterval(() => { if (PHONE.currentApp === 'mailbox') { Mail.tick(); renderBody(); } }, 30000);
    },
    onClose() { detailId = null; }
  });

  // 应用内实时刷新
  PHONE.bus.on('mail:change', () => {
    if (PHONE.currentApp === 'mailbox' && rootEl) {
      const body = rootEl.querySelector('[data-mail-body]');
      if (body) renderBody();
      const count = rootEl.querySelector('[data-mtab="in"] b');
      if (count) count.textContent = unreadCount();
    }
  });
  PHONE.mailbox = Mail;
})();
