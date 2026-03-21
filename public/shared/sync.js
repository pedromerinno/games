/**
 * GameSync — Supabase sync layer with offline awareness
 * Tries to sync when online, queues when offline.
 */
var GameSync = (function() {
  'use strict';

  var supabase = null;
  var syncInterval = null;
  var SYNC_INTERVAL_MS = 30000; // 30 seconds
  var statusListeners = [];

  // ── Init ──
  function init(url, anonKey) {
    if (!url || !anonKey) {
      console.log('GameSync: No Supabase credentials, running in offline-only mode');
      return false;
    }

    if (typeof window.supabase === 'undefined') {
      console.warn('GameSync: Supabase SDK not loaded, running offline-only');
      return false;
    }

    try {
      supabase = window.supabase.createClient(url, anonKey);
      console.log('GameSync: Supabase client initialized');
      startAutoSync();
      return true;
    } catch (e) {
      console.warn('GameSync: Failed to init Supabase:', e);
      return false;
    }
  }

  // ── Online check ──
  function isOnline() {
    return navigator.onLine;
  }

  // ── Push unsynced scores to Supabase ──
  function pushUnsyncedScores() {
    if (!supabase || !isOnline()) return Promise.resolve(false);

    var unsynced = GameStorage.getUnsyncedScores();
    if (unsynced.length === 0) return Promise.resolve(true);

    console.log('GameSync: Pushing ' + unsynced.length + ' unsynced scores...');

    // Map to Supabase schema
    var rows = unsynced.map(function(s) {
      return {
        id: s.id,
        player_name: s.playerName,
        player_doc: s.playerDoc,
        score: s.score,
        won: s.won,
        game_mode: s.gameMode,
        difficulty: s.difficulty,
        speed: s.speed,
        played_at: s.playedAt
      };
    });

    return supabase
      .from('scores')
      .upsert(rows, { onConflict: 'id' })
      .then(function(result) {
        if (result.error) {
          console.warn('GameSync: Push error:', result.error.message);
          notifyStatus('error');
          return false;
        }

        // Mark as synced
        var ids = unsynced.map(function(s) { return s.id; });
        GameStorage.markSynced(ids);
        console.log('GameSync: Successfully synced ' + ids.length + ' scores');
        notifyStatus('synced');
        return true;
      })
      .catch(function(err) {
        console.warn('GameSync: Push failed:', err);
        notifyStatus('error');
        return false;
      });
  }

  // ── Also sync players ──
  function pushPlayers() {
    if (!supabase || !isOnline()) return Promise.resolve(false);

    var players = GameStorage.getAllPlayers();
    if (players.length === 0) return Promise.resolve(true);

    var rows = players.map(function(p) {
      return {
        id: p.id,
        name: p.name,
        doc: p.doc,
        created_at: p.createdAt
      };
    });

    return supabase
      .from('players')
      .upsert(rows, { onConflict: 'id' })
      .then(function(result) {
        if (result.error) {
          console.warn('GameSync: Player push error:', result.error.message);
          return false;
        }
        return true;
      })
      .catch(function() { return false; });
  }

  // ── Full sync ──
  function syncAll() {
    if (!supabase || !isOnline()) return;
    pushPlayers();
    pushUnsyncedScores();
  }

  // ── Auto sync ──
  function startAutoSync() {
    if (syncInterval) return;

    // Sync on reconnect
    window.addEventListener('online', function() {
      console.log('GameSync: Back online, syncing...');
      notifyStatus('syncing');
      setTimeout(syncAll, 1000);
    });

    window.addEventListener('offline', function() {
      console.log('GameSync: Gone offline');
      notifyStatus('offline');
    });

    // Periodic sync
    syncInterval = setInterval(function() {
      if (isOnline() && GameStorage.getUnsyncedCount() > 0) {
        syncAll();
      }
    }, SYNC_INTERVAL_MS);

    // Initial sync
    if (isOnline()) {
      setTimeout(syncAll, 2000);
    }
  }

  function stopAutoSync() {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
  }

  // ── Status notifications ──
  function onStatusChange(fn) {
    statusListeners.push(fn);
  }

  function notifyStatus(status) {
    statusListeners.forEach(function(fn) { fn(status); });
  }

  function getStatus() {
    if (!supabase) return 'offline-only';
    if (!isOnline()) return 'offline';
    if (GameStorage.getUnsyncedCount() > 0) return 'pending';
    return 'synced';
  }

  // ── Public API ──
  return {
    init: init,
    isOnline: isOnline,
    pushUnsyncedScores: pushUnsyncedScores,
    syncAll: syncAll,
    startAutoSync: startAutoSync,
    stopAutoSync: stopAutoSync,
    onStatusChange: onStatusChange,
    getStatus: getStatus
  };
})();
