'use client';

interface SuggestedQuestionsProps {
  onSelectQuestion: (question: string) => void;
  itemsCount: number;
}

export default function SuggestedQuestions({ onSelectQuestion, itemsCount }: SuggestedQuestionsProps) {
  const questions = [
    // About saved content
    {
      category: 'About Your Content',
      items: [
        'What topics do I have saved?',
        'What are my most common tags?',
        'Show me all my links',
        'Show me all my notes',
        'What did I save recently?',
        'Summarize my saved content',
      ],
    },
    // Finding specific items
    {
      category: 'Find Specific Items',
      items: [
        'Do I have anything about Python?',
        'Find items tagged with "learning"',
        'What notes do I have about TypeScript?',
        'Show me links from last week',
      ],
    },
    // General questions
    {
      category: 'General Questions',
      items: [
        'What is machine learning?',
        'Explain how React hooks work',
        'What are the benefits of TypeScript?',
        'How do I learn a new programming language?',
      ],
    },
    // Actions
    {
      category: 'Quick Actions',
      items: [
        'Save this link: https://example.com',
        'Remember that TypeScript is great for type safety',
      ],
    },
  ];

  // Filter out "About Your Content" questions if no items saved
  const filteredQuestions = itemsCount === 0
    ? questions.filter(q => q.category !== 'About Your Content')
    : questions;

  return (
    <div style={{
      padding: '16px',
      borderBottom: '1px solid #e0e0e0',
      maxHeight: '200px',
      overflowY: 'auto',
    }}>
      <div style={{
        fontSize: '12px',
        fontWeight: '600',
        color: '#666',
        marginBottom: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        💡 Suggested Questions
      </div>
      
      {filteredQuestions.map((category, idx) => (
        <div key={idx} style={{ marginBottom: '16px' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: '600',
            color: '#888',
            marginBottom: '8px',
          }}>
            {category.category}
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
          }}>
            {category.items.map((question, qIdx) => (
              <button
                key={qIdx}
                onClick={() => onSelectQuestion(question)}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  background: '#f5f5f5',
                  border: '1px solid #e0e0e0',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  color: '#333',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e8f4f8';
                  e.currentTarget.style.borderColor = '#0070f3';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f5f5f5';
                  e.currentTarget.style.borderColor = '#e0e0e0';
                }}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

