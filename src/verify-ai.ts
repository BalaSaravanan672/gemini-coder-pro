import { model } from './ai.js';
const result = await model.generateContent("Hello, are you ready?");
const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
console.log(text || "No response received.");
