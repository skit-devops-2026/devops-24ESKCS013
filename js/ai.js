/**
 * Student360 — ai.js
 * AI Assistant chat interface + "What if I study?" projector.
 * Phase 2.5: Animated chat entrance, blinking typing indicator, projector progress bars.
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Chat ──────────────────────────────────────────────────────────────── */
  const chatForm    = document.getElementById('chat-form');
  const chatInput   = document.getElementById('chat-input');
  const chatHistory = document.getElementById('chat-history');
  const sendBtn     = document.getElementById('chat-send-btn');

  if (!chatHistory) return;

  /* Mock knowledge base */
  function mockAIReply(userMsg) {
    const m = userMsg.toLowerCase();
    if (m.includes('quiz') || m.includes('question'))
      return 'Here are 3 practice questions based on your current progress:\n\n1. Integrate ∫x·eˣ dx using integration by parts.\n2. State Newton\'s Second Law and give a real-world example.\n3. What is the difference between a stack and a queue?';
    if (m.includes('summar') || m.includes('note'))
      return 'Based on your notes, the key concept is: Integration by Parts follows the formula ∫u dv = uv − ∫v du. Use the LIATE rule to choose u.';
    if (m.includes('plan') || m.includes('study plan'))
      return 'Based on your current schedule, I suggest:\n• Mon–Wed: 1h Calculus review + 30m practice problems\n• Thu–Fri: 1h Physics 101 (you\'re behind here)\n• Weekend: Past paper review for your upcoming midterm.';
    if (m.includes('weak') || m.includes('behind') || m.includes('struggle'))
      return 'Looking at your data, Physics 101 has the lowest engagement — only 42% topic coverage. I recommend dedicating at least 45 minutes daily this week.';
    if (m.includes('score') || m.includes('growth'))
      return 'Your Growth Score is currently 84. The biggest lever you have is completing your pending goal milestones (+14 points potential).';
    return 'I\'m analysing your study history... Based on your recent sessions, you\'ve been most productive on weekday mornings. Try to schedule your hardest tasks then. Is there anything specific I can help with?';
  }

  function appendMessage(text, role) {
    const isAI = role === 'ai';
    const div = document.createElement('div');
    div.className = 'chat-message';
    div.style.cssText = `display:flex;gap:1rem;align-items:flex-start;${isAI ? '' : 'flex-direction:row-reverse;align-self:flex-end;'}`;

    const avatar = document.createElement('div');
    avatar.textContent = isAI ? 'AI' : 'Me';
    avatar.style.cssText = `
      width:32px;height:32px;border-radius:4px;display:flex;align-items:center;
      justify-content:center;flex-shrink:0;font-size:0.75rem;font-weight:600;
      background-color:${isAI ? 'var(--ink)' : 'var(--gold-ink)'};color:var(--paper);
    `;

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.style.cssText = `
      background:${isAI ? 'var(--paper)' : 'var(--paper-raised)'};
      padding:1rem;border-radius:4px;border:1px solid var(--rule);
      white-space:pre-wrap;font-size:0.9rem;line-height:1.6;
      max-width:70%;
    `;
    bubble.textContent = text;

    div.appendChild(avatar);
    div.appendChild(bubble);
    chatHistory.appendChild(div);
    
    // Trigger entrance animation
    requestAnimationFrame(() => {
      div.classList.add('visible');
      chatHistory.scrollTop = chatHistory.scrollHeight;
    });
  }

  function showTypingIndicator() {
    const div = document.createElement('div');
    div.id = 'typing-indicator';
    div.className = 'chat-message';
    div.style.cssText = 'display:flex;gap:1rem;align-items:center;';
    div.innerHTML = `
      <div style="width:32px;height:32px;border-radius:4px;background:var(--ink);color:var(--paper);display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:600;">AI</div>
      <div class="typing-dots">
        <span></span><span></span><span></span>
      </div>
    `;
    chatHistory.appendChild(div);
    
    requestAnimationFrame(() => {
      div.classList.add('visible');
      chatHistory.scrollTop = chatHistory.scrollHeight;
    });
  }

  function removeTypingIndicator() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
  }

  function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = '';
    appendMessage(text, 'user');
    showTypingIndicator();
    sendBtn.disabled = true;

    setTimeout(() => {
      removeTypingIndicator();
      appendMessage(mockAIReply(text), 'ai');
      sendBtn.disabled = false;
    }, 1000 + Math.random() * 800);
  }

  if (chatForm) {
    chatForm.addEventListener('submit', e => { e.preventDefault(); sendMessage(); });
  }
  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
  }
  if (chatInput) {
    chatInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
  }

  /* ── "What if I study?" Projector ────────────────────────────────────────*/
  const projectForm    = document.getElementById('projector-form');
  const projResult     = document.getElementById('projector-result');

  if (projectForm) {
    projectForm.addEventListener('submit', e => {
      e.preventDefault();

      const current   = parseFloat(document.getElementById('proj-current').value)  || 0;
      const minsPerDay= parseFloat(document.getElementById('proj-time').value)     || 0;
      const days      = parseFloat(document.getElementById('proj-days').value)      || 0;

      const totalMins = minsPerDay * days;
      const gain      = Math.min((totalMins / 60) * 0.8, 100 - current);
      const projected = Math.min(Math.round(current + gain), 100);
      const topics    = Math.floor(totalMins / 90);
      const questions = Math.floor(totalMins / 10);

      if (projResult) {
        projResult.innerHTML = `
          <div style="border-top:1px dashed var(--rule-strong);padding-top:1rem;margin-top:1rem;" aria-live="polite">
            <h3 style="font-size:0.875rem;font-weight:600;margin-bottom:0.75rem;">Projected Results</h3>
            
            <div style="margin-bottom: 1rem;">
              <div style="display:flex; justify-content:space-between; font-size:0.875rem; margin-bottom:0.25rem;">
                <span>Progress</span>
                <span class="tabular-nums"><strong>${current}% &rarr; ${projected}%</strong></span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width: ${current}%; background-color: var(--ink-soft); position: absolute; left: 0; top: 0; bottom: 0;"></div>
                <div class="progress-fill" style="width: 0%; left: ${current}%; background-color: var(--gold); position: absolute; top: 0; bottom: 0;" id="projected-gain-bar"></div>
              </div>
            </div>

            <ul style="list-style:none;font-size:0.875rem;">
              <li style="margin-bottom:0.25rem;">New Topics Covered: ~<strong>${topics}</strong></li>
              <li>Questions Completed: ~<strong>${questions}</strong></li>
            </ul>
          </div>`;
          
        // Animate the projected gain bar
        requestAnimationFrame(() => {
          const gainBar = document.getElementById('projected-gain-bar');
          if (gainBar) {
            requestAnimationFrame(() => {
              gainBar.style.width = (projected - current) + '%';
            });
          }
        });
        
        S360.toast('Projection calculated!', 'success');
      }
    });
  }
});
