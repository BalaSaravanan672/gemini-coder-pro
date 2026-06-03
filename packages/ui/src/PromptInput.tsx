import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

export interface PromptInputProps {
  onSubmit: (text: string) => void;
}

export function PromptInput({ onSubmit }: PromptInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (text: string) => {
    onSubmit(text);
    setValue('');
  };

  return (
    <Box>
      <Text color="cyan">❯ </Text>
      <TextInput
        value={value}
        onChange={setValue}
        onSubmit={handleSubmit}
      />
    </Box>
  );
}
