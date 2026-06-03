import React from 'react';
import { Box, Text } from 'ink';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatLogProps {
  messages: Message[];
}

export function ChatLog({ messages }: ChatLogProps) {
  return (
    <Box flexDirection="column">
      {messages.map((msg, index) => (
        <Box key={index}>
          <Text color={msg.role === 'user' ? 'blue' : 'green'}>
            {msg.role}: {msg.content}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
