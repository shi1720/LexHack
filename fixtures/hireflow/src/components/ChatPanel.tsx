'use client';

import { useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatPanel({ requisitionId }: { requisitionId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');

  async function send() {
    const next = [...messages, { role: 'user' as const, content: draft }];
    setMessages(next);
    setDraft('');
    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: next, requisitionId }),
    });
    const reply = await res.text();
    setMessages([...next, { role: 'assistant', content: reply }]);
  }

  return (
    <div className="chat-panel">
      <header>Recruiting copilot</header>
      <ul className="message-list">
        {messages.map((m, i) => (
          <li key={i} className={m.role}>{m.content}</li>
        ))}
      </ul>
      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} />
      <button onClick={send}>Send</button>
    </div>
  );
}
