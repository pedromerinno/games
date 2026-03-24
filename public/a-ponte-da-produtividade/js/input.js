(function() {
  'use strict';

  var inputBuffer = 0;
  var moveCallback = null;

  // Split-screen callbacks
  var moveP1Callback = null;
  var moveP2Callback = null;
  var inputBufferP1 = 0;
  var inputBufferP2 = 0;
  var splitActive = false;

  function init(cb) {
    moveCallback = cb;
    window.addEventListener('keydown', onKey);
    // Touch bindings
    var touchEls = PONTE.ui.getTouchEls();
    touchEls.left.addEventListener('pointerdown', function(){ move(-1); });
    touchEls.right.addEventListener('pointerdown', function(){ move(1); });
  }

  function initSplit(p1cb, p2cb) {
    moveP1Callback = p1cb;
    moveP2Callback = p2cb;
    splitActive = true;

    // Split-screen touch: left half of screen = P1, right half = P2
    var touchEls = PONTE.ui.getTouchEls();
    // Remove old listeners by replacing elements
    var newLeft = touchEls.left.cloneNode(true);
    var newRight = touchEls.right.cloneNode(true);
    touchEls.left.parentNode.replaceChild(newLeft, touchEls.left);
    touchEls.right.parentNode.replaceChild(newRight, touchEls.right);

    // In split-screen, we use custom touch areas
    newLeft.style.display = 'none';
    newRight.style.display = 'none';

    // Create 4 touch zones: P1-left, P1-right, P2-left, P2-right
    var ui = document.getElementById('ui');
    var zones = ['split-touch-p1-left', 'split-touch-p1-right', 'split-touch-p2-left', 'split-touch-p2-right'];
    for (var z = 0; z < zones.length; z++) {
      var existing = document.getElementById(zones[z]);
      if (existing) existing.remove();
    }

    var p1l = _makeTouchZone('split-touch-p1-left', '0', '0', '25%', '100%');
    var p1r = _makeTouchZone('split-touch-p1-right', '25%', '0', '25%', '100%');
    var p2l = _makeTouchZone('split-touch-p2-left', '50%', '0', '25%', '100%');
    var p2r = _makeTouchZone('split-touch-p2-right', '75%', '0', '25%', '100%');

    ui.appendChild(p1l);
    ui.appendChild(p1r);
    ui.appendChild(p2l);
    ui.appendChild(p2r);

    p1l.addEventListener('pointerdown', function(){ moveP1(-1); });
    p1r.addEventListener('pointerdown', function(){ moveP1(1); });
    p2l.addEventListener('pointerdown', function(){ moveP2(-1); });
    p2r.addEventListener('pointerdown', function(){ moveP2(1); });
  }

  function _makeTouchZone(id, left, top, width, height) {
    var el = document.createElement('div');
    el.id = id;
    el.style.position = 'absolute';
    el.style.left = left;
    el.style.top = top;
    el.style.width = width;
    el.style.height = height;
    el.style.pointerEvents = 'all';
    el.style.cursor = 'pointer';
    el.style.zIndex = '5';
    return el;
  }

  function enableSplitTouch() {
    var zones = ['split-touch-p1-left', 'split-touch-p1-right', 'split-touch-p2-left', 'split-touch-p2-right'];
    for (var z = 0; z < zones.length; z++) {
      var el = document.getElementById(zones[z]);
      if (el) el.style.pointerEvents = 'all';
    }
  }

  function disableSplitTouch() {
    var zones = ['split-touch-p1-left', 'split-touch-p1-right', 'split-touch-p2-left', 'split-touch-p2-right'];
    for (var z = 0; z < zones.length; z++) {
      var el = document.getElementById(zones[z]);
      if (el) el.style.pointerEvents = 'none';
    }
  }

  function move(dir) {
    if (moveCallback) moveCallback(dir);
  }

  function moveP1(dir) {
    if (moveP1Callback) moveP1Callback(dir);
  }

  function moveP2(dir) {
    if (moveP2Callback) moveP2Callback(dir);
  }

  function onKey(e) {
    if (splitActive) {
      // P1: A/D
      if (e.key === 'a' || e.key === 'A') moveP1(-1);
      else if (e.key === 'd' || e.key === 'D') moveP1(1);
      // P2: Arrow keys
      else if (e.key === 'ArrowLeft') moveP2(-1);
      else if (e.key === 'ArrowRight') moveP2(1);
    } else {
      if (e.key === 'ArrowLeft' || e.key === 'a') move(-1);
      else if (e.key === 'ArrowRight' || e.key === 'd') move(1);
    }
  }

  function getBuffer() { return inputBuffer; }
  function setBuffer(v) { inputBuffer = v; }
  function clearBuffer() { inputBuffer = 0; }

  function getBufferP1() { return inputBufferP1; }
  function setBufferP1(v) { inputBufferP1 = v; }
  function clearBufferP1() { inputBufferP1 = 0; }

  function getBufferP2() { return inputBufferP2; }
  function setBufferP2(v) { inputBufferP2 = v; }
  function clearBufferP2() { inputBufferP2 = 0; }

  function resetSplit() {
    splitActive = false;
    moveP1Callback = null;
    moveP2Callback = null;
    inputBufferP1 = 0;
    inputBufferP2 = 0;
    var zones = ['split-touch-p1-left', 'split-touch-p1-right', 'split-touch-p2-left', 'split-touch-p2-right'];
    for (var z = 0; z < zones.length; z++) {
      var el = document.getElementById(zones[z]);
      if (el) el.remove();
    }
  }

  PONTE.input = {
    init: init,
    initSplit: initSplit,
    enableSplitTouch: enableSplitTouch,
    disableSplitTouch: disableSplitTouch,
    resetSplit: resetSplit,
    getBuffer: getBuffer,
    setBuffer: setBuffer,
    clearBuffer: clearBuffer,
    getBufferP1: getBufferP1,
    setBufferP1: setBufferP1,
    clearBufferP1: clearBufferP1,
    getBufferP2: getBufferP2,
    setBufferP2: setBufferP2,
    clearBufferP2: clearBufferP2
  };

})();
