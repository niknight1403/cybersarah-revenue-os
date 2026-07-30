/**
 * AI Sales Chat Widget — HTML/JS für Landing Page
 * Floating Chat Button + Overlay
 */
export function chatWidgetHtml(): string {
  return `
<!-- AI Sales Chat Widget -->
<div id="cybersarah-chat" style="position:fixed;bottom:20px;right:20px;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div id="chat-button" style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#a855f7,#06b6d4);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 20px rgba(168,85,247,0.4);transition:transform .2s;font-size:24px;" onclick="toggleChat()">
    💬
  </div>
  <div id="chat-box" style="display:none;position:absolute;bottom:70px;right:0;width:360px;max-width:calc(100vw - 40px);background:#111118;border:1px solid #2a2a3e;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.5);overflow:hidden;">
    <div style="background:linear-gradient(135deg,#1a0a2e,#0d0d1a);padding:16px;border-bottom:1px solid #2a2a3e;display:flex;justify-content:space-between;align-items:center;">
      <div><span style="font-weight:700;color:#f0f0f0;font-size:15px;">🤖 KI Sales Assist</span><br><span style="color:#6b7280;font-size:12px;">Fragen? Kaufberatung? Chatte mit mir!</span></div>
      <span onclick="toggleChat()" style="cursor:pointer;color:#6b7280;font-size:18px;">✕</span>
    </div>
    <div id="chat-messages" style="height:300px;overflow-y:auto;padding:12px;background:#0a0a0f;">
      <div style="margin-bottom:8px;display:flex;">
        <div style="background:#1a1a2e;color:#e0e0e0;padding:10px 14px;border-radius:12px 12px 12px 0;font-size:14px;line-height:1.5;">Hallo! 👋 Ich bin dein KI-Sales-Assistent. Möchtest du mehr über unsere Produkte erfahren oder hast du eine Frage? Ich bin für dich da!</div>
      </div>
    </div>
    <div style="padding:12px;border-top:1px solid #2a2a3e;display:flex;gap:8px;background:#111118;">
      <input id="chat-input" type="text" placeholder="Schreibe eine Nachricht..." style="flex:1;background:#1a1a2e;border:1px solid #2a2a3e;border-radius:8px;padding:10px 14px;color:#e0e0e0;font-size:14px;outline:none;" onkeydown="if(event.key==='Enter')sendChat()">
      <button onclick="sendChat()" style="background:linear-gradient(90deg,#a855f7,#06b6d4);color:#fff;border:none;border-radius:8px;width:40px;height:40px;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;">➤</button>
    </div>
  </div>
</div>
<script>
let chatSession = localStorage.getItem('cybersarah_chat_session');
if (!chatSession) { chatSession = 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2,6); localStorage.setItem('cybersarah_chat_session', chatSession); }
function toggleChat() { const b=document.getElementById('chat-box'); const btn=document.getElementById('chat-button'); const d=b.style.display==='block'; b.style.display=d?'none':'block'; btn.style.display=d?'flex':'none'; }
function sendChat() {
  const input=document.getElementById('chat-input'); const msg=input.value.trim();
  if (!msg) return;
  const msgs=document.getElementById('chat-messages');
  msgs.innerHTML+='<div style="margin-bottom:8px;display:flex;justify-content:flex-end;"><div style="background:linear-gradient(90deg,#a855f7,#06b6d4);color:#fff;padding:10px 14px;border-radius:12px 12px 0 12px;font-size:14px;line-height:1.5;">'+msg.replace(/</g,'&lt;')+'</div></div>';
  msgs.scrollTop=msgs.scrollHeight; input.value=''; input.disabled=true;
  msgs.innerHTML+='<div style="margin-bottom:8px;display:flex;"><div style="background:#1a1a2e;color:#6b7280;padding:10px 14px;border-radius:12px;font-size:14px;">⏳</div></div>';
  fetch('/api/sales-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,sessionId:chatSession})})
  .then(r=>r.json()).then(d=>{
    msgs.removeChild(msgs.lastChild);
    if (d.reply) {
      const formatted=d.reply.replace(/\\n/g,'<br>').replace(/\\[(.*?)\\]\\((.*?)\\)/g,'<a href="$2" target="_blank" style="color:#06b6d4;text-decoration:underline;">$1</a>');
      msgs.innerHTML+='<div style="margin-bottom:8px;display:flex;"><div style="background:#1a1a2e;color:#e0e0e0;padding:10px 14px;border-radius:12px 12px 12px 0;font-size:14px;line-height:1.5;">'+formatted+'</div></div>';
    }
    msgs.scrollTop=msgs.scrollHeight; input.disabled=false; input.focus();
  }).catch(()=>{
    msgs.removeChild(msgs.lastChild);
    msgs.innerHTML+='<div style="margin-bottom:8px;display:flex;"><div style="background:#1a1a2e;color:#e0e0e0;padding:10px 14px;border-radius:12px;font-size:14px;">⚠️ Kurze Störung — bitte erneut versuchen</div></div>';
    input.disabled=false;
  });
}
</script>`;
}


