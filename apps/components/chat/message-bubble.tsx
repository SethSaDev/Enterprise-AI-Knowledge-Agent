'use client';

import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-lg p-3 ${
          message.role === 'user'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
        {message.citations && message.citations.length > 0 && (
          <div className="mt-2 pt-2 border-t text-xs opacity-70">
            <details>
              <summary>Sources ({message.citations.length})</summary>
              {message.citations.map((citation, idx) => (
                <div key={idx} className="mt-1">
                  <p className="font-medium">{citation.documentName}</p>
                  <p className="text-xs">{citation.content.substring(0, 100)}...</p>
                </div>
              ))}
            </details>
          </div>
        )}
        <div className="text-xs mt-1 opacity-50">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
