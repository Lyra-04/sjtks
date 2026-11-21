/* ============================================================
   Blaise Phone · 启动
   ============================================================ */
(function () {
  function boot() {
    const phone = document.getElementById('phone');
    if (!phone) return;

    PHONE.initDesktop();
    PHONE.engine.startScheduler();
    PHONE.syncNetworkTime();

    // 任何消息变化都刷新角标
    PHONE.bus.on('chat:new', () => { PHONE.updateBadges(); });
    PHONE.bus.on('mail:change', () => { PHONE.updateBadges(); });
    PHONE.bus.on('moments:change', () => { PHONE.updateBadges(); });

    // 键盘打开时保持输入框可见
    window.addEventListener('resize', () => {
      if (PHONE.currentApp === 'chat') PHONE.chat.refresh();
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) { PHONE.updateClock(); if (PHONE.currentApp === 'chat') PHONE.chat.refresh(); }
    });
    window.addEventListener('beforeunload', () => PHONE.persistNow());

    // 首次打开的小提示
    if (!sessionStorage.getItem('blaise_booted')) {
      sessionStorage.setItem('blaise_booted', '1');
      setTimeout(() => PHONE.toast('左右滑动切换页面 · 长按桌面进入编辑', 3400), 900);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
