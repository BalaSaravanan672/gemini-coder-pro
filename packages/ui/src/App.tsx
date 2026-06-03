import React, { useState, useEffect } from 'react';
import { Box } from 'ink';
import { ChatLog, Message } from './ChatLog.js';
import { PromptInput } from './PromptInput.js';

export interface AppProps {
  orchestrator: any;
}

export function App({ orchestrator }: AppProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [questionResolver, setPendingQuestion] = useState<((val: string) => void) | null>(null);

  useEffect(() => {
    const handleMessage = (text: string) => {
      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
    };
    
    const handleQuestion = (query: string, resolve: (val: string) => void) => {
      setMessages(prev => [...prev, { role: 'assistant', content: query }]);
      setPendingQuestion(() => resolve);
    };

    orchestrator.on('message', handleMessage);
    orchestrator.on('question', handleQuestion);
    
    return () => {
      orchestrator.off('message', handleMessage);
      orchestrator.off('question', handleQuestion);
    };
  }, [orchestrator]);

  const handleSubmit = async (text: string) => {
    if (!text.trim()) return;

    if (questionResolver) {
      setMessages(prev => [...prev, { role: 'user', content: text }]);
      questionResolver(text);
      setPendingQuestion(null);
      return;
    }

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    
    // Process message
    if (text.startsWith('/')) {
      await orchestrator.handleSlashCommand(text);
    } else {
      orchestrator.session.history.push({ role: 'user', parts: [{ text }] });
      await orchestrator.processTurn(0);
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <ChatLog messages={messages} />
      <PromptInput onSubmit={handleSubmit} />
    </Box>
  );
}
