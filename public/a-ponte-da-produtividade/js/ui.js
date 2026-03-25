(function() {
  'use strict';

  var elSaldo, elStakes, elLavoura, elFieldFill, elProgText;
  var elPlayerName, elPips, elCombo, elHint;
  var elTL, elTR, elSyncoins, elSyncoinPill;
  var cachedPips = [];
  var lastPct = -1, lastStakes = -1, lastTotal = -999, lastBonusC = -1;

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
    elSyncoins = document.getElementById('hud-syncoins');
    elSyncoinPill = document.getElementById('syncoin-pill');
    cachedPips = [].slice.call(elPips.querySelectorAll('.pip'));
    lastPct = -1; lastStakes = -1; lastTotal = -999; lastBonusC = -1;
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

    // SynCoins counter (bonus coins collected on the bridge)
    if (state.syncoins !== lastBonusC) {
      var changed = lastBonusC >= 0;
      lastBonusC = state.syncoins;
      elSyncoins.textContent = state.syncoins;
      if (changed && elSyncoinPill) {
        elSyncoinPill.classList.remove('pulse');
        void elSyncoinPill.offsetWidth;
        elSyncoinPill.classList.add('pulse');
      }
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
    enableTouch: enableTouch,
    disableTouch: disableTouch,
    showFloat: showFloat,
    getPlayerNameEl: getPlayerNameEl,
    getPipsEl: getPipsEl,
    getHintEl: getHintEl,
    getTouchEls: getTouchEls
  };

})();
