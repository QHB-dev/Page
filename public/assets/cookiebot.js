/* Bridge between Cookiebot's consent DOM and Shedio's approved UI. */
(function () {
  var DIALOG_ID = 'CybotCookiebotDialog';
  var LEVEL_WRAPPER_ID = 'CybotCookiebotDialogBodyLevelWrapper';
  var TITLE_ID = 'CybotCookiebotDialogBodyContentTitle';
  var BODY_CONTENT_ID = 'CybotCookiebotDialogBodyContent';
  var CUSTOMIZE_BUTTON_ID = 'CybotCookiebotDialogBodyLevelButtonCustomize';
  var SELECTION_BUTTON_ID = 'CybotCookiebotDialogBodyLevelButtonLevelOptinAllowallSelection';
  var MANAGE_SLOT_ID = 'ShedioCookiebotManageSlot';
  var HEADING_ID = 'ShedioCookiebotPreferencesHeading';
  var UNDERLAY_ID = 'ShedioCookiebotUnderlay';
  var BODY_ACTIVE_CLASS = 'shedio-cookiebot-active';
  var PREFERENCES_TITLE = 'Cookie preferences';
  var requestedView = null;
  var pendingPreferencesOpen = false;
  var dialogDisplayReady = false;
  var syncFrame = 0;
  var rootObserver = null;
  var dialogObserver = null;
  var observedDialogRoot = null;

  function isNativelyHidden(element) {
    if (!element) return true;
    return element.hidden ||
      element.getAttribute('aria-hidden') === 'true' ||
      element.style.display === 'none' ||
      element.classList.contains('CybotCookiebotDialogHide');
  }

  function preferencesControlsAreReady(levelWrapper) {
    var selectionButton = document.getElementById(SELECTION_BUTTON_ID);
    if (
      !levelWrapper ||
      !selectionButton ||
      isNativelyHidden(selectionButton) ||
      !selectionButton.textContent ||
      !selectionButton.textContent.trim()
    ) {
      return false;
    }

    return [
      'CybotCookiebotDialogBodyLevelButtonNecessary',
      'CybotCookiebotDialogBodyLevelButtonStatistics',
      'CybotCookiebotDialogBodyLevelButtonMarketing'
    ].every(function (id) {
      var control = document.getElementById(id);
      var row = control && control.closest('.CybotCookiebotDialogBodyLevelButtonWrapper');
      return Boolean(
        control &&
        levelWrapper.contains(control) &&
        row &&
        row.textContent &&
        row.textContent.trim()
      );
    });
  }

  function dialogIsActive(dialog) {
    var wrapper = document.getElementById('CybotCookiebotDialogWrapper');

    if (!dialog || isNativelyHidden(dialog) || (wrapper && isNativelyHidden(wrapper))) {
      return false;
    }

    if (
      dialog.classList.contains('CybotCookiebotDialogActive') ||
      (wrapper && wrapper.classList.contains('CybotCookiebotDialogActive'))
    ) {
      return true;
    }

    /* Cookiebot's Swift banner does not consistently keep the legacy Active
       class while switching between summary and preferences. Treat a rendered
       dialog as active while the bridge prepares it; once ready, also require
       native visibility so the underlay cannot outlive the banner. */
    var renderedElement = wrapper || dialog;
    var renderedStyle = window.getComputedStyle(renderedElement);
    var dialogStyle = window.getComputedStyle(dialog);

    var readyForOpacityCheck = dialog.dataset.shedioReady === 'true';

    return renderedElement.getClientRects().length > 0 &&
      dialog.getClientRects().length > 0 &&
      renderedStyle.display !== 'none' &&
      dialogStyle.display !== 'none' &&
      (!readyForOpacityCheck || (
        renderedStyle.visibility !== 'hidden' &&
        dialogStyle.visibility !== 'hidden' &&
        renderedStyle.opacity !== '0' &&
        dialogStyle.opacity !== '0'
      ));
  }

  function syncUnderlay(dialog) {
    if (!document.body) return;

    var underlay = document.getElementById(UNDERLAY_ID);

    if (!underlay && dialog) {
      underlay = document.createElement('div');
      underlay.id = UNDERLAY_ID;
      underlay.setAttribute('aria-hidden', 'true');
      document.body.appendChild(underlay);
    }

    var isActive = dialogIsActive(dialog);
    if (underlay) underlay.hidden = !isActive;
    document.body.classList.toggle(BODY_ACTIVE_CLASS, isActive);
    if (!isActive) requestedView = null;
  }

  function syncDialogState() {
    var dialog = document.getElementById(DIALOG_ID);
    if (!dialog) {
      observeDialog(null);
      syncUnderlay(null);
      return;
    }

    observeDialog(dialog);

    var levelWrapper = document.getElementById(LEVEL_WRAPPER_ID);
    var title = document.getElementById(TITLE_ID);
    var preferencesReady = preferencesControlsAreReady(levelWrapper);
    var isPreferences = requestedView === 'preferences' || preferencesReady;
    var nextView = isPreferences ? 'preferences' : 'summary';
    if (dialog.dataset.shedioView !== nextView) {
      dialog.dataset.shedioView = nextView;
    }

    if (title) {
      var currentTitle = title.textContent && title.textContent.trim();
      if (currentTitle && currentTitle !== PREFERENCES_TITLE) {
        dialog.dataset.shedioSummaryTitle = currentTitle;
      }
      var nextTitle = isPreferences
        ? PREFERENCES_TITLE
        : (dialog.dataset.shedioSummaryTitle || currentTitle || '');
      if (title.textContent !== nextTitle) title.textContent = nextTitle;
    }

    var bodyContent = document.getElementById(BODY_CONTENT_ID);
    var customizeButton = document.getElementById(CUSTOMIZE_BUTTON_ID);
    var manageSlot = document.getElementById(MANAGE_SLOT_ID);

    if (!manageSlot && bodyContent && bodyContent.parentElement) {
      manageSlot = document.createElement('div');
      manageSlot.id = MANAGE_SLOT_ID;
      bodyContent.insertAdjacentElement('afterend', manageSlot);
    }
    if (manageSlot && customizeButton && customizeButton.parentElement !== manageSlot) {
      manageSlot.appendChild(customizeButton);
    }

    if (!document.getElementById(HEADING_ID) && levelWrapper && levelWrapper.parentElement) {
      var heading = document.createElement('div');
      heading.id = HEADING_ID;
      heading.setAttribute('role', 'heading');
      heading.setAttribute('aria-level', '2');
      heading.textContent = 'Manage cookies preferences';
      levelWrapper.parentElement.insertBefore(heading, levelWrapper);
    }

    var isActive = dialogIsActive(dialog);

    if (pendingPreferencesOpen && dialogDisplayReady && isActive) {
      if (preferencesReady) {
        pendingPreferencesOpen = false;
        requestedView = 'preferences';
      } else if (customizeButton && !isNativelyHidden(customizeButton)) {
        requestedView = 'preferences';
        customizeButton.click();
        scheduleSync();
        return;
      }
    }

    var requestedViewReady = requestedView !== 'preferences' || preferencesReady;

    if (dialogDisplayReady && isActive && !pendingPreferencesOpen && requestedViewReady) {
      if (dialog.dataset.shedioReady !== 'true') {
        dialog.dataset.shedioReady = 'true';
      }
    } else if (dialog.hasAttribute('data-shedio-ready')) {
      delete dialog.dataset.shedioReady;
    }

    syncUnderlay(dialogDisplayReady ? dialog : null);
  }

  function scheduleSync() {
    if (syncFrame) window.cancelAnimationFrame(syncFrame);
    syncFrame = window.requestAnimationFrame(function () {
      syncFrame = window.requestAnimationFrame(function () {
        syncFrame = 0;
        syncDialogState();
      });
    });
  }

  function observeDialog(dialog) {
    var wrapper = document.getElementById('CybotCookiebotDialogWrapper');
    var nextRoot = wrapper || dialog;
    if (nextRoot === observedDialogRoot) return;

    if (dialogObserver) dialogObserver.disconnect();
    observedDialogRoot = nextRoot;

    if (!nextRoot) return;
    dialogObserver = new MutationObserver(scheduleSync);
    dialogObserver.observe(nextRoot, {
      attributes: true,
      attributeFilter: ['aria-hidden', 'class', 'hidden', 'style'],
      childList: true,
      subtree: true
    });
  }

  function handleClick(event) {
    var target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    if (target.closest('#' + CUSTOMIZE_BUTTON_ID)) {
      requestedView = 'preferences';
      var dialog = document.getElementById(DIALOG_ID);
      if (dialog) delete dialog.dataset.shedioReady;
      scheduleSync();
      return;
    }

    if (target.closest(
      '#CybotCookiebotDialogBodyButtonAccept, ' +
      '#CybotCookiebotDialogBodyButtonDecline, ' +
      '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll, ' +
      '#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll, ' +
      '#' + SELECTION_BUTTON_ID
    )) {
      pendingPreferencesOpen = false;
      requestedView = null;
      var activeDialog = document.getElementById(DIALOG_ID);
      if (activeDialog) delete activeDialog.dataset.shedioReady;
      scheduleSync();
    }
  }

  function openPreferences() {
    if (window.Cookiebot && typeof window.Cookiebot.renew === 'function') {
      pendingPreferencesOpen = true;
      requestedView = null;
      dialogDisplayReady = false;

      var dialog = document.getElementById(DIALOG_ID);
      if (dialog) delete dialog.dataset.shedioReady;

      /* Keep the viewport width stable while a menu closes and Cookiebot
         rebuilds its dialog. Without this hand-off the page scrollbar can
         briefly return and Cookiebot may cache an overflowing panel width. */
      var underlay = document.getElementById(UNDERLAY_ID);
      if (!underlay) {
        underlay = document.createElement('div');
        underlay.id = UNDERLAY_ID;
        underlay.setAttribute('aria-hidden', 'true');
        document.body.appendChild(underlay);
      }
      underlay.hidden = false;
      document.body.classList.add(BODY_ACTIVE_CLASS);

      window.Cookiebot.renew();
      scheduleSync();
    }
  }

  window.ShedioCookiebot = window.ShedioCookiebot || {};
  window.ShedioCookiebot.openPreferences = openPreferences;

  function init() {
    rootObserver = new MutationObserver(scheduleSync);
    rootObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    document.addEventListener('click', handleClick, true);
    window.addEventListener('CookiebotOnDialogInit', function () {
      dialogDisplayReady = false;
      scheduleSync();
    });
    window.addEventListener('CookiebotOnDialogDisplay', function () {
      dialogDisplayReady = true;
      scheduleSync();
    });
    scheduleSync();
  }

  init();
})();
