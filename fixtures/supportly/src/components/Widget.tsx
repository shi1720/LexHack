'use client';

import { useState } from 'react';

export function SupportWidget({ brand }: { brand: string }) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [draft, setDraft] = useState('');

  async function send() {
    const next = [...messages, { role: 'user', content: draft }];
    setMessages(next);
    setDraft('');
    const res = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ messages: next, brand }) });
    const { reply } = await res.json();
    setMessages([...next, { role: 'assistant', content: reply }]);
  }

  return (
    <div className="supportly-widget">
      <div className="conversation">
        {messages.map((m, i) => (<p key={i} className={m.role}>{m.content}</p>))}
      </div>
      <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask about your order" />
      <button onClick={send}>Send</button>
    </div>
  );
}
