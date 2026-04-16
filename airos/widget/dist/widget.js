(()=>{(function(){"use strict";let i=document.currentScript||document.querySelector("script[data-tenant]"),f=i&&i.getAttribute("data-tenant"),m=i&&i.getAttribute("data-server")||"https://api.chatorai.com",r=i&&i.getAttribute("data-color")||"#2563EB",h=i&&i.getAttribute("data-position")||"bottom-right";if(!f){console.warn("[ChatOrAI] data-tenant missing");return}let w=`airos_session_${f}`,c=localStorage.getItem(w);c||(c="sess_"+Math.random().toString(36).slice(2)+Date.now().toString(36),localStorage.setItem(w,c));let l=document.documentElement.dir==="rtl"||["ar","he","fa","ur"].some(e=>navigator.language?.startsWith(e)),b=document.createElement("style");b.textContent=`
    #airos-widget-btn {
      position: fixed;
      ${h.includes("right")?"right:20px":"left:20px"};
      bottom: 20px;
      width: 56px; height: 56px;
      background: ${r};
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
      ${h.includes("right")?"right:20px":"left:20px"};
      bottom: 90px;
      width: 360px; max-height: 580px;
      background: #fff; border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0,0,0,.18);
      display: none; flex-direction: column;
      z-index: 2147483645;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      overflow: hidden;
      direction: ${l?"rtl":"ltr"};
    }
    #airos-widget-window.open { display: flex; }
    #airos-widget-header {
      background: ${r}; color: #fff;
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
      background: ${r}; color: #fff;
      align-self: ${l?"flex-start":"flex-end"};
      border-bottom-${l?"left":"right"}-radius: 2px;
    }
    .airos-msg.agent {
      background: #fff; color: #111;
      align-self: ${l?"flex-end":"flex-start"};
      border-bottom-${l?"right":"left"}-radius: 2px;
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
    #airos-widget-input:focus { border-color: ${r}; }
    #airos-widget-send {
      background: ${r}; border: none; cursor: pointer;
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      transition: opacity .2s; flex-shrink: 0;
    }
    #airos-widget-send:hover { opacity: .85; }
    #airos-widget-send svg { width: 18px; height: 18px; fill: #fff; }
    @media (max-width: 400px) {
      #airos-widget-window { width: calc(100vw - 24px); right: 12px; left: 12px; bottom: 80px; }
    }
  `,document.head.appendChild(b);let p=document.createElement("button");p.id="airos-widget-btn",p.setAttribute("aria-label","Open chat"),p.innerHTML=`
    <svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>
    <span id="airos-widget-badge"></span>
  `;let o=document.createElement("div");o.id="airos-widget-window",o.setAttribute("role","dialog"),o.setAttribute("aria-label","Chat"),o.innerHTML=`
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
  `,document.body.appendChild(p),document.body.appendChild(o);let s=document.getElementById("airos-widget-messages"),n=document.getElementById("airos-widget-input"),I=document.getElementById("airos-widget-send"),g=document.getElementById("airos-widget-badge"),u=0,a=!1,t=null,$=null;p.addEventListener("click",()=>{a=!a,o.classList.toggle("open",a),a&&(u=0,g.style.display="none",g.textContent="",n.focus(),t||S())}),document.addEventListener("keydown",e=>{e.key==="Escape"&&a&&(a=!1,o.classList.remove("open"))});function y(){let e=n.value.trim();e&&(E(e,"customer"),n.value="",v(),t&&t.emit("customer:message",{content:e,type:"text"}))}I.addEventListener("click",y),n.addEventListener("keydown",e=>{e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),y())}),n.addEventListener("input",v);function v(){n.style.height="auto",n.style.height=Math.min(n.scrollHeight,100)+"px"}function E(e,d){let x=document.createElement("div");x.className=`airos-msg ${d}`,x.textContent=e,s.appendChild(x),s.scrollTop=s.scrollHeight,!a&&d==="agent"&&(u++,g.textContent=u,g.style.display="flex")}function C(){let e=document.getElementById("airos-typing");e||(e=document.createElement("div"),e.id="airos-typing",e.className="airos-typing",e.innerHTML="<span></span><span></span><span></span>",s.appendChild(e),s.scrollTop=s.scrollHeight)}function k(){let e=document.getElementById("airos-typing");e&&e.remove()}function S(){let e=document.createElement("script");e.src=`${m}/socket.io/socket.io.js`,e.onload=()=>{t=window.io(m,{query:{tenantId:f,sessionId:c},transports:["websocket","polling"]}),t.on("connect",()=>console.log("[ChatOrAI] connected")),t.on("agent:message",d=>{k(),E(d.content,"agent")}),t.on("agent:typing",d=>{d.typing?C():k()}),t.on("disconnect",()=>{console.log("[ChatOrAI] disconnected"),t=null})},document.head.appendChild(e)}})();})();
