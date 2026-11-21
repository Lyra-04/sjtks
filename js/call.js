/* ============================================================
   Blaise Phone · 语音 / 视频通话模拟
   ============================================================ */
(function () {
  const Call = {};
  let active = null;
  let raf = 0;

  const layer = () => document.getElementById('call-layer');
  const fmt = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

  function addRecord(text) {
    const st = PHONE.state;
    const msg = { id: PHONE.uid('call_'), from: 'system', type: 'call', text, ts: PHONE.now() };
    st.chat.messages.push(msg);
    st.chat.lastIncoming = Math.max(st.chat.lastIncoming || 0, msg.ts);
    PHONE.save();
    PHONE.bus.emit('chat:new', msg);
  }

  function avatarHTML() {
    const st = PHONE.state;
    return PHONE.avatarHTML(st.profile.contactAvatar, st.profile.contactName, 'call-avatar-img');
  }

  function particles(canvas, video) {
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, r.width * dpr);
      canvas.height = Math.max(1, r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const w = () => canvas.width / dpr, h = () => canvas.height / dpr;
    const dots = Array.from({ length: video ? 42 : 30 }, () => ({
      x: Math.random() * w(), y: Math.random() * h(),
      r: 0.8 + Math.random() * 2.6, vx: (Math.random() - .5) * .22, vy: -0.08 - Math.random() * .3,
      a: 0.08 + Math.random() * 0.35, hue: Math.random() > .5 ? 0.62 : 0.08
    }));
    let t = 0;
    function draw() {
      t += 1;
      ctx.clearRect(0, 0, w(), h());
      dots.forEach((d, i) => {
        d.x += d.vx; d.y += d.vy;
        if (d.y < -10) { d.y = h() + 10; d.x = Math.random() * w(); }
        if (d.x < -10) d.x = w() + 10; if (d.x > w() + 10) d.x = -10;
        const glow = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 6);
        glow.addColorStop(0, `hsla(${d.hue}, 60%, 92%, ${d.a})`);
        glow.addColorStop(1, 'hsla(0,0%,100%,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r * 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `hsla(0,0%,100%,${d.a + .1})`;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
      });
      if (active) raf = requestAnimationFrame(draw);
    }
    draw();
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }

  function screenHTML() {
    const st = PHONE.state;
    const isVideo = active.video;
    const bg = isVideo && st.settings.chat.callBackground ? `style="background-image:url('${st.settings.chat.callBackground}')"` : '';
    const status = active.incoming && active.status === 'ringing'
      ? (isVideo ? '邀请你视频通话…' : '邀请你语音通话…')
      : active.status === 'calling' ? '正在呼叫…' : active.status === 'connected' ? (isVideo ? '视频通话中' : '语音通话中') : active.endText || '';
    return `
      <div class="call-screen ${isVideo ? 'is-video' : 'is-audio'} ${active.status}">
        <canvas class="call-canvas"></canvas>
        <div class="call-bg" ${bg}></div>
        <div class="call-shade"></div>
        <div class="call-top">
          <button class="call-round-btn" data-call="min" title="缩小">${PHONE.icon('minimize', 19)}</button>
          <span class="call-top-label">${isVideo ? '视频通话' : '语音通话'}</span>
          <span class="call-top-spacer"></span>
        </div>
        <div class="call-body">
          <div class="call-rings"><i></i><i></i><i></i></div>
          <div class="call-avatar">${avatarHTML()}</div>
          <div class="call-name">${PHONE.esc(st.profile.contactName)}</div>
          <div class="call-status">${PHONE.esc(status)}</div>
          <div class="call-timer" data-call-timer>${active.status === 'connected' ? '00:00' : ''}</div>
        </div>
        <div class="call-controls">
          ${active.incoming && active.status === 'ringing' ? `
            <div class="call-answer-row">
              <div class="call-action"><button class="call-big decline" data-call="decline">${PHONE.icon('phoneOff', 26)}</button><span>拒绝</span></div>
              <div class="call-action"><button class="call-big accept" data-call="accept">${PHONE.icon(isVideo ? 'video' : 'phone', 26)}</button><span>接听</span></div>
            </div>` : `
            <div class="call-mini-controls">
              <div class="call-action"><button class="call-round-btn ${active.muted ? 'on' : ''}" data-call="mute">${PHONE.icon(active.muted ? 'mute' : 'mic', 20)}</button><span>静音</span></div>
              <div class="call-action"><button class="call-round-btn ${active.speaker ? 'on' : ''}" data-call="speaker">${PHONE.icon('speaker', 20)}</button><span>免提</span></div>
              ${isVideo ? `<div class="call-action"><button class="call-round-btn ${active.camera ? '' : 'on'}" data-call="camera">${PHONE.icon('video', 20)}</button><span>摄像头</span></div>` : ''}
              <div class="call-action"><button class="call-round-btn" data-call="min">${PHONE.icon('minimize', 20)}</button><span>缩小</span></div>
            </div>
            <div class="call-hangup-row"><button class="call-big hangup" data-call="hangup">${PHONE.icon('phoneOff', 26)}</button></div>`}
        </div>
      </div>`;
  }

  function pillHTML() {
    return `<div class="call-pill" data-call-pill>
      <button class="call-pill-main" data-call="restore">
        <span class="call-pill-avatar">${avatarHTML()}</span>
        <span class="call-pill-meta"><b>${PHONE.esc(PHONE.state.profile.contactName)}</b><em data-pill-timer>${fmt(active.seconds || 0)}</em></span>
      </button>
      <button class="call-pill-hangup" data-call="hangup" title="挂断">${PHONE.icon('phoneOff', 19)}</button>
    </div>`;
  }

  function paint() {
    const l = layer();
    if (!l) return;
    l.innerHTML = active.minimized ? pillHTML() : screenHTML();
    l.classList.toggle('active', true);
    if (!active.minimized) {
      const cv = l.querySelector('.call-canvas');
      if (cv) { cancelAnimationFrame(raf); active.cleanupParticles = particles(cv, active.video); }
    }
    bind();
  }

  function bind() {
    const l = layer();
    if (!l) return;
    l.querySelectorAll('[data-call]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = btn.dataset.call;
        if (act === 'accept') accept();
        else if (act === 'decline') decline();
        else if (act === 'hangup') end('hangup');
        else if (act === 'min') minimize();
        else if (act === 'restore') restore();
        else if (act === 'mute') { active.muted = !active.muted; paint(); }
        else if (act === 'speaker') { active.speaker = !active.speaker; paint(); }
        else if (act === 'camera') { active.camera = !active.camera; paint(); }
      });
    });
    const pill = l.querySelector('[data-call-pill]');
    if (pill) {
      let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false, moved = false;
      pill.addEventListener('pointerdown', (e) => {
        if (e.target.closest('[data-call="hangup"]')) return;
        const r = pill.getBoundingClientRect();
        const pr = document.getElementById('phone').getBoundingClientRect();
        ox = r.left - pr.left; oy = r.top - pr.top; sx = e.clientX; sy = e.clientY;
        dragging = true; moved = false;
        pill.setPointerCapture(e.pointerId);
        pill.style.left = ox + 'px'; pill.style.top = oy + 'px'; pill.style.right = 'auto';
      });
      pill.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
        const pr = document.getElementById('phone').getBoundingClientRect();
        const nx = PHONE.clamp(ox + dx, 8, pr.width - pill.offsetWidth - 8);
        const ny = PHONE.clamp(oy + dy, 8, pr.height - pill.offsetHeight - 8);
        pill.style.left = nx + 'px'; pill.style.top = ny + 'px';
      });
      pill.addEventListener('pointerup', (e) => {
        dragging = false;
        if (!moved) restore();
      });
    }
  }

  function tick() {
    if (!active) return;
    if (active.status === 'connected') {
      active.seconds = Math.max(0, Math.floor((PHONE.now() - active.startedAt) / 1000));
      const t = layer().querySelector('[data-call-timer]');
      if (t) t.textContent = fmt(active.seconds);
      const pt = layer().querySelector('[data-pill-timer]');
      if (pt) pt.textContent = fmt(active.seconds);
      if (PHONE.island && !active.minimized) PHONE.island.setCall(fmt(active.seconds));
    }
  }

  function connect() {
    if (!active) return;
    active.status = 'connected';
    active.startedAt = PHONE.now();
    active.seconds = 0;
    active.incoming = false;
    PHONE.sound.stopRing();
    paint();
  }

  function accept() {
    connect();
    PHONE.sound.play('incoming');
  }

  function decline() {
    if (!active) return;
    PHONE.sound.stopRing();
    addRecord(`已拒绝${active.video ? '视频' : '语音'}通话`);
    close();
  }

  function minimize() {
    if (!active) return;
    active.minimized = true;
    if (active.cleanupParticles) { active.cleanupParticles(); active.cleanupParticles = null; }
    paint();
  }
  function restore() {
    if (!active) return;
    active.minimized = false;
    paint();
  }

  function close() {
    if (!active) return;
    if (active.cleanupParticles) { try { active.cleanupParticles(); } catch (e) {} }
    PHONE.sound.stopRing();
    clearInterval(active.timer);
    clearTimeout(active.answerTimer);
    clearTimeout(active.timeoutTimer);
    if (PHONE.island) PHONE.island.clearCall();
    const l = layer();
    l.classList.remove('active');
    l.innerHTML = '';
    active = null;
    cancelAnimationFrame(raf);
  }

  function end(reason) {
    if (!active) return;
    const isConnected = active.status === 'connected';
    const dur = active.seconds || 0;
    if (active.status === 'ringing' && active.incoming) addRecord(`未接${active.video ? '视频' : '语音'}来电`);
    else if (isConnected) addRecord(`${active.video ? '视频' : '语音'}通话 · ${fmt(dur)}`);
    else if (reason === 'hangup') addRecord(`已取消${active.video ? '视频' : '语音'}通话`);
    close();
  }

  Call.start = function (opts) {
    if (active) { PHONE.toast('当前已有通话'); return; }
    const o = Object.assign({ video: false, incoming: false }, opts || {});
    active = {
      video: o.video, incoming: o.incoming, status: o.incoming ? 'ringing' : 'calling',
      muted: false, speaker: false, camera: true, seconds: 0, minimized: false
    };
    paint();
    active.timer = setInterval(tick, 1000);
    if (o.incoming) {
      PHONE.sound.startRing();
      active.timeoutTimer = setTimeout(() => {
        if (active && active.status === 'ringing') {
          addRecord(`未接${o.video ? '视频' : '语音'}来电`);
          close();
          if (PHONE.engine) PHONE.engine.notify({ app: 'chat', title: PHONE.state.profile.contactName, body: `未接${o.video ? '视频' : '语音'}来电`, open: () => PHONE.openApp('chat') });
        }
      }, 30000);
    } else {
      const answer = PHONE.chance(Number(PHONE.state.prob.chat.answer) || 0);
      const delay = PHONE.randInt(2400, 5600);
      active.answerTimer = setTimeout(() => {
        if (!active) return;
        if (answer) connect();
        else {
          active.status = 'ended'; active.endText = '对方已拒绝'; paint();
          setTimeout(() => { if (active) { addRecord(`对方已拒绝${o.video ? '视频' : '语音'}通话`); close(); } }, 1600);
        }
      }, delay);
    }
  };
  Call.isActive = () => !!active;
  Call.minimize = minimize;
  Call.end = end;
  Call.close = close;
  PHONE.Call = Call;
})();
