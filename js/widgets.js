/* ============================================================
   Blaise Phone · 小组件
   新增组件：注册一个 { id, name, icon, render, tick, editor } 即可
   ============================================================ */
(function () {
  const W = [];
  PHONE.widgets = W;
  PHONE.registerWidget = function (def) { if (def && def.id) W.push(def); };
  PHONE.getWidget = function (id) { return W.find((w) => w.id === id); };

  const st = () => PHONE.state;

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rand01(seed) {
    let t = seed + 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function dayIndex() { return Math.floor(PHONE.now() / 86400000); }

  function avatar(src, name, cls) {
    if (src) return `<span class="avatar ${cls || ''}" style="background-image:url('${src}')"></span>`;
    const initial = (name || 'B').trim().charAt(0).toUpperCase();
    return `<span class="avatar avatar-letter ${cls || ''}">${PHONE.esc(initial)}</span>`;
  }
  PHONE.avatarHTML = avatar;

  function signalBars(level, small) {
    let out = '<span class="signal-bars' + (small ? ' sm' : '') + '">';
    for (let i = 1; i <= 4; i++) out += `<i class="${i <= level ? 'on' : ''}" style="height:${5 + i * 3}px"></i>`;
    return out + '</span>';
  }
  PHONE.signalBars = signalBars;

  function loveWidget(item) {
    const s = st();
    const name = item.data.name || s.profile.contactName;
    const src = item.data.avatar || s.profile.contactAvatar;
    const days = PHONE.daysTogether(item.data.since || s.profile.togetherSince);
    return `
      <div class="love-card">
        <div class="love-top">
          <div class="love-avatar">${avatar(src, name)}<span class="love-online"></span></div>
          <div class="love-id">
            <div class="love-kicker">MY FAVORITE PERSON</div>
            <div class="love-name">${PHONE.esc(name)}</div>
          </div>
          <span class="love-heart">${PHONE.icon('heart', 18, 1.6)}</span>
        </div>
        <div class="love-days">
          <span class="love-pre">与 ${PHONE.esc(name)} 相恋</span>
          <span class="love-num">${String(days).padStart(2, '0')}</span>
          <span class="love-unit">天</span>
        </div>
        <div class="love-foot"><span>${PHONE.icon('sparkle', 12)}</span><span>since ${PHONE.esc(item.data.since || s.profile.togetherSince)}</span><span class="love-line"></span></div>
      </div>`;
  }

  function quoteWidget(item) {
    const s = st();
    const list = s.cards.love;
    const custom = item.data.text || '';
    let text = custom;
    if (!text) {
      if (!list.length) text = '把想说的话，慢慢写给你。';
      else text = list[(dayIndex() + (item.data.offset || 0)) % list.length].text;
    }
    return `
      <div class="quote-card">
        <div class="quote-head"><span class="widget-label">${PHONE.icon('quote', 14)} 今日情话</span>
          <button class="widget-mini" data-act="reroll" title="换一句">${PHONE.icon('refresh', 14)}</button></div>
        <p class="quote-text">${PHONE.esc(text)}</p>
        <div class="quote-foot"><span>NO.${String(((dayIndex() + (item.data.offset || 0)) % 99) + 1).padStart(2, '0')}</span><span>${PHONE.fmtDateCN(PHONE.now())}</span></div>
      </div>`;
  }

  function moodWidget(item) {
    const s = st();
    const list = s.cards.mood;
    let text = item.data.text || '';
    if (!text) text = list.length ? list[(dayIndex() + (item.data.offset || 0)) % list.length].text : '今天的心情，是一阵很轻的风。';
    return `
      <div class="mood-card">
        <div class="mood-head"><span class="widget-label">${PHONE.icon('cloud', 14)} 今日心情</span>
          <button class="widget-mini" data-act="reroll" title="换一句">${PHONE.icon('refresh', 14)}</button></div>
        <div class="mood-body"><span class="mood-orb"></span><p>${PHONE.esc(text)}</p></div>
        <div class="quote-foot"><span>MOOD OF THE DAY</span><span>${PHONE.weekdayCN(PHONE.now())}</span></div>
      </div>`;
  }

  function linkState(item) {
    const p = st().prob.other;
    const bucket = Math.floor(PHONE.now() / 60000);
    const r1 = rand01(hash(item.id + '|link|' + bucket));
    const active = r1 * 100 < Number(p.linkChance);
    const level = active ? (1 + Math.floor(rand01(hash(item.id + '|lvl|' + bucket)) * 4)) : 0;
    const day = Math.floor(PHONE.now() / 86400000);
    const r2 = rand01(hash(item.id + '|time|' + day));
    const hasPartner = r2 * 100 < Number(p.partnerTimeChance);
    const offset = hasPartner ? Math.round((rand01(hash(item.id + '|off|' + day)) * 16 - 8) * 2) / 2 : null;
    return { active, level, hasPartner, offset };
  }
  const LINK_LABEL = ['未连接', '仅一格', '信号微弱', '连接良好', '连接稳定'];

  function linkWidget(item) {
    const s = st();
    const ls = linkState(item);
    const partnerTime = ls.hasPartner ? new Date(PHONE.now() + ls.offset * 3600000) : null;
    return `
      <div class="link-card ${ls.active ? '' : 'is-off'}">
        <div class="link-head"><span class="widget-label">${PHONE.icon('link', 14)} 链接状态</span>
          <span class="link-pill ${ls.active ? 'on' : ''}"><i></i>${ls.active ? '已连接' : '离线'}</span></div>
        <div class="link-cols">
          <div class="link-col">
            <div class="link-who">我 <span>${PHONE.esc(s.profile.myName)}</span></div>
            ${signalBars(ls.level)}
            <div class="link-time">${PHONE.fmtClock(PHONE.now())}</div>
            <div class="link-state">${LINK_LABEL[ls.level]}</div>
          </div>
          <div class="link-mid"><span class="link-spark">${PHONE.icon('heart', 14)}</span><i></i></div>
          <div class="link-col right">
            <div class="link-who">对方 <span>${PHONE.esc(s.profile.contactName)}</span></div>
            ${ls.hasPartner ? signalBars(ls.level) : '<span class="signal-bars sm off-bars"><i></i><i></i><i></i><i></i></span>'}
            <div class="link-time">${partnerTime ? PHONE.fmtClock(partnerTime.getTime()) : '--:--'}</div>
            <div class="link-state">${ls.hasPartner ? '对方时间' : '未同步'}</div>
          </div>
        </div>
        <div class="quote-foot"><span>NETWORK TIME · 联网校准</span><span>${ls.active ? 'LINK ' + ls.level + '/4' : 'NO SIGNAL'}</span></div>
      </div>`;
  }

  function clockWidget(item) {
    const now = new Date(PHONE.now());
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `
      <div class="clock-card">
        <div class="clock-left">
          <div class="widget-label">${PHONE.icon('sun', 14)} 此刻</div>
          <div class="clock-time"><span data-clock-h>${hh}</span><i>:</i><span data-clock-m>${mm}</span></div>
          <div class="clock-date">${PHONE.fmtDateCN(PHONE.now())} · ${PHONE.weekdayCN(PHONE.now())}</div>
        </div>
        <div class="clock-orb"><span></span></div>
      </div>`;
  }

  function tickLive(host) {
    const clock = host.querySelector('[data-widget="clock"]');
    if (clock) {
      const now = new Date(PHONE.now());
      const h = clock.querySelector('[data-clock-h]'), m = clock.querySelector('[data-clock-m]');
      if (h) h.textContent = String(now.getHours()).padStart(2, '0');
      if (m) m.textContent = String(now.getMinutes()).padStart(2, '0');
    }
    const link = host.querySelector('[data-widget="link"]');
    if (link) {
      const item = { id: link.closest('.desk-item') ? link.closest('.desk-item').dataset.id : 'i_link' };
      const s = st();
      const ls = linkState(item);
      const times = link.querySelectorAll('.link-time');
      if (times[0]) times[0].textContent = PHONE.fmtClock(PHONE.now());
      if (times[1]) times[1].textContent = ls.hasPartner ? PHONE.fmtClock(PHONE.now() + ls.offset * 3600000) : '--:--';
      const bars = link.querySelectorAll('.signal-bars');
      bars.forEach((b) => { Array.from(b.children).forEach((el, i) => el.classList.toggle('on', ls.active && i < ls.level)); });
      const pill = link.querySelector('.link-pill');
      if (pill) { pill.classList.toggle('on', ls.active); pill.innerHTML = `<i></i>${ls.active ? '已连接' : '离线'}`; }
      link.classList.toggle('is-off', !ls.active);
    }
  }

  /* ---------------- 编辑器 ---------------- */
  function openEditor(item, widget) {
    const s = st();
    const host = document.createElement('div');
    host.className = 'widget-editor';
    let body = '';
    if (widget.id === 'love') {
      const name = item.data.name || s.profile.contactName;
      body = `
        <div class="editor-avatar-row">
          <button class="editor-avatar" data-act="avatar">${avatar(item.data.avatar || s.profile.contactAvatar, name)}<span>${PHONE.icon('camera', 15)}</span></button>
          <div><b>头像与名字</b><small>会同步保存为联系人资料</small></div>
        </div>
        <label class="field"><span>显示的名字</span><input id="we-name" value="${PHONE.esc(name)}" maxlength="18"></label>
        <label class="field"><span>相恋开始日期</span><input id="we-since" type="date" value="${PHONE.esc(item.data.since || s.profile.togetherSince)}"></label>
        <p class="editor-hint">桌面上的天数会按照手机联网时间每天自动更新。</p>`;
    } else if (widget.id === 'quote' || widget.id === 'mood') {
      const current = item.data.text || (widget.id === 'quote' ? '按日期从情话字卡库抽取' : '按日期从心情字卡库抽取');
      body = `
        <div class="editor-quote">${PHONE.esc(current)}</div>
        <label class="field"><span>固定文字（留空则每天自动抽取）</span><textarea id="we-text" rows="3" placeholder="留空使用字卡库">${PHONE.esc(item.data.text || '')}</textarea></label>
        <button class="btn soft full" data-act="reroll">${PHONE.icon('refresh', 16)} 换一句 / 重新抽取</button>
        <p class="editor-hint">在「设置 → 字卡设置 → 其他功能字卡库」中可以维护情话与心情字卡。</p>`;
    } else if (widget.id === 'link') {
      body = `
        <div class="editor-quote">${linkState(item).active ? '当前已连接' : '当前未连接'} · 信号 ${linkState(item).level || 0}/4</div>
        <p class="editor-hint">链接状态会按照概率随机出现，满格到一格都有可能。可以在「设置 → 字卡设置 → 概率设置 → 其他」中调整出现概率与对方时间概率。</p>
        <button class="btn soft full" data-act="reroll">${PHONE.icon('refresh', 16)} 重新检测</button>`;
    } else {
      body = `<p class="editor-hint">这个小组件会跟随手机系统时间实时走动，不需要额外设置。</p>`;
    }
    host.innerHTML = body;

    const sheet = PHONE.sheet({
      title: widget.name,
      subtitle: '小组件设置',
      content: host,
      footer: `<button class="btn ghost" data-act="remove">${PHONE.icon('trash', 16)} 移除小组件</button><button class="btn primary" data-act="save">完成</button>`
    });

    const refresh = () => { sheet.close(); PHONE.renderDesktop && PHONE.renderDesktop(); };
    host.querySelector('[data-act="avatar"]')?.addEventListener('click', async () => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = async () => {
        const f = input.files[0]; if (!f) return;
        try {
          const src = await PHONE.compressImage(f, { max: 360 });
          s.profile.contactAvatar = src;
          item.data.avatar = src;
          PHONE.save();
          const node = host.querySelector('.editor-avatar');
          if (node) node.innerHTML = avatar(src, item.data.name || s.profile.contactName) + `<span>${PHONE.icon('camera', 15)}</span>`;
          PHONE.renderDesktop && PHONE.renderDesktop();
        } catch (e) { PHONE.toast(e.message); }
      };
      input.click();
    });
    host.querySelector('[data-act="reroll"]')?.addEventListener('click', () => {
      item.data.offset = PHONE.randInt(1, 999);
      item.data.text = '';
      PHONE.save();
      refresh();
      PHONE.toast('已换一句');
    });
    sheet.footerEl.querySelector('[data-act="remove"]').addEventListener('click', () => {
      PHONE.confirm('移除小组件', `确定移除「${widget.name}」吗？`, { danger: true }).then((ok) => {
        if (!ok) return;
        const page = PHONE.state.desktop.pages.find((p) => p.items.some((i) => i.id === item.id));
        if (page) page.items = page.items.filter((i) => i.id !== item.id);
        PHONE.save(); sheet.close(); PHONE.renderDesktop && PHONE.renderDesktop(); PHONE.toast('已移除');
      });
    });
    sheet.footerEl.querySelector('[data-act="save"]').addEventListener('click', () => {
      if (widget.id === 'love') {
        const name = host.querySelector('#we-name').value.trim();
        const since = host.querySelector('#we-since').value;
        if (name) { item.data.name = name; s.profile.contactName = name; }
        if (since) item.data.since = since;
        if (name) s.profile.togetherSince = since || s.profile.togetherSince;
      }
      if (widget.id === 'quote' || widget.id === 'mood') item.data.text = host.querySelector('#we-text').value.trim();
      PHONE.save(); sheet.close(); PHONE.renderDesktop && PHONE.renderDesktop(); PHONE.toast('已保存');
    });
  }

  /* ---------------- 注册 ---------------- */
  PHONE.registerWidget({ id: 'love', name: '相爱计时', icon: 'heart', render: loveWidget, editor: openEditor });
  PHONE.registerWidget({ id: 'quote', name: '今日情话', icon: 'quote', render: quoteWidget, editor: openEditor });
  PHONE.registerWidget({ id: 'mood', name: '今日心情', icon: 'cloud', render: moodWidget, editor: openEditor });
  PHONE.registerWidget({ id: 'link', name: '链接状态', icon: 'link', render: linkWidget, tick: tickLive, editor: openEditor });
  PHONE.registerWidget({ id: 'clock', name: '此刻时光', icon: 'clock', render: clockWidget, tick: tickLive, editor: openEditor });

  PHONE.tickWidgets = function (host) {
    W.forEach((w) => { if (w.tick) { try { w.tick(host); } catch (e) {} } });
  };
})();
