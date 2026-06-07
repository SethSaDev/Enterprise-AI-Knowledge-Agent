'use client';

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: Date;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  return (
    <div className="space-y-2">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          onClick={() => onSelect(conv.id)}
          className={`p-3 rounded-lg cursor-pointer transition-colors ${
            selectedId === conv.id
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          }`}
        >
          <p className="font-medium truncate">{conv.title}</p>
          <p className="text-sm truncate opacity-70">{conv.lastMessage}</p>
          <p className="text-xs mt-1 opacity-50">
            {new Date(conv.updatedAt).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}
