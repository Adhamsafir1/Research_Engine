import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { SendIcon, SparklesIcon } from './Icons';

export default function ChatPanel({ report }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'I have completed the deep research report. What questions do you have about the findings?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;
    
    const userMessage = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    // Add a temporary assistant message for streaming
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    
    try {
      const response = await fetch('/api/v1/research/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          report: report,
          history: messages.filter(m => m.content !== '') // send previous messages
        })
      });
      
      if (!response.ok) throw new Error('Network response was not ok');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          
          if (trimmed.startsWith('data: ')) {
            try {
              const event = JSON.parse(trimmed.slice(6));
              if (event.type === 'token') {
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1].content += event.content;
                  return newMessages;
                });
              } else if (event.type === 'done') {
                setIsTyping(false);
              } else if (event.type === 'error') {
                console.error('Chat error:', event.message);
                setIsTyping(false);
              }
            } catch (e) {
              console.error('Error parsing SSE:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].content = '**Error:** Could not connect to chat service.';
        return newMessages;
      });
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-panel glass-card">
      <div className="chat-header">
        <SparklesIcon />
        <h3>Follow-up Discussion</h3>
      </div>
      
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message-wrapper ${msg.role}`}>
            <div className={`message-bubble ${msg.role}`}>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {isTyping && messages[messages.length - 1].content === '' && (
          <div className="message-wrapper assistant">
            <div className="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input-container">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about the report..."
          rows="1"
          className="chat-input"
          disabled={isTyping}
        />
        <button 
          className="btn-send-chat" 
          onClick={handleSend}
          disabled={!inputValue.trim() || isTyping}
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
