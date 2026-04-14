(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────────
  const script = document.currentScript ||
    document.querySelector('script[data-tenant]');
  const TENANT_ID = script && script.getAttribute('data-tenant');
  const SERVER   = (script && script.getAttribute('data-server')) || 'https://api.chatorai.com';
  const COLOR    = (script && script.getAttribute('data-color')) || '#2563EB';
  const POSITION = (script && script.getAttribute('data-position')) || 'bottom-right';

  if (!TENANT_ID) { console.warn('[ChatOrAI] data-tenant missing'); return; }

  // ── Session persistence ──────────────────────────────────────────────────
  const SESSION_KEY = `airos_session_${TENANT_ID}`;
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  // ── RTL detection ────────────────────────────────────────────────────────
  const isRTL = document.documentElement.dir === 'rtl' ||
    ['ar', 'he', 'fa', 'ur'].some(l => navigator.language?.startsWith(l));

  // ── Inject styles ────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #airos-widget-btn {
      position: fixed;
      ${POSITION.includes('right') ? 'right:20px' : 'left:20px'};
      bottom: 20px;
      width: 56px; height: 56px;
      background: ${COLOR};
      border-radius: 50%;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,0,0,.25);
      display: flex; align-items: center; justify-content: center;
      z-index: 2147483646;
      transition: transform .2s;
    }
    #airos-widget-btn:hover { transform: scale(1.1); }
    #airos-widget-btn svg { width: 28px; height: 28px; fill: #fff; }
    #airos-widget-badge {
      position: absolute; top: 0; right: 0;
      background: #ef4444; color: #fff;
      border-radius: 999px; font-size: 11px;
      min-width: 18px; height: 18px;
      padding: 0 4px; display: none;
      align-items: center; justify-content: center;
      font-family: sans-serif; font-weight: 700;
    }
    #airos-widget-window {
      position: fixed;
      ${POSITION.includes('right') ? 'right:20px' : 'left:20px'};
      bottom: 90px;
      width: 360px; max-height: 580px;
      background: #fff; border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0,0,0,.18);
      display: none; flex-direction: column;
      z-index: 2147483645;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      overflow: hidden;
      direction: ${isRTL ? 'rtl' : 'ltr'};
    }
    #airos-widget-window.open { display: flex; }
    #airos-widget-header {
      background: ${COLOR}; color: #fff;
      padding: 16px; display: flex; align-items: center; gap: 10px;
    }
    #airos-widget-header .title { font-weight: 600; font-size: 15px; }
    #airos-widget-header .subtitle { font-size: 12px; opacity: .8; }
    #airos-widget-messages {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 10px;
      background: #f9fafb;
    }
    .airos-msg {
      max-width: 80%; padding: 10px 14px;
      border-radius: 14px; font-size: 14px; line-height: 1.5;
      word-break: break-word;
    }
    .airos-msg.customer {
      background: ${COLOR}; color: #fff;
      align-self: ${isRTL ? 'flex-start' : 'flex-end'};
      border-bottom-${isRTL ? 'left' : 'right'}-radius: 2px;
    }
    .airos-msg.agent {
      background: #fff; color: #111;
      align-self: ${isRTL ? 'flex-end' : 'flex-start'};
      border-bottom-${isRTL ? 'right' : 'left'}-radius: 2px;
      box-shadow: 0 1px 4px rgba(0,0,0,.08);
    }
    .airos-typing { display: flex; gap: 4px; padding: 8px 14px; }
    .airos-typing span {
      width: 8px; height: 8px; background: #9ca3af;
      border-radius: 50%; animation: airos-bounce .8s infinite;
    }
    .airos-typing span:nth-child(2) { animation-delay: .15s; }
    .airos-typing span:nth-child(3) { animation-delay: .3s; }
    @keyframes airos-bounce {
      0%,80%,100% { transform: translateY(0); }
      40%          { transform: translateY(-6px); }
    }
    #airos-widget-input-row {
      padding: 12px; background: #fff;
      border-top: 1px solid #e5e7eb;
      display: flex; gap: 8px; align-items: center;
    }
    #airos-widget-input {
      flex: 1; border: 1px solid #e5e7eb; border-radius: 20px;
      padding: 9px 14px; font-size: 14px; outline: none;
      resize: none; font-family: inherit; direction: inherit;
    }
    #airos-widget-input:focus { border-color: ${COLOR}; }
    #airos-widget-send {
      background: ${COLOR}; border: none; cursor: pointer;
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      transition: opacity .2s; flex-shrink: 0;
    }
    #airos-widget-send:hover { opacity: .85; }
    #airos-widget-send svg { width: 18px; height: 18px; fill: #fff; }
    @media (max-width: 400px) {
      #airos-widget-window { width: calc(100vw - 24px); right: 12px; left: 12px; bottom: 80px; }
    }
  `;
  document.head.appendChild(style);

  // ── DOM ──────────────────────────────────────────────────────────────────
  const btn = document.createElement('button');
  btn.id = 'airos-widget-btn';
  btn.setAttribute('aria-label', 'Open chat');
  btn.innerHTML = `
    <svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>
    <span id="airos-widget-badge"></span>
  `;

  const win = document.createElement('div');
  win.id = 'airos-widget-window';
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-label', 'Chat');
  win.innerHTML = `
    <div id="airos-widget-header">
      <div>
        <div class="title">Chat with us</div>
        <div class="subtitle">We usually reply in minutes</div>
      </div>
    </div>
    <div id="airos-widget-messages"></div>
    <div id="airos-widget-input-row">
      <textarea id="airos-widget-input" rows="1" placeholder="Type a message..."></textarea>
      <button id="airos-widget-send" aria-label="Send">
        <svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
      </button>
    </div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(win);

  const messagesEl = document.getElementById('airos-widget-messages');
  const inputEl    = document.getElementById('airos-widget-input');
  const sendBtn    = document.getElementById('airos-widget-send');
  const badge      = document.getElementById('airos-widget-badge');

  let unreadCount = 0;
  let isOpen = false;
  let socket = null;
  let typingTimeout = null;

  // ── Toggle ───────────────────────────────────────────────────────────────
  btn.addEventListener('click', () => {
    isOpen = !isOpen;
    win.classList.toggle('open', isOpen);
    if (isOpen) {
      unreadCount = 0;
      badge.style.display = 'none';
      badge.textContent = '';
      inputEl.focus();
      if (!socket) connectSocket();
    }
  });

  // ── Keyboard shortcut (Escape) ───────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) { isOpen = false; win.classList.remove('open'); }
  });

  // ── Send ─────────────────────────────────────────────────────────────────
  function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;
    appendMessage(text, 'customer');
    inputEl.value = '';
    autoResize();
    if (socket) socket.emit('customer:message', { content: text, type: 'text' });
  }

  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  inputEl.addEventListener('input', autoResize);

  function autoResize() {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
  }

  // ── Messages ─────────────────────────────────────────────────────────────
  function appendMessage(text, side) {
    const el = document.createElement('div');
    el.className = `airos-msg ${side}`;
    el.textContent = text;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    if (!isOpen && side === 'agent') {
      unreadCount++;
      badge.textContent = unreadCount;
      badge.style.display = 'flex';
    }
  }

  function showTyping() {
    let indicator = document.getElementById('airos-typing');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'airos-typing';
      indicator.className = 'airos-typing';
      indicator.innerHTML = '<span></span><span></span><span></span>';
      messagesEl.appendChild(indicator);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  function hideTyping() {
    const indicator = document.getElementById('airos-typing');
    if (indicator) indicator.remove();
  }

  // ── Socket.io ─────────────────────────────────────────────────────────────
  function connectSocket() {
    // Lazy-load socket.io client from CDN
    const s = document.createElement('script');
    s.src = `${SERVER}/socket.io/socket.io.js`;
    s.onload = () => {
      socket = window.io(SERVER, {
        query: { tenantId: TENANT_ID, sessionId },
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => console.log('[ChatOrAI] connected'));

      socket.on('agent:message', (data) => {
        hideTyping();
        appendMessage(data.content, 'agent');
      });

      socket.on('agent:typing', (data) => {
        if (data.typing) { showTyping(); }
        else { hideTyping(); }
      });

      socket.on('disconnect', () => {
        console.log('[ChatOrAI] disconnected');
        socket = null;
      });
    };
    document.head.appendChild(s);
  }
})();
