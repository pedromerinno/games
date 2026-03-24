(function() {
  'use strict';

  var elSaldo, elStakes, elLavoura, elFieldFill, elProgText;
  var elPlayerName, elPips, elCombo, elHint;
  var elTL, elTR;
  var cachedPips = [];
  var lastPct = -1, lastStakes = -1, lastTotal = -999;

  // Split-screen HUD state
  var splitHuds = null; // { p1: { ... }, p2: { ... } }

  function init() {
    elSaldo = document.getElementById('hud-saldo');
    elStakes = document.getElementById('hud-stakes');
    elLavoura = document.getElementById('hud-lavoura');
    elFieldFill = document.getElementById('field-progress-fill');
    elProgText = document.getElementById('hud-progress-text');
    elPlayerName = document.getElementById('pill-name');
    elPips = document.getElementById('hud-pips');
    elCombo = document.getElementById('combo-text');
    elHint = document.getElementById('controls-hint');
    elTL = document.getElementById('touch-left');
    elTR = document.getElementById('touch-right');
    cachedPips = [].slice.call(elPips.querySelectorAll('.pip'));
    lastPct = -1; lastStakes = -1; lastTotal = -999;
  }

  function update(state) {
    var cfg = PONTE.config;
    var total = state.coins + state.bonusC;
    var pct = Math.min(Math.round(state.zPos / cfg.DIST * 100), 100);

    // Only update DOM when values actually change
    if (total !== lastTotal) {
      lastTotal = total;
      elSaldo.textContent = total === 0 ? '0' : (total > 0 ? '+' : '') + total;
      elSaldo.className = 'pill-val ' + (total > 0 ? 'pos' : total < 0 ? 'neg' : '');
    }

    if (state.stakes !== lastStakes) {
      lastStakes = state.stakes;
      elStakes.textContent = state.stakes;
      PONTE.player.updateStakesPile(state.stakes);
    }

    if (pct !== lastPct) {
      lastPct = pct;
      // Lavoura shows progress (0% -> 100%)
      elLavoura.textContent = pct + '%';
      elLavoura.style.color = pct > 66 ? '#7dde9c' : pct > 33 ? '#ffd966' : '#f08080';
      elFieldFill.style.width = pct + '%';
      var faseIdx = Math.min(Math.floor(pct / 100 * PONTE.FASES.length), PONTE.FASES.length - 1);
      elProgText.textContent = PONTE.FASES[faseIdx];
      var activePips = Math.floor(pct / 20);
      for (var i = 0; i < cachedPips.length; i++) {
        cachedPips[i].className = 'pip' + (i < activePips ? ' on' : '');
      }
    }
  }

  /** Create split-screen HUD elements */
  function initSplitHuds(p1Name, p2Name) {
    // Hide the original HUD
    document.getElementById('hud-wrap').classList.add('hidden-hud');

    // Remove existing split HUDs if any
    var oldSplit = document.getElementById('split-hud-container');
    if (oldSplit) oldSplit.remove();

    var container = document.createElement('div');
    container.id = 'split-hud-container';
    container.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:15;display:flex';

    function makeHud(name, side, color) {
      var wrap = document.createElement('div');
      wrap.className = 'split-hud split-hud-' + side;
      wrap.innerHTML =
        '<div class="split-hud-name" style="color:' + color + '">' + name + '</div>' +
        '<div class="split-hud-row">' +
          '<span class="split-hud-label">Pontos</span>' +
          '<span class="split-hud-val split-hud-score">0</span>' +
        '</div>' +
        '<div class="split-hud-row">' +
          '<span class="split-hud-label">Estacas</span>' +
          '<span class="split-hud-val split-hud-stakes" style="color:#ffd966">0</span>' +
        '</div>' +
        '<div class="split-hud-row">' +
          '<span class="split-hud-label">Progresso</span>' +
          '<span class="split-hud-val split-hud-progress">0%</span>' +
        '</div>';
      return {
        el: wrap,
        scoreEl: wrap.querySelector('.split-hud-score'),
        stakesEl: wrap.querySelector('.split-hud-stakes'),
        progressEl: wrap.querySelector('.split-hud-progress'),
        lastTotal: -999,
        lastStakes: -1,
        lastPct: -1
      };
    }

    var p1Hud = makeHud(p1Name, 'left', '#64B5F6');
    var p2Hud = makeHud(p2Name, 'right', '#FF8A65');

    container.appendChild(p1Hud.el);
    container.appendChild(p2Hud.el);
    document.getElementById('ui').appendChild(container);

    splitHuds = { p1: p1Hud, p2: p2Hud };
    return splitHuds;
  }

  /** Update split-screen HUD for a specific player */
  function updateSplitHud(which, pState, pObj) {
    var hud = splitHuds ? splitHuds[which] : null;
    if (!hud) return;
    var cfg = PONTE.config;
    var total = pState.coins + pState.bonusC;
    var pct = Math.min(Math.round(pState.zPos / cfg.DIST * 100), 100);

    if (total !== hud.lastTotal) {
      hud.lastTotal = total;
      hud.scoreEl.textContent = total === 0 ? '0' : (total > 0 ? '+' : '') + total;
      hud.scoreEl.style.color = total > 0 ? '#7dde9c' : total < 0 ? '#f08080' : '#fff';
    }

    if (pState.stakes !== hud.lastStakes) {
      hud.lastStakes = pState.stakes;
      hud.stakesEl.textContent = pState.stakes;
      if (pObj) PONTE.player.updateStakesPileFor(pObj, pState.stakes);
    }

    if (pct !== hud.lastPct) {
      hud.lastPct = pct;
      hud.progressEl.textContent = pct + '%';
      hud.progressEl.style.color = pct > 66 ? '#7dde9c' : pct > 33 ? '#ffd966' : '#f08080';
    }
  }

  /** Remove split HUDs */
  function removeSplitHuds() {
    var el = document.getElementById('split-hud-container');
    if (el) el.remove();
    splitHuds = null;
  }

  function enableTouch() {
    elTL.style.pointerEvents = 'all';
    elTR.style.pointerEvents = 'all';
  }

  function disableTouch() {
    elTL.style.pointerEvents = 'none';
    elTR.style.pointerEvents = 'none';
  }

  function showFloat(text, color) {
    PONTE.effects.showFloat(text, color);
  }

  function getPlayerNameEl() { return elPlayerName; }
  function getPipsEl() { return elPips; }
  function getHintEl() { return elHint; }
  function getTouchEls() { return { left: elTL, right: elTR }; }

  PONTE.ui = {
    init: init,
    update: update,
    initSplitHuds: initSplitHuds,
    updateSplitHud: updateSplitHud,
    removeSplitHuds: removeSplitHuds,
    enableTouch: enableTouch,
    disableTouch: disableTouch,
    showFloat: showFloat,
    getPlayerNameEl: getPlayerNameEl,
    getPipsEl: getPipsEl,
    getHintEl: getHintEl,
    getTouchEls: getTouchEls
  };

})();
