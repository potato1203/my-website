window.PAWER_NET = (() => {
  let _peer = null, _conn = null;
  const _h = {};

  function _shortId() {
    const C = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return 'P' + Array.from({ length: 5 }, () => C[Math.random() * C.length | 0]).join('');
  }

  function _bind(c) {
    _conn = c;
    net.connected = true;
    c.on('data', d => _h[d.t]?.(d));
    c.on('close', () => { net.connected = false; _conn = null; _h.disconnect?.(); });
    _h.connect?.();
  }

  const net = {
    myId: null,
    isHost: false,
    connected: false,

    init(cb) {
      if (_peer && net.myId) { cb?.(net.myId); return; }
      const tryNew = () => {
        _peer = new Peer(_shortId(), { debug: 0 });
        _peer.on('open', id => { net.myId = id; cb?.(id); });
        _peer.on('connection', c => { net.isHost = true; _bind(c); });
        _peer.on('error', e => {
          if (e.type === 'unavailable-id') tryNew();
          else _h.error?.(e);
        });
      };
      tryNew();
    },

    connect(remoteId, onOk, onFail) {
      net.isHost = false;
      const c = _peer.connect(remoteId.trim().toUpperCase(), { serialization: 'json' });
      const t = setTimeout(() => onFail?.('timeout'), 10000);
      c.on('open', () => { clearTimeout(t); _bind(c); onOk?.(); });
      c.on('error', () => { clearTimeout(t); onFail?.('error'); });
    },

    send(msg) { if (_conn?.open) _conn.send(msg); },
    on(type, fn) { _h[type] = fn; },
    off(type) { delete _h[type]; },
    disconnect() { _conn?.close(); _conn = null; net.connected = false; },
  };

  return net;
})();
