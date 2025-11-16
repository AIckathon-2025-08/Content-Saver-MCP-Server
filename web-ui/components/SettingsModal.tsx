'use client';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '24px',
          width: '90%',
          maxWidth: '500px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600' }}>
          Settings
        </h2>

        <div style={{ marginBottom: '20px' }}>
          <h3
            style={{
              margin: '0 0 12px 0',
              fontSize: '16px',
              fontWeight: '500',
              color: '#333',
            }}
          >
            OpenAI API Key Configuration
          </h3>
          
          <div
            style={{
              padding: '16px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #e9ecef',
            }}
          >
            <p
              style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                color: '#495057',
                lineHeight: '1.6',
              }}
            >
              For security, API keys must be configured server-side using environment variables.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <h4
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#212529',
                }}
              >
                Local Development:
              </h4>
              <ol
                style={{
                  margin: '0 0 0 20px',
                  padding: 0,
                  fontSize: '13px',
                  color: '#495057',
                  lineHeight: '1.8',
                }}
              >
                <li>Create <code style={{ backgroundColor: '#e9ecef', padding: '2px 6px', borderRadius: '3px' }}>.env.local</code> in the <code style={{ backgroundColor: '#e9ecef', padding: '2px 6px', borderRadius: '3px' }}>web-ui</code> directory</li>
                <li>Add: <code style={{ backgroundColor: '#e9ecef', padding: '2px 6px', borderRadius: '3px' }}>OPENAI_API_KEY=your-api-key-here</code></li>
                <li>Restart the development server</li>
              </ol>
            </div>

            <div>
              <h4
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#212529',
                }}
              >
                Production (Vercel):
              </h4>
              <ol
                style={{
                  margin: '0 0 0 20px',
                  padding: 0,
                  fontSize: '13px',
                  color: '#495057',
                  lineHeight: '1.8',
                }}
              >
                <li>Go to your Vercel project dashboard</li>
                <li>Navigate to Settings → Environment Variables</li>
                <li>Add <code style={{ backgroundColor: '#e9ecef', padding: '2px 6px', borderRadius: '3px' }}>OPENAI_API_KEY</code> with your key</li>
                <li>Redeploy your application</li>
              </ol>
            </div>
          </div>

          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '6px',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: '#856404',
                lineHeight: '1.6',
              }}
            >
              <strong>🔒 Security Note:</strong> API keys are never stored in the browser or sent from the client. 
              They are only accessible server-side for maximum security.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
