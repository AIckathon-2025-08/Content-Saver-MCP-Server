'use client';

interface FollowUpQuestionsProps {
  questions: string[];
  onSelectQuestion: (question: string) => void;
}

export default function FollowUpQuestions({ questions, onSelectQuestion }: FollowUpQuestionsProps) {
  if (questions.length === 0) return null;

  return (
    <div style={{
      marginTop: '12px',
      padding: '12px',
      background: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e0e0e0',
    }}>
      <div style={{
        fontSize: '11px',
        fontWeight: '600',
        color: '#666',
        marginBottom: '8px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        💡 Suggested Follow-ups
      </div>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}>
        {questions.map((question, idx) => (
          <button
            key={idx}
            onClick={() => onSelectQuestion(question)}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              background: '#fff',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
              color: '#333',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e8f4f8';
              e.currentTarget.style.borderColor = '#0070f3';
              e.currentTarget.style.transform = 'translateX(4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff';
              e.currentTarget.style.borderColor = '#ddd';
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}