export function systemStatusBadgeHtml(): string {
  return \`<div id="sys-badge" style="position:fixed;top:10px;right:10px;z-index:99997;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div onclick="toggleSysInfo()" style="background:#111118;border:1px solid #2a2a3e;border-radius:20px;padding:4px 12px;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
    <span id="sys-dot" style="width:8px;height:8px;border-radius:50%;background:#22c55e;display:inline-block;"></span>
    <span style="color:#9ca3af;">Live</span>
  </div>
  <div id="sys-info" style="display:none;margin-top:4px;background:#111118;border:1px solid #2a2a3e;border-radius:12px;padding:12px;min-width:200px;font-size:12px;box-shadow:0 4px 20px rgba(0,0,0,0.4);">
    <div style="color:#f0f0f0;font-weight:600;margin-bottom:8px;">🤖 System Status</div>
    <div id="sys-content" style="color:#6b7280;">Lade...</div>
  </div>
</div>
<script>
function toggleSysInfo(){
  var i=document.getElementById('sys-info');
  if(i.style.display==='block'){i.style.display='none';return;}
  i.style.display='block';
  fetch('/api/system-status').then(function(r){return r.json()}).then(function(d){
    var dot=document.getElementById('sys-dot');
    dot.style.background=d.systemGesund?'#22c55e':'#ef4444';
    document.getElementById('sys-content').innerHTML=
      '<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>🤖 Agenten</span><span style="color:#f0f0f0;">'+d.agentenGesamt+'</span></div>'+
      '<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>📊 Erfolgsrate</span><span style="color:#f0f0f0;">'+d.erfolgsrate24h+'%</span></div>'+
      '<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>💚 OpenAI</span><span style="color:'+(d.openaiVerfuegbar?'#22c55e':'#ef4444')+';">'+(d.openaiVerfuegbar?'✅ Live':'❌ Offline')+'</span></div>'+
      '<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>💳 Stripe</span><span style="color:'+(d.stripeLiveKey?'#22c55e':'#ef4444')+';">'+(d.stripeLiveKey?'✅ Live':'❌ Offline')+'</span></div>'+
      '<div style="display:flex;justify-content:space-between;"><span>⚠️ Warnungen</span><span style="color:#f0f0f0;">'+(d.warnungen?.length||0)+'</span></div>'+
      (d.warnungen?.length?'<div style="margin-top:6px;padding-top:6px;border-top:1px solid #2a2a3e;color:#ef4444;font-size:11px;">'+d.warnungen.join('<br>')+'</div>':'');
  }).catch(function(){
    document.getElementById('sys-content').textContent='Offline';
  });
}
setInterval(function(){
  fetch('/api/healthz').then(function(r){return r.json()}).then(function(d){
    var dot=document.getElementById('sys-dot');
    dot.style.background=d.status==='ok'?'#22c55e':'#ef4444';
  }).catch(function(){
    var dot=document.getElementById('sys-dot');
    dot.style.background='#ef4444';
  });
},30000);
</script>\`;
}
