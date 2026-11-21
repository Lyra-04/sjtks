/* ============================================================
   Blaise Phone · 数据层
   - 所有内容保存在 localStorage，可整包导入/导出
   - 新增字段会自动与默认结构合并，升级不丢数据
   ============================================================ */
(function () {
  const KEY = 'blaise_phone_state_v1';
  const VERSION = 1;

  /* ---------------- 小工具 ---------------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const uid = (prefix) => (prefix || '') + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const chance = (pct) => Math.random() * 100 < Number(pct || 0);
  const pick = (arr) => (arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined);
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const weighted = (entries, weightOf) => {
    const list = entries.filter((e) => weightOf(e) > 0);
    if (!list.length) return undefined;
    let total = 0;
    list.forEach((e) => { total += weightOf(e); });
    let r = Math.random() * total;
    for (const e of list) { r -= weightOf(e); if (r <= 0) return e; }
    return list[list.length - 1];
  };
  const debounce = (fn, wait) => {
    let t;
    return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
  };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const pad = (n) => String(n).padStart(2, '0');
  const fmtClock = (ts) => { const d = ts ? new Date(ts) : new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const fmtTime = (ts) => { const d = new Date(ts); return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const fmtDateCN = (ts) => { const d = new Date(ts); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`; };
  const fmtDateTime = (ts) => { const d = new Date(ts); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const weekdayCN = (ts) => '星期' + '日一二三四五六'[new Date(ts || Date.now()).getDay()];
  const monthLabel = (ts) => { const d = new Date(ts); return `${d.getFullYear()}年${d.getMonth() + 1}月`; };
  const todayKey = (ts) => { const d = new Date(ts || Date.now()); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const fmtRelative = (ts) => {
    const diff = Date.now() - ts;
    if (diff < 45 * 1000) return '刚刚';
    if (diff < 3600 * 1000) return Math.floor(diff / 60000) + ' 分钟前';
    if (diff < 86400 * 1000) return Math.floor(diff / 3600000) + ' 小时前';
    if (diff < 2 * 86400 * 1000) return '昨天 ' + fmtClock(ts);
    if (diff < 7 * 86400 * 1000) return Math.floor(diff / 86400000) + ' 天前';
    return `${new Date(ts).getMonth() + 1}月${new Date(ts).getDate()}日`;
  };
  const daysTogether = (since) => {
    const a = new Date(since + 'T00:00:00');
    if (isNaN(a.getTime())) return 0;
    const b = new Date(); b.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((b - a) / 86400000) + 1);
  };
  const ago = (days, h, m) => {
    const d = new Date(); d.setDate(d.getDate() - (days || 0));
    if (h != null) d.setHours(h); if (m != null) d.setMinutes(m); else d.setMinutes(0);
    d.setSeconds(0, 0); return d.getTime();
  };

  /* ---------------- 默认数据 ---------------- */
  const G = { daily: 'g_daily', sweet: 'g_sweet', night: 'g_night' };
  const MAIN = [
    ['今天有没有好好吃饭？', G.daily], ['刚刚路过一家店，突然很想带你来。', G.daily],
    ['你那边天气怎么样？', G.daily], ['我好像有点想你了。', G.sweet],
    ['在忙吗？不忙的话陪我一会儿。', G.sweet], ['晚安，今天也辛苦了。', G.night],
    ['醒了记得喝水。', G.daily], ['刚刚看到一句话，觉得很像我们。', G.daily],
    ['你今天穿什么颜色的衣服？', G.daily], ['突然想听你的声音。', G.sweet],
    ['别熬夜，我会担心。', G.night], ['我把今天的月亮拍下来了，等下发给你。', G.night],
    ['周末有空吗？想和你去走走。', G.daily], ['你不用一直懂事，在我这里可以任性。', G.sweet],
    ['今天有没有发生什么开心的事？', G.daily], ['如果现在能牵到你的手就好了。', G.sweet],
    ['我一直在。', G.night], ['你刚刚是不是在笑？我猜的。', G.sweet],
    ['想和你分享一件很小的事。', G.daily], ['今天也很喜欢你。', G.sweet],
    ['外面下雨了，记得带伞。', G.daily], ['你回消息好慢，但我还是在等。', G.sweet],
    ['抱一下。', G.sweet], ['有点累了，想靠一会儿。', G.night],
    ['你是我今天最想见的人。', G.sweet], ['别皱眉，不好看。', G.sweet],
    ['我给你留了一盏灯。', G.night], ['慢慢来，我等你。', G.night],
    ['今天的风很温柔，像你。', G.daily], ['想你了，不是一点。', G.sweet],
    ['刚醒，第一个想到的是你。', G.daily], ['今晚的梦可以预订一个你吗？', G.night]
  ];
  const defaultCards = () => ({
    main: MAIN.map(([text, group]) => ({ id: uid('c_'), text, group })),
    kaomoji: ['(｡•́︿•̀｡)', '(๑•́ ₃ •̀๑)', '(˶ᵔ ᵕ ᵔ˶)', '(๑>؂<๑)', '(｡•̀ᴗ-)✧', '(´;ω;｀)', '(*/ω＼*)', '(¬‿¬)', '♡(˃͈ દ ˂͈ ༶ )', '(つ´ω`)つ', '(๑•̀ㅂ•́)و✧', '( ˘ ³˘)♥', '(´▽`ʃ♡ƪ)', '(๑´ㅂ`๑)', '(。-`ω´-)', '(￣▽￣)ノ', '(≧▽≦)', '( • ̀ω•́ )✧', '(´,,•ω•,,)♡', '(｡･ω･｡)ﾉ♡'].map((t) => ({ id: uid('k_'), text: t })),
    emoji: ['😊', '🥰', '😘', '😴', '🌙', '✨', '💫', '❤️', '🫶', '💌', '🌸', '🍰', '☕️', '🌧️', '🕯️', '🎧', '📖', '🐈‍⬛', '😭', '😤', '🙃', '😌', '🤍', '💚', '🖤', '🦋', '🌿', '🍂', '🎐', '🫧'].map((t) => ({ id: uid('e_'), text: t })),
    stickers: [],
    patTheirs: ['的头，说今天也很乖', '的脸，说想我了', '的肩膀，说别太累', '的手，说一起去散步', '的额头，说晚安', '的头发，说很软', '的脸颊，说很喜欢你'].map((t) => ({ id: uid('pt_'), text: t })),
    patMine: ['的头，说我很乖', '的脸，说我也想你了', '的肩膀，说你辛苦了', '的手，说别走开', '的额头，说晚安', '的头发，说今天也很喜欢你'].map((t) => ({ id: uid('pm_'), text: t })),
    voice: ['我今天有点想你。', '早点睡吧。', '你在干嘛呀。', '晚安，做个好梦。', '嗯……也没什么，就是想听听你的声音。', '今天辛苦了，抱抱你。'].map((t) => ({ id: uid('v_'), text: t })),
    free: ['其实我想说的是，{name}，我今天比昨天更喜欢你一点。', '如果{me}现在在你身边，{name}会不会抱我一下？', '今天的{name}，有没有偷偷想我？', '我想和你一起浪费一个没有安排的下午。'].map((t) => ({ id: uid('f_'), text: t })),
    love: ['你是我所有温柔的归宿。', '月亮很好，但我更想见你。', '与你有关的日子，都自带光。', '我把余生写成一封信，收件人只有你。', '世界很吵，你是我安静的那一部分。', '我喜欢你，是那种想和你慢慢变老的喜欢。', '所有的浪漫，都想和你一起浪费。', '你出现之后，平凡的日子开始有了回声。', '想和你一起，把每个普通的日子过成纪念日。', '山高水长，我想陪你走一段很长的路。', '今晚的月色真美。', '你不需要完美，你只需要是你。', '如果思念有声音，你大概已经听见我了。', '我的时间被分成两半：见你，和等见你。', '你是我藏在心里，又忍不住说出口的秘密。', '愿我们在漫长岁月里，始终偏爱彼此。', '有你在，连沉默都很温柔。', '我把星星摘下来，放在你走过的路上。', '想和你分享的不是一件事，是整个人生。', '爱你这件事，我从不打算克制。'].map((t) => ({ id: uid('l_'), text: t })),
    mood: ['今天的心情是淡紫色的，安静又柔软。', '有一点想你，剩下的大部分时间也在想你。', '像被晒过的被子，暖洋洋的。', '今天的风有点甜。', '懒懒的，想窝在你身边。', '心里下了一场小雨，但看见你就放晴了。', '今天适合听歌、发呆，还有喜欢你。', '没什么理由，就是很开心。', '有点困，需要你的一句话才能醒。', '平静，像一池没有风的水。'].map((t) => ({ id: uid('m_'), text: t })),
    groups: [{ id: G.daily, name: '日常' }, { id: G.sweet, name: '撒娇' }, { id: G.night, name: '深夜' }]
  });

  const defaultState = () => {
    const cards = defaultCards();
    const now = Date.now();
    return {
      version: VERSION,
      createdAt: now,
      profile: {
        myName: '我',
        contactName: 'Blaise·Zabini',
        myAvatar: '',
        contactAvatar: '',
        cover: '',
        togetherSince: '2024-05-20',
        signature: 'Every day with you is a quiet kind of magic.'
      },
      theme: {
        accent: '#7c6a8a',
        preset: 'mist',
        wallpaper: '',
        dim: 0,
        blur: 0,
        font: { name: '', data: '' }
      },
      statusbar: { showName: true, bluetooth: true, batteryPercent: true, signal: 4 },
      settings: {
        fullscreen: false,
        desktopPopup: true,
        backgroundNotify: true,
        keepAlive: false,
        sounds: { enabled: true, incoming: 'chime', outgoing: 'pop', customIncoming: '', customOutgoing: '' },
        chat: { wallpaper: '', dim: 18, bubbleCss: '', fontScale: 15, callBackground: '' }
      },
      appIcons: {},
      desktop: {
        current: 0,
        pages: [{
          id: 'p_home', name: '主页',
          items: [
            { id: 'i_love', type: 'widget', widget: 'love', data: {} },
            { id: 'i_quote', type: 'widget', widget: 'quote', data: {} },
            { id: 'i_mood', type: 'widget', widget: 'mood', data: {} },
            { id: 'i_link', type: 'widget', widget: 'link', data: {} },
            { id: 'i_clock', type: 'widget', widget: 'clock', data: {} },
            { id: 'i_chat', type: 'app', app: 'chat' },
            { id: 'i_mail', type: 'app', app: 'mailbox' },
            { id: 'i_moments', type: 'app', app: 'moments' },
            { id: 'i_settings', type: 'app', app: 'settings' }
          ]
        }]
      },
      cards,
      prob: {
        chat: {
          main: 60, groups: { [G.daily]: 50, [G.sweet]: 35, [G.night]: 25, __ungrouped: 20 },
          kaomoji: 16, emoji: 14, sticker: 8, pat: 5, voice: 10, free: 6,
          noReply: 8, replyMin: 2, replyMax: 8, minCards: 1, maxCards: 3,
          callIn: 6, answer: 75
        },
        mailbox: {
          minCards: 3, maxCards: 7,
          punctuation: ['，', '。', '！', '？', '~', '……'],
          writeChance: 12, maxPerDay: 2, gapMin: 120, gapMax: 480,
          replyMin: 5, replyMax: 60, emoji: 10, kaomoji: 10, sticker: 3
        },
        moments: {
          emoji: 12, kaomoji: 8, sticker: 5,
          likeChance: 72, commentChance: 45, commentMin: 1, commentMax: 20,
          replyChance: 65, replyMin: 1, replyMax: 15,
          postChance: 10, maxPostsPerDay: 2, cardMin: 2, cardMax: 6
        },
        other: { linkChance: 90, partnerTimeChance: 70 }
      },
      chat: {
        messages: [
          { id: uid('msg_'), from: 'them', type: 'text', text: '你终于来了。', ts: now - 12 * 60000 },
          { id: uid('msg_'), from: 'them', type: 'text', text: '今天过得好吗？', ts: now - 11 * 60000 }
        ],
        unread: 2, lastReadTs: 0, lastIncoming: now - 11 * 60000
      },
      mailbox: {
        letters: [
          {
            id: uid('letter_'), dir: 'in', ts: ago(8, 21, 40), read: false,
            text: 'Blaise·Zabini：\n今天路过我们常去的那家书店，橱窗里换了一盏很旧的灯。我站在那里看了很久，忽然觉得，如果你在的话，大概会停下来问我“要不要进去”。\n最近降温了，记得把窗关好。\n—— 想你的人'
          },
          {
            id: uid('letter_'), dir: 'in', ts: ago(47, 23, 10), read: true,
            text: 'Blaise·Zabini：\n昨晚梦到一场很慢的雨，我们都没有带伞。你走在前面，回头笑了一下。\n醒来以后，窗外是晴天，我却还是觉得肩膀有点湿。\n—— 你的 Blaise'
          },
          {
            id: uid('letter_'), dir: 'out', ts: ago(5, 18, 20), read: true,
            text: '致 Blaise：\n今天的晚霞很好看，像你上次衬衫的颜色。\n我把想说的话写得很慢，怕寄得太快，你会觉得我不够认真。\n等你有空，回我一封信吧。',
            replies: [
              { id: uid('reply_'), ts: ago(3, 22, 5), text: '致 我：\n信收到了。晚霞我也看见了，确实很像那件衬衫。\n最近在忙，但读到你的字，忽然觉得日子轻了一点。\n等我。\n—— Blaise' }
            ]
          }
        ],
        unread: 1, lastAuto: ago(8, 21, 40)
      },
      moments: {
        posts: [
          {
            id: uid('post_'), by: 'them', ts: ago(1, 23, 5),
            text: '夜里有一点风。适合听一首旧歌，也适合想起一个人。',
            images: [], likedByMe: false, likedByThem: false,
            comments: [{ id: uid('cmt_'), by: 'me', text: '那个人是不是我？', ts: ago(1, 23, 20) }, { id: uid('cmt_'), by: 'them', text: '你猜。', ts: ago(1, 23, 25) }]
          },
          {
            id: uid('post_'), by: 'them', ts: ago(6, 16, 30),
            text: '今天的云很低，像一封没有寄出的信。',
            images: [], likedByMe: true, likedByThem: false,
            comments: []
          },
          {
            id: uid('post_'), by: 'me', ts: ago(4, 20, 15),
            text: '把普通的一天，过成了想收藏的一天。',
            images: [], likedByMe: false, likedByThem: true,
            comments: [{ id: uid('cmt_'), by: 'them', text: '收藏了。', ts: ago(4, 20, 40) }]
          }
        ],
        unread: 1, lastAuto: ago(1, 23, 5)
      },
      counters: { date: todayKey(), mail: 0, moments: 0 },
      notifications: [],
      clockOffset: 0
    };
  };

  /* ---------------- 合并 / 存取 ---------------- */
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function mergeDefaults(base, over) {
    if (Array.isArray(base)) return Array.isArray(over) ? over : base;
    if (isObj(base)) {
      const out = {};
      Object.keys(base).forEach((k) => { out[k] = mergeDefaults(base[k], isObj(over) ? over[k] : undefined); });
      if (isObj(over)) Object.keys(over).forEach((k) => { if (!(k in out)) out[k] = over[k]; });
      return out;
    }
    return over === undefined ? base : over;
  }

  let state = defaultState();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!isObj(saved)) return;
      state = mergeDefaults(defaultState(), saved);
    } catch (e) {
      console.warn('[store] load failed', e);
    }
  }
  function persistNow() {
    try {
      state.savedAt = Date.now();
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.warn('[store] save failed', e);
      if (window.PHONE && PHONE.toast) PHONE.toast('存储空间不足，请删除部分图片或字卡');
      return false;
    }
  }
  const persist = debounce(persistNow, 260);

  function exportState() {
    return JSON.stringify(state, null, 2);
  }
  function importState(text) {
    let data;
    try { data = JSON.parse(text); } catch (e) { throw new Error('文件不是有效的 JSON'); }
    if (!isObj(data)) throw new Error('数据格式不正确');
    const incoming = isObj(data.state) ? data.state : data;
    if (!isObj(incoming.profile) && !isObj(incoming.cards) && !isObj(incoming.desktop)) throw new Error('没有识别到本应用的数据');
    state = mergeDefaults(defaultState(), incoming);
    state.version = VERSION;
    persistNow();
    return state;
  }
  function reset() {
    state = defaultState();
    persistNow();
  }

  /* ---------------- 事件总线 ---------------- */
  const listeners = {};
  const bus = {
    on(evt, fn) { (listeners[evt] || (listeners[evt] = [])).push(fn); return () => bus.off(evt, fn); },
    off(evt, fn) { const a = listeners[evt]; if (!a) return; const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); },
    emit(evt, ...args) { (listeners[evt] || []).slice().forEach((fn) => { try { fn(...args); } catch (e) { console.error(e); } }); }
  };

  /* ---------------- 图片 / 文件 ---------------- */
  function readFile(file, mode) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(fr.error);
      if (mode === 'text') fr.readAsText(file); else fr.readAsDataURL(file);
    });
  }
  async function compressImage(file, opts) {
    const o = Object.assign({ max: 720, quality: 0.82, type: 'image/webp' }, opts || {});
    if (!file || !/^image\//.test(file.type)) throw new Error('请选择图片文件');
    const dataUrl = await readFile(file);
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error('图片读取失败'));
      im.src = dataUrl;
    });
    let { width: w, height: h } = img;
    const scale = Math.min(1, o.max / Math.max(w, h));
    w = Math.max(1, Math.round(w * scale)); h = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    try { return canvas.toDataURL(o.type, o.quality); } catch (e) { return canvas.toDataURL('image/jpeg', o.quality); }
  }
  function download(filename, text, type) {
    const blob = new Blob([text], { type: type || 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }

  /* ---------------- 轻提示 ---------------- */
  function toast(msg, ms) {
    const layer = $('#toast-layer');
    if (!layer) return;
    const div = document.createElement('div');
    div.className = 'toast';
    div.textContent = msg;
    layer.appendChild(div);
    requestAnimationFrame(() => div.classList.add('show'));
    setTimeout(() => { div.classList.remove('show'); setTimeout(() => div.remove(), 280); }, ms || 2200);
  }

  /* ---------------- 网络时间 ---------------- */
  async function syncNetworkTime() {
    try {
      const res = await fetch(location.href, { method: 'HEAD', cache: 'no-store' });
      const date = res.headers.get('date');
      if (date) {
        const server = new Date(date).getTime();
        if (!isNaN(server)) {
          state.clockOffset = server - Date.now();
          persist();
          bus.emit('clock:sync');
          return true;
        }
      }
    } catch (e) { /* 离线时使用设备时间 */ }
    return false;
  }

  PHONE.$ = $; PHONE.$$ = $$;
  PHONE.uid = uid; PHONE.clamp = clamp; PHONE.rand = rand; PHONE.randInt = randInt;
  PHONE.chance = chance; PHONE.pick = pick; PHONE.shuffle = shuffle; PHONE.weighted = weighted;
  PHONE.debounce = debounce; PHONE.esc = esc; PHONE.escapeRegExp = escapeRegExp;
  PHONE.fmtClock = fmtClock; PHONE.fmtTime = fmtTime; PHONE.fmtDateCN = fmtDateCN;
  PHONE.fmtDateTime = fmtDateTime; PHONE.weekdayCN = weekdayCN; PHONE.monthLabel = monthLabel;
  PHONE.todayKey = todayKey; PHONE.fmtRelative = fmtRelative; PHONE.daysTogether = daysTogether;
  PHONE.readFile = readFile; PHONE.compressImage = compressImage; PHONE.download = download;
  PHONE.toast = toast; PHONE.bus = bus;

  PHONE.apps = [];
  PHONE.registerApp = function (def) { if (def && def.id) PHONE.apps.push(def); };
  PHONE.getApp = function (id) { return PHONE.apps.find((a) => a.id === id); };

  PHONE.state = state;
  PHONE.getState = () => state;
  PHONE.replaceState = (s) => { state = s; PHONE.state = s; };
  PHONE.loadState = load;
  PHONE.save = (immediate) => { if (immediate) { persistNow(); } else { persist(); } PHONE.state = state; };
  PHONE.persistNow = persistNow;
  PHONE.exportState = exportState;
  PHONE.importState = importState;
  PHONE.resetState = reset;
  PHONE.syncNetworkTime = syncNetworkTime;
  PHONE.now = () => Date.now() + (state.clockOffset || 0);
  PHONE.defaultState = defaultState;
  PHONE.mergeDefaults = mergeDefaults;

  // 启动时加载
  load();
  PHONE.state = state;
})();
