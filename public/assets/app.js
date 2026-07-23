/* Shedio — 共享交互（Menu 抽屉：锁滚动 / 点外关闭 / Esc 关闭 / 回原位置） */
(function(){
  function init(){
    var toggle  = document.querySelector('.menu-toggle');
    var overlay = document.getElementById('menuOverlay');
    if(!overlay) return;

    function open(){
      overlay.classList.add('open');
      document.body.classList.add('no-scroll');   // 打开时背景不可滚
    }
    function close(){
      overlay.classList.remove('open');
      document.body.classList.remove('no-scroll'); // 干净退回原滚动位置
    }

    if(toggle) toggle.addEventListener('click', open);

    // 点 ✕ 或任何标记了 data-close 的元素 → 关闭
    overlay.querySelectorAll('[data-close]').forEach(function(el){
      el.addEventListener('click', close);
    });
    // 点抽屉外的空白（媒体区/面板留白）→ 关闭
    overlay.addEventListener('click', function(e){
      if(e.target === overlay || e.target.classList.contains('overlay-media')) close();
    });
    // Esc / 系统返回 → 关闭
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && overlay.classList.contains('open')) close();
    });

    // 前进/后退（bfcache）恢复：抽屉若被恢复成打开态，立即「无动画」收起，
    // 避免返回时看到菜单卡住或播放收起动画。
    window.addEventListener('pageshow', function(){
      if(!overlay.classList.contains('open')) return;
      overlay.classList.add('no-anim');
      overlay.classList.remove('open');
      document.body.classList.remove('no-scroll');
      requestAnimationFrame(function(){
        requestAnimationFrame(function(){ overlay.classList.remove('no-anim'); });
      });
    });

    window.__shedioCloseMenu = close;

    document.querySelectorAll('[data-cookie-settings]').forEach(function(el){
      el.addEventListener('click', function(event){
        event.preventDefault();
        close();
        if(window.ShedioCookiebot && typeof window.ShedioCookiebot.openPreferences === 'function'){
          window.ShedioCookiebot.openPreferences();
        } else if(window.Cookiebot && typeof window.Cookiebot.renew === 'function'){
          window.Cookiebot.renew();
        }
      });
    });

    // 语言下拉 → 接到 Shedio.i18n（预留多语言接口；未启用的语言会被忽略）
    document.querySelectorAll('[data-lang-select]').forEach(function(sel){
      sel.addEventListener('change', function(){
        if(window.Shedio && window.Shedio.i18n){ window.Shedio.i18n.set(sel.value); }
      });
    });
  }
  if(document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
