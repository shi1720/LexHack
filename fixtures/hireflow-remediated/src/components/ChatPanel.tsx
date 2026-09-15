'use client';

import { useState } from 'react';
import { disclosureFor } from '../../lib/ai-act/disclosure';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatPanel({ requisitionId, locale = 'en' }: { requisitionId: string; locale?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');

  async function send() {
    const next = [...messages, { role: 'user' as const, content: draft }];
    setMessages(next);
    setDraft('');
    const res = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ messages: next, requisitionId }) });
    setMessages([...next, { role: 'assistant', content: await res.text() }]);
  }

  return (
    <div className="chat-panel">
      <header>Recruiting copilot</header>
      {/* Article 50(1): disclosed before the first interaction, above the thread. */}
      <p role="status" className="ai-disclosure" data-ai-disclosure="art50-1">
        {disclosureFor(locale)}
      </p>
      <ul className="message-list">
        {messages.map((m, i) => (<li key={i} className={m.role}>{m.content}</li>))}
      </ul>
      <label htmlFor="draft">Ask about this requisition</label>
      <textarea id="draft" value={draft} onChange={(e) => setDraft(e.target.value)} />
      <button onClick={send}>Send</button>
    </div>
  );
}
