
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Bot, User, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, ParsedDocument } from '../types';
import { createChatSession } from '../services/geminiService';
import { Chat, GenerateContentResponse } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';

interface ChatPanelProps {
  document: ParsedDocument;
  onClose: () => void;
  isOpen: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ document, onClose, isOpen }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Chat Session
  useEffect(() => {
    if (isOpen && !chatSessionRef.current) {
        try {
            chatSessionRef.current = createChatSession(document);
            // Add initial greeting
            setMessages([
                {
                    id: 'init',
                    role: 'model',
                    text: `Hello! I've analyzed **${document.title?.original || 'this document'}**. Ask me anything about specific sections, summaries, or key points.`,
                    timestamp: Date.now()
                }
            ]);
        } catch (e) {
            console.error("Failed to init chat", e);
        }
    }
  }, [isOpen, document]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputValue.trim() || !chatSessionRef.current) return;

    const userText = inputValue;
    setInputValue('');
    
    // Add User Message
    const userMsg: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        text: userText,
        timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
        const streamResult = await chatSessionRef.current.sendMessageStream({ message: userText });
        
        // Add placeholder Model Message
        const modelMsgId = uuidv4();
        setMessages(prev => [...prev, {
            id: modelMsgId,
            role: 'model',
            text: '',
            isStreaming: true,
            timestamp: Date.now()
        }]);

        let accumulatedText = '';
        
        for await (const chunk of streamResult) {
            const c = chunk as GenerateContentResponse;
            const textChunk = c.text || '';
            accumulatedText += textChunk;
            
            setMessages(prev => prev.map(m => 
                m.id === modelMsgId 
                    ? { ...m, text: accumulatedText }
                    : m
            ));
        }
        
        // Finalize
        setMessages(prev => prev.map(m => 
            m.id === modelMsgId 
                ? { ...m, isStreaming: false }
                : m
        ));

    } catch (error) {
        console.error("Chat error", error);
        setMessages(prev => [...prev, {
            id: uuidv4(),
            role: 'model',
            text: "Sorry, I encountered an error responding to that. Please try again.",
            timestamp: Date.now()
        }]);
    } finally {
        setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSend();
      }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-16 right-0 bottom-0 w-full md:w-[400px] bg-white shadow-2xl border-l border-slate-200 z-40 flex flex-col"
        >
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100 bg-slate-50/50 backdrop-blur-sm">
                <div className="flex items-center space-x-2 text-indigo-700">
                    <Sparkles size={18} />
                    <span className="font-bold">Chat Assistant</span>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full">
                    <X size={20} />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                {messages.map((msg) => (
                    <div 
                        key={msg.id} 
                        className={`flex items-start space-x-2 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'}`}>
                            {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                        </div>
                        <div 
                            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
                            ${msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-tr-none' 
                                : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
                            }`}
                        >
                            {msg.role === 'user' ? (
                                msg.text
                            ) : (
                                <div className="prose prose-sm prose-indigo max-w-none dark:prose-invert">
                                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isTyping && messages[messages.length - 1]?.role === 'user' && (
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                            <Bot size={16} className="text-green-600" />
                        </div>
                        <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-none">
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100">
                <div className="relative flex items-end bg-slate-100 rounded-xl border border-transparent focus-within:border-indigo-300 focus-within:bg-white transition-all">
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about the document..."
                        className="w-full bg-transparent border-none focus:ring-0 resize-none py-3 pl-4 pr-12 max-h-32 min-h-[50px] text-sm text-slate-800 placeholder:text-slate-400"
                        rows={1}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isTyping}
                        className="absolute right-2 bottom-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <Send size={16} />
                    </button>
                </div>
                <div className="mt-2 text-center text-[10px] text-slate-400">
                    AI can make mistakes. Check important info.
                </div>
            </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};