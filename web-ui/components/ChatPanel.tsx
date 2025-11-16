'use client';

import { useState, useRef, useEffect } from 'react';
import { ContentItem } from '@/types';
import SuggestedQuestions from './SuggestedQuestions';
import FollowUpQuestions from './FollowUpQuestions';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  followUpQuestions?: string[];
}

interface ChatPanelProps {
  items: ContentItem[];
  onClose: () => void;
  onItemSaved?: () => void;
}

export default function ChatPanel({ items, onClose, onItemSaved }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your intelligent Content Saver assistant. I can help you with:\n\n✅ **Analyze** your saved content - Ask me about what you\'ve saved\n✅ **Answer general questions** - I can help with explanations, advice, and more\n✅ **Save** new links and notes automatically\n✅ **Tag** content with smart, relevant tags\n✅ **Remember** context from our conversations\n\n**Try asking:**\n- "What topics do I have saved?" (about your content)\n- "What is machine learning?" (general question)\n- "Save this link: https://example.com" (save content)',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSelectQuestion = (question: string) => {
    setInput(question);
    // Auto-focus the input after selecting
    setTimeout(() => {
      const inputElement = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (inputElement) {
        inputElement.focus();
      }
    }, 0);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // API key is now server-side only (environment variables)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          items: items, // Send all items for context
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.response,
          followUpQuestions: data.followUpQuestions,
        }]);
        
        // If an item was saved, refresh the items list
        if (data.savedItem) {
          // Trigger a refresh by calling parent's loadItems if available
          window.dispatchEvent(new CustomEvent('itemSaved', { detail: data.savedItem }));
          if (onItemSaved) {
            onItemSaved();
          }
        }
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Error: ${data.error || 'Failed to get response'}` 
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: '400px',
      background: '#fff',
      borderLeft: '1px solid #e0e0e0',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      <div style={{
        padding: '1rem 1.5rem',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#f8f9fa',
      }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
          🤖 AI Assistant
        </h2>
        <button
          onClick={onClose}
          style={{
            fontSize: '1.5rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#666',
          }}
        >
          ×
        </button>
      </div>

      {/* Show suggested questions only when there are no user messages yet (except initial assistant message) */}
      {messages.filter(m => m.role === 'user').length === 0 && (
        <SuggestedQuestions
          onSelectQuestion={handleSelectQuestion}
          itemsCount={items.length}
        />
      )}

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div style={{
              maxWidth: '80%',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              background: msg.role === 'user' ? '#0070f3' : '#f0f0f0',
              color: msg.role === 'user' ? 'white' : '#333',
              fontSize: '0.9rem',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {msg.content}
            </div>
            {msg.role === 'assistant' && msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
              <div style={{ width: '80%', marginTop: '8px' }}>
                <FollowUpQuestions
                  questions={msg.followUpQuestions}
                  onSelectQuestion={handleSelectQuestion}
                />
              </div>
            )}
            <span style={{
              fontSize: '0.75rem',
              color: '#999',
              marginTop: '0.25rem',
              padding: '0 0.5rem',
            }}>
              {msg.role === 'user' ? 'You' : 'Assistant'}
            </span>
          </div>
        ))}
        {loading && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
          }}>
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              background: '#f0f0f0',
              fontSize: '0.9rem',
              color: '#666',
            }}>
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} style={{
        padding: '1rem',
        borderTop: '1px solid #e0e0e0',
        background: '#f8f9fa',
      }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your saved content..."
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '0.9rem',
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              padding: '0.75rem 1.5rem',
              background: loading || !input.trim() ? '#ccc' : '#0070f3',
              color: 'white',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

