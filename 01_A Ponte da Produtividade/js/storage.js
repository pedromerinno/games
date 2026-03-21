/**
 * GameStorage — Offline-first data layer using localStorage
 * All data is saved locally first, sync happens separately.
 */
var GameStorage = (function() {
  'use strict';

  var KEYS = {
    players: 'syngenta_players',
    scores: 'syngenta_scores',
    config: 'syngenta_config'
  };

  // ── Helpers ──
  function read(key) {
    try {
      var data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('GameStorage read error:', e);
      return null;
    }
  }

  function write(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('GameStorage write error:', e);
      return false;
    }
  }

  function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  function normalizeDoc(doc) {
    return (doc || '').replace(/\D/g, '');
  }

  // ── Players ──
  function savePlayer(name, doc) {
    var players = read(KEYS.players) || [];
    var normDoc = normalizeDoc(doc);
    var existing = players.find(function(p) { return p.doc === normDoc; });

    if (existing) {
      existing.name = name; // update name if changed
      write(KEYS.players, players);
      return existing;
    }

    var player = {
      id: generateId(),
      name: name,
      doc: normDoc,
      createdAt: new Date().toISOString()
    };
    players.push(player);
    write(KEYS.players, players);
    return player;
  }

  function getPlayer(doc) {
    var players = read(KEYS.players) || [];
    var normDoc = normalizeDoc(doc);
    return players.find(function(p) { return p.doc === normDoc; }) || null;
  }

  function getAllPlayers() {
    return read(KEYS.players) || [];
  }

  // ── Scores ──
  function saveScore(data) {
    var scores = read(KEYS.scores) || [];
    var score = {
      id: generateId(),
      playerName: data.playerName || '',
      playerDoc: normalizeDoc(data.playerDoc || ''),
      score: data.score || 0,
      won: !!data.won,
      gameMode: data.gameMode || 1,
      difficulty: data.difficulty || 2,
      speed: data.speed || 2,
      playedAt: new Date().toISOString(),
      synced: false
    };
    scores.push(score);
    write(KEYS.scores, scores);
    return score;
  }

  function getScores(opts) {
    var scores = read(KEYS.scores) || [];
    opts = opts || {};

    if (opts.playerDoc) {
      var normDoc = normalizeDoc(opts.playerDoc);
      scores = scores.filter(function(s) { return s.playerDoc === normDoc; });
    }

    // Sort by score descending
    scores.sort(function(a, b) { return b.score - a.score; });

    if (opts.limit) {
      scores = scores.slice(0, opts.limit);
    }

    return scores;
  }

  function getUnsyncedScores() {
    var scores = read(KEYS.scores) || [];
    return scores.filter(function(s) { return !s.synced; });
  }

  function markSynced(scoreIds) {
    var scores = read(KEYS.scores) || [];
    var idSet = {};
    scoreIds.forEach(function(id) { idSet[id] = true; });

    scores.forEach(function(s) {
      if (idSet[s.id]) s.synced = true;
    });

    write(KEYS.scores, scores);
  }

  function getUnsyncedCount() {
    return getUnsyncedScores().length;
  }

  // ── Rankings ──
  function getRankings(limit) {
    limit = limit || 10;
    var scores = read(KEYS.scores) || [];

    // Best score per player (by doc)
    var best = {};
    scores.forEach(function(s) {
      var key = s.playerDoc || s.playerName;
      if (!best[key] || s.score > best[key].score) {
        best[key] = s;
      }
    });

    var ranking = Object.values(best);
    ranking.sort(function(a, b) { return b.score - a.score; });
    return ranking.slice(0, limit);
  }

  function getTotalGames() {
    var scores = read(KEYS.scores) || [];
    return scores.length;
  }

  // ── Config ──
  function saveConfig(config) {
    write(KEYS.config, config);
  }

  function getConfig() {
    return read(KEYS.config) || { speed: 2, difficulty: 2 };
  }

  // ── Cleanup (remove old synced scores to save space) ──
  function cleanup(daysOld) {
    daysOld = daysOld || 30;
    var scores = read(KEYS.scores) || [];
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);
    var cutoffStr = cutoff.toISOString();

    var filtered = scores.filter(function(s) {
      // Keep if not synced OR if newer than cutoff
      return !s.synced || s.playedAt > cutoffStr;
    });

    if (filtered.length < scores.length) {
      write(KEYS.scores, filtered);
      console.log('GameStorage: cleaned up ' + (scores.length - filtered.length) + ' old synced scores');
    }
  }

  // ── Public API ──
  return {
    savePlayer: savePlayer,
    getPlayer: getPlayer,
    getAllPlayers: getAllPlayers,
    saveScore: saveScore,
    getScores: getScores,
    getUnsyncedScores: getUnsyncedScores,
    markSynced: markSynced,
    getUnsyncedCount: getUnsyncedCount,
    getRankings: getRankings,
    getTotalGames: getTotalGames,
    saveConfig: saveConfig,
    getConfig: getConfig,
    cleanup: cleanup
  };
})();
