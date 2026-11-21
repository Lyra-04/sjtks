/* ============================================================
   Blaise Phone · 朋友圈
   ============================================================ */
(function () {
  const S = () => PHONE.state;
  let rootEl = null;

  const nameOf = (by) => by === 'me' ? S().profile.myName : S().profile.contactName;
  const avatarOf = (by) => by === 'me'
    ? PHONE.avatarHTML(S().profile.myAvatar, S().profile.myName, 'post-avatar-img')
    : PHONE.avatarHTML(S().profile.contactAvatar, S().profile.contactName, 'post-avatar-img');

  function commentText() {
    const st = S();
    let t = PHONE.pick(st.cards.main)?.text || '嗯。';
    t = t.replace(/\{name\}/g, st.profile.contactName).replace(/\{me\}/g, st.profile.myName);
    if (PHONE.chance(st.prob.moments.emoji) && st.cards.emoji.length) t += ' ' + PHONE.pick(st.cards.emoji).text;
    if (PHONE.chance(st.prob.moments.kaomoji) && st.cards.kaomoji.length) t += ' ' + PHONE.pick(st.cards.kaomoji).text;
    return t;
  }

  function timeText(ts) { return PHONE.fmtRelative(ts); }

  function postHTML(p) {
    const mine = p.by === 'me';
    const liked = p.likedByMe || p.likedByThem;
    return `<article class="moment-post" data-post="${p.id}">
      <div class="post-head">
        <div class="post-avatar">${avatarOf(p.by)}</div>
        <div class="post-who"><b>${PHONE.esc(nameOf(p.by))}</b><span>${timeText(p.ts)}</span></div>
        <button class="post-more" data-post-more="${p.id}" aria-label="更多">${PHONE.icon('dots', 18)}</button>
      </div>
      ${p.text ? `<div class="post-text">${PHONE.esc(p.text)}</div>` : ''}
      ${p.images && p.images.length ? `<div class="post-images count-${Math.min(3, p.images.length)}">${p.images.map((src) => `<button class="post-img" data-pimg="${src}"><img src="${src}" alt=""></button>`).join('')}</div>` : ''}
      <div class="post-social">
        <button class="post-action ${p.likedByThem && !mine ? 'active' : ''}" data-like="${p.id}">
          <span class="${p.likedByMe ? 'liked' : ''}">${PHONE.icon('heart', 16)}</span>${p.likedByMe ? '已赞' : '赞'}
        </button>
        <button class="post-action" data-comment="${p.id}">${PHONE.icon('comment', 16)} 评论</button>
        <span class="post-time">${timeText(p.ts)}</span>
      </div>
      ${(p.likedByMe || p.likedByThem || (p.comments && p.comments.length)) ? `
        <div class="post-interactions">
          ${liked ? `<div class="post-likes">${PHONE.icon('heart', 13)} ${p.likedByMe ? '<b>我</b>' : ''}${p.likedByMe && p.likedByThem ? '、' : ''}${p.likedByThem ? '<b>' + PHONE.esc(S().profile.contactName) + '</b>' : ''} 觉得很赞</div>` : ''}
          ${p.comments && p.comments.length ? `<div class="post-comments">${p.comments.map((c) => `<div class="post-comment"><b>${PHONE.esc(nameOf(c.by))}</b>：${PHONE.esc(c.text)}</div>`).join('')}</div>` : ''}
        </div>` : ''}
    </article>`;
  }

  function feedHTML() {
    const posts = (S().moments.posts || []).slice().sort((a, b) => b.ts - a.ts);
    if (!posts.length) return `<div class="moments-empty">${PHONE.icon('moments', 34)}<b>还没有朋友圈</b><p>记录一个普通的瞬间吧。</p></div>`;
    return posts.map(postHTML).join('');
  }

  function renderFeed() {
    if (!rootEl) return;
    const feed = rootEl.querySelector('[data-moments-feed]');
    if (feed) feed.innerHTML = feedHTML();
  }

  function render(root) {
    rootEl = root;
    root.classList.add('moments-app');
    root.innerHTML = `
      <header class="app-top">
        <button class="icon-btn" data-act="back">${PHONE.icon('back', 22)}</button>
        <div class="app-top-title"><h1>朋友圈</h1><span>Moments</span></div>
        <button class="icon-btn" data-act="compose">${PHONE.icon('camera', 22)}</button>
      </header>
      <div class="moments-scroll">
        <div class="moments-cover" id="moments-cover">
          <div class="cover-media" data-cover-media></div>
          <div class="cover-shade"></div>
          <button class="cover-edit" data-cover-edit title="更换封面">${PHONE.icon('camera', 15)}</button>
          <div class="moments-profile">
            <button class="moments-avatar" data-avatar-edit>${PHONE.avatarHTML(S().profile.myAvatar, S().profile.myName)}</button>
            <div class="moments-me"><b>${PHONE.esc(S().profile.myName)}</b><span>${PHONE.esc(S().profile.signature || '')}</span></div>
          </div>
        </div>
        <div class="moments-feed" data-moments-feed>${feedHTML()}</div>
        <div class="moments-foot">— 生活是一些很小很小的瞬间 —</div>
      </div>`;
    applyCover();
    bind();
  }

  function applyCover() {
    const media = rootEl.querySelector('[data-cover-media]');
    if (!media) return;
    const cover = S().profile.cover;
    if (cover) media.style.backgroundImage = `url("${cover}")`;
    else media.style.backgroundImage = 'linear-gradient(135deg,#d9c7d6 0%,#b7a8bd 42%,#6f6478 100%)';
  }

  function bind() {
    rootEl.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'back') { PHONE.closeApp(); return; }
      if (act === 'compose') { compose(); return; }
      if (e.target.closest('[data-cover-edit]')) { pickCover(); return; }
      if (e.target.closest('[data-avatar-edit]')) { pickAvatar(); return; }
      const like = e.target.closest('[data-like]')?.dataset.like;
      if (like) {
        const p = S().moments.posts.find((x) => x.id === like);
        if (!p) return;
        p.likedByMe = !p.likedByMe;
        PHONE.save(); renderFeed();
        PHONE.sound.play('outgoing');
        return;
      }
      const cid = e.target.closest('[data-comment]')?.dataset.comment;
      if (cid) { commentSheet(cid); return; }
      const pimg = e.target.closest('[data-pimg]')?.dataset.pimg;
      if (pimg) { viewImage(pimg); return; }
      const more = e.target.closest('[data-post-more]')?.dataset.postMore;
      if (more) {
        const p = S().moments.posts.find((x) => x.id === more);
        if (p && p.by === 'me') {
          PHONE.confirm('删除这条朋友圈', '删除后不可恢复。', { danger: true }).then((ok) => {
            if (!ok) return;
            S().moments.posts = S().moments.posts.filter((x) => x.id !== p.id);
            PHONE.save(); renderFeed();
          });
        } else PHONE.toast('这是对方的朋友圈');
        return;
      }
    });
  }

  function pickCover() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => {
      try { S().profile.cover = await PHONE.compressImage(inp.files[0], { max: 1500, quality: 0.8 }); PHONE.save(); applyCover(); }
      catch (e) { PHONE.toast(e.message); }
    };
    inp.click();
  }
  function pickAvatar() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => {
      try {
        S().profile.myAvatar = await PHONE.compressImage(inp.files[0], { max: 400, quality: 0.85 });
        PHONE.save();
        rootEl.querySelector('[data-avatar-edit]').innerHTML = PHONE.avatarHTML(S().profile.myAvatar, S().profile.myName);
        renderFeed();
        if (PHONE.renderDesktop) PHONE.renderDesktop();
      } catch (e) { PHONE.toast(e.message); }
    };
    inp.click();
  }

  function compose() {
    const host = document.createElement('div');
    host.innerHTML = `
      <div class="compose-post">
        <textarea rows="5" data-post-text placeholder="这一刻的想法…"></textarea>
        <div class="post-image-preview" data-post-preview></div>
        <div class="compose-tools">
          <button class="btn soft" data-add-img>${PHONE.icon('image', 15)} 添加图片</button>
          <span class="compose-count"><b data-pcount>0</b>/500</span>
        </div>
      </div>`;
    const sheet = PHONE.sheet({
      title: '发表朋友圈', subtitle: '记录此刻', content: host,
      footer: `<button class="btn ghost" data-x>取消</button><button class="btn primary" data-send>发表</button>`
    });
    let images = [];
    const ta = host.querySelector('[data-post-text]');
    const preview = host.querySelector('[data-post-preview]');
    const count = host.querySelector('[data-pcount]');
    const drawPreview = () => {
      preview.innerHTML = images.map((src, i) => `<span class="compose-thumb"><img src="${src}"><button data-rm-img="${i}">${PHONE.icon('close', 12)}</button></span>`).join('');
    };
    ta.addEventListener('input', () => { count.textContent = ta.value.length; });
    host.querySelector('[data-add-img]').onclick = () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
      inp.onchange = async () => {
        for (const f of Array.from(inp.files).slice(0, 9 - images.length)) {
          try { images.push(await PHONE.compressImage(f, { max: 1100, quality: 0.8 })); } catch (e) {}
        }
        drawPreview();
      };
      inp.click();
    };
    preview.addEventListener('click', (e) => {
      const rm = e.target.closest('[data-rm-img]');
      if (!rm) return;
      images.splice(Number(rm.dataset.rmImg), 1); drawPreview();
    });
    sheet.footerEl.querySelector('[data-x]').onclick = sheet.close;
    sheet.footerEl.querySelector('[data-send]').onclick = () => {
      const text = ta.value.trim();
      if (!text && !images.length) { PHONE.toast('写点什么，或者选一张图片'); return; }
      const st = S(), p = st.prob.moments;
      const post = {
        id: PHONE.uid('post_'), by: 'me', ts: PHONE.now(), text, images: images.slice(),
        likedByMe: false, likedByThem: false, comments: []
      };
      if (PHONE.chance(p.likeChance)) post.dueLike = PHONE.now() + PHONE.randInt(Math.max(1, p.commentMin), Math.max(p.commentMin, p.commentMax)) * 60000;
      if (PHONE.chance(p.commentChance)) post.dueComment = PHONE.now() + PHONE.randInt(Math.max(1, p.commentMin), Math.max(p.commentMin, p.commentMax)) * 60000;
      st.moments.posts.push(post);
      PHONE.save(); sheet.close(); renderFeed();
      rootEl.querySelector('.moments-scroll')?.scrollTo({ top: 200, behavior: 'smooth' });
      PHONE.toast('已发表');
    };
  }

  function commentSheet(postId) {
    const p = S().moments.posts.find((x) => x.id === postId);
    if (!p) return;
    const host = document.createElement('div');
    const draw = () => {
      host.innerHTML = `<div class="comment-sheet">
        <div class="comment-target">${PHONE.esc(p.text || '[图片]')}</div>
        <div class="comment-list" data-comment-list>${(p.comments || []).length ? p.comments.map((c) => `<div class="comment-line"><b>${PHONE.esc(nameOf(c.by))}</b><span>${PHONE.esc(c.text)}</span></div>`).join('') : '<p class="comment-empty">还没有评论。</p>'}</div>
        <div class="comment-input"><input data-comment-input placeholder="说点什么…" maxlength="160"><button class="btn primary" data-comment-send>发送</button></div>
      </div>`;
      host.querySelector('[data-comment-send]').onclick = submit;
      host.querySelector('[data-comment-input]').addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    };
    const submit = () => {
      const inp = host.querySelector('[data-comment-input]');
      const text = inp.value.trim();
      if (!text) return;
      p.comments = p.comments || [];
      const c = { id: PHONE.uid('cmt_'), by: 'me', text, ts: PHONE.now() };
      p.comments.push(c);
      PHONE.save(); inp.value = ''; draw(); renderFeed();
      PHONE.sound.play('outgoing');
      if (PHONE.chance(S().prob.moments.replyChance)) {
        const delay = PHONE.randInt(1500, 4200);
        setTimeout(() => {
          p.comments.push({ id: PHONE.uid('cmt_'), by: 'them', text: commentText(), ts: PHONE.now() });
          PHONE.save();
          if (PHONE.currentApp === 'moments') { draw(); renderFeed(); }
          PHONE.engine.notify({ app: 'moments', title: S().profile.contactName, body: '回复了你的评论：' + commentText(), open: () => PHONE.openApp('moments') });
        }, delay);
      }
    };
    draw();
    PHONE.sheet({ title: '评论', content: host });
  }

  function viewImage(src) {
    const l = document.getElementById('overlay-layer');
    const ov = document.createElement('div');
    ov.className = 'image-viewer';
    ov.innerHTML = `<button class="image-viewer-close">${PHONE.icon('close', 22)}</button><img src="${src}" alt="">`;
    l.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('show'));
    const close = () => { ov.classList.remove('show'); setTimeout(() => ov.remove(), 250); };
    ov.onclick = close; ov.querySelector('img').onclick = (e) => e.stopPropagation();
  }

  function makeAutoPost() {
    const st = S();
    const p = st.prob.moments;
    const text = PHONE.engine.composeText({ min: Math.max(1, p.cardMin), max: Math.max(p.cardMin, p.cardMax), emoji: p.emoji, kaomoji: p.kaomoji });
    const post = { id: PHONE.uid('post_'), by: 'them', ts: PHONE.now(), text, images: [], likedByMe: false, likedByThem: false, comments: [] };
    if (PHONE.chance(p.sticker) && st.cards.stickers.length) post.images.push(PHONE.pick(st.cards.stickers).src);
    st.moments.posts.push(post);
    st.moments.lastAuto = PHONE.now();
    st.counters.moments = (st.counters.moments || 0) + 1;
    PHONE.save();
    if (PHONE.currentApp === 'moments' && rootEl) renderFeed();
    PHONE.engine.notify({ app: 'moments', title: st.profile.contactName, body: '发了一条朋友圈：' + text.slice(0, 28), open: () => PHONE.openApp('moments') });
    return post;
  }

  const Moments = {};
  Moments.tick = function () {
    const st = S(), p = st.prob.moments, now = PHONE.now();
    let changed = false;
    (st.moments.posts || []).forEach((post) => {
      if (post.by !== 'me') return;
      if (post.dueLike && post.dueLike <= now) {
        post.dueLike = null; post.likedByThem = true; changed = true;
        PHONE.engine.notify({ app: 'moments', title: st.profile.contactName, body: '赞了你的朋友圈', open: () => PHONE.openApp('moments') });
      }
      if (post.dueComment && post.dueComment <= now) {
        post.dueComment = null;
        post.comments = post.comments || [];
        post.comments.push({ id: PHONE.uid('cmt_'), by: 'them', text: commentText(), ts: now });
        changed = true;
        PHONE.engine.notify({ app: 'moments', title: st.profile.contactName, body: '评论了你的朋友圈', open: () => PHONE.openApp('moments') });
      }
    });
    const today = st.counters.date === PHONE.todayKey() ? (st.counters.moments || 0) : 0;
    if (now - (st.moments.lastAuto || 0) > 90 * 60000 && today < Number(p.maxPostsPerDay) && PHONE.chance(Number(p.postChance))) {
      makeAutoPost(); changed = true;
    }
    if (changed) {
      PHONE.save();
      if (PHONE.currentApp === 'moments' && rootEl) renderFeed();
    }
  };
  Moments.openCompose = compose;

  PHONE.registerApp({
    id: 'moments', name: '朋友圈', icon: 'moments', color: '#a7c9b5',
    render
  });
  PHONE.bus.on('moments:change', () => { if (PHONE.currentApp === 'moments') renderFeed(); });
  PHONE.moments = Moments;
})();
