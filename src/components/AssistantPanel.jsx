import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Send, ChevronUp, ChevronDown, Reply, ThumbsUp, ThumbsDown } from 'lucide-react';
import { geminiApi } from '../services/geminiApi.js';
import { MESSAGE_TYPES, ASSISTANT_MODES } from '../utils/constants.js';
import { generateId } from '../utils/helpers.js';

const AssistantPanel = forwardRef(({ onNewFeed, onUserPreference, onRecommendation }, ref) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState(ASSISTANT_MODES.CHAT);
  const [commentContext, setCommentContext] = useState(null);
  const [replyContext, setReplyContext] = useState(null);
  const [isCommentsCollapsed, setIsCommentsCollapsed] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [lastIntent, setLastIntent] = useState(null);
  const chatEndRef = useRef(null);
  const welcomeShownRef = useRef(false);

  const addMessage = (message) => {
    setMessages(prev => [...prev, { ...message, id: generateId() }]);
  };

  const showWelcomeMessage = () => {
    const welcomeHTML = `
<strong class="text-rose-300">Welcome to Nexus!</strong> I'm your intelligent AI assistant with <strong>advanced recommendation algorithms powered by a real database!</strong> Here's how I work:<br/><br/>
<ul class="list-none p-0 m-0 space-y-2">
  <li class="flex items-start"><span class="mr-2">🧠</span><div><strong>Smart Detection:</strong> I automatically understand if you want to search for videos or just chat!</div></li>
  <li class="flex items-start"><span class="mr-2">🔍</span><div><strong>Auto Search:</strong> Say "show me cooking videos" and I'll search automatically.</div></li>
  <li class="flex items-start"><span class="mr-2">❤️</span><div><strong>Opinion Learning:</strong> Tell me what you like/dislike and I'll learn your preferences!</div></li>
  <li class="flex items-start"><span class="mr-2">🎯</span><div><strong>AI Recommendations:</strong> I use <strong>collaborative filtering</strong>, <strong>content-based filtering</strong>, and <strong>hybrid algorithms</strong> with real user data!</div></li>
  <li class="flex items-start"><span class="mr-2">📊</span><div><strong>Database Powered:</strong> I analyze real trending videos from a PostgreSQL database with advanced similarity metrics!</div></li>
  <li class="flex items-start"><span class="mr-2">⚡</span><div><strong>Real-time Learning:</strong> Every interaction improves your recommendations instantly!</div></li>
  <li class="flex items-start"><span class="mr-2">💬</span><div><strong>Unified Chat:</strong> Just talk to me naturally - I'll understand what you need and help accordingly!</div></li>
</ul><br/>
<strong class="text-rose-300">Just chat naturally with me:</strong><br/>
• "Show me trending videos"<br/>
• "Find me funny cat videos"<br/>
• "I love cooking shows"<br/>
• "Get me AI recommendations"<br/>
• "What's the weather like?"<br/>
• "Tell me a joke"<br/>
• "Find videos similar to what I like"<br/>
• "Show me popular content"`;
    addMessage({ sender: MESSAGE_TYPES.AGENT, text: welcomeHTML, isHTML: true });
  };

  useEffect(() => {
    if (messages.length === 0 && !welcomeShownRef.current) {
      showWelcomeMessage();
      welcomeShownRef.current = true;
    }
  }, [messages.length]);
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    addMessage({ sender: MESSAGE_TYPES.USER, text: inputValue });
    setIsLoading(true);
    const currentInput = inputValue;
    setInputValue('');
    
    const controller = new AbortController();

    try {
      if (mode === ASSISTANT_MODES.CHAT) {
        // Detect user intent first
        const intent = await geminiApi.detectIntent(currentInput, controller.signal);
        setLastIntent(intent);
        
        let aiResponse;
        
        if (intent.intent === 'search' && intent.confidence > 0.7) {
          // User wants to search for videos
          aiResponse = await geminiApi.generateSearchResponse(currentInput, controller.signal);
          addMessage({ sender: MESSAGE_TYPES.AGENT, text: aiResponse });
          
          // Trigger video search with extracted query
          const searchQuery = intent.searchQuery || currentInput;
          onNewFeed(searchQuery);
          
        } else if (intent.intent === 'opinion' && intent.confidence > 0.7) {
          // User is expressing opinion about videos
          aiResponse = await geminiApi.generateContent(
            `The user is expressing their opinion about videos. They said: "${currentInput}". 
            Respond in a friendly way, acknowledging their preference and offering to help them find more content they might like.`,
            controller.signal
          );
          addMessage({ sender: MESSAGE_TYPES.AGENT, text: aiResponse, intent: intent });
          
          // Trigger recommendation algorithm
          if (onUserPreference) {
            onUserPreference({
              sentiment: intent.sentiment,
              topic: intent.videoTopic,
              message: currentInput
            });
          }
          
        } else {
          // Normal chat
          aiResponse = await geminiApi.generateContent(currentInput, controller.signal);
          addMessage({ sender: MESSAGE_TYPES.AGENT, text: aiResponse });
        }

      } else { // mode === 'comments'
        let result;
        if (replyContext) {
          result = await geminiApi.generateCommentReply(replyContext, currentInput, controller.signal);
        } else {
          const commentTexts = commentContext.comments.map(c => `- ${c.text}`).join('\n');
          const prompt = `You are a helpful assistant for video creators. A user wants you to perform an action or draft a reply based on the following instruction: "${currentInput}". The original comments for context are:\n${commentTexts}\n\nDraft a suitable and friendly reply or perform the requested action based on the user's instruction.`;
          result = await geminiApi.generateContent(prompt, controller.signal);
        }
        addMessage({ sender: MESSAGE_TYPES.AGENT, text: result });
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        addMessage({ sender: MESSAGE_TYPES.AGENT, text: "Sorry, I'm having trouble connecting right now." });
        console.error("API Error:", error);
      }
    } finally {
      setIsLoading(false);
      setReplyContext(null);
    }
  };
  
  const handleGenericAction = async (promptGenerator) => {
    setIsLoading(true);
    const controller = new AbortController();
    try {
      const prompt = promptGenerator();
      if (!prompt) {
        setIsLoading(false);
        return;
      }
      const result = await geminiApi.generateContent(prompt, controller.signal);
      addMessage({ sender: MESSAGE_TYPES.AGENT, text: result });
    } catch (error) {
      if (error.name !== 'AbortError') {
        addMessage({ sender: MESSAGE_TYPES.AGENT, text: "Sorry, I couldn't complete that action." });
        console.error("Action Error:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAnalyzeComments = () => {
    handleGenericAction(() => {
      if (!commentContext) return null;
      return geminiApi.analyzeComments(commentContext.comments);
    });
  };
  
  const handleProofread = () => {
    handleGenericAction(() => {
      const lastAgentMessage = messages.slice().reverse().find(m => m.sender === MESSAGE_TYPES.AGENT);
      if (!lastAgentMessage) return null;
      return geminiApi.proofreadText(lastAgentMessage.text);
    });
  };

  const handleRewrite = () => {
    handleGenericAction(() => {
      const lastAgentMessage = messages.slice().reverse().find(m => m.sender === MESSAGE_TYPES.AGENT);
      if (!lastAgentMessage) return null;
      return geminiApi.rewriteText(lastAgentMessage.text);
    });
  };


  const handlePreferenceAction = (action, intent) => {
    if (onUserPreference) {
      onUserPreference({
        action: action, // 'like' or 'dislike'
        sentiment: intent.sentiment,
        topic: intent.videoTopic,
        message: intent.message || 'User preference action'
      });
    }
    
    // Show feedback
    addMessage({
      type: MESSAGE_TYPES.SYSTEM, 
      text: `Preference recorded: ${action} for ${intent.videoTopic || 'this content'}`, 
      collapsible: false
    });
  };



  useImperativeHandle(ref, () => ({
    loadComments(video, comments) {
      setMode(ASSISTANT_MODES.COMMENTS);
      setCommentContext({ video, comments });
      setIsCommentsCollapsed(false);
      const introMessage = { type: MESSAGE_TYPES.SYSTEM, text: `Showing comments for "${video.caption}"`, id: `system-${video.id}-${Date.now()}` };
      const commentMessages = comments.map(c => ({ ...c, type: MESSAGE_TYPES.COMMENT, collapsible: true, id: `comment-${video.id}-${c.id}` }));
      setMessages(prev => [...prev, introMessage, ...commentMessages]);
    },
    runSmartRecommend(playlist) {
      handleGenericAction(() => geminiApi.generateSmartRecommendations(playlist));
    }
  }));
  
  const renderMessage = (msg) => {
    if (msg.collapsible && isCommentsCollapsed) {
      return null;
    }

    switch(msg.type) {
      case MESSAGE_TYPES.SYSTEM:
        return (
          <div key={msg.id} className="text-center text-xs text-gray-400 py-2 my-2 border-t border-b border-white/10 flex justify-center items-center gap-2">
            <span>{msg.text}</span>
            {msg.collapsible !== false && <button onClick={() => setIsCommentsCollapsed(prev => !prev)} className="text-gray-400 hover:text-white">
              {isCommentsCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>}
          </div>
        );
      case MESSAGE_TYPES.COMMENT:
        return (
          <div key={msg.id} className="flex items-start my-3 group">
            <div className="flex-1">
              <p className="text-xs text-gray-400">{msg.user} <span className="ml-1">{msg.handle}</span></p>
              <p className="text-sm">{msg.text}</p>
            </div>
            <button onClick={() => setReplyContext(msg)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white ml-2">
              <Reply size={16} />
            </button>
          </div>
        );
      default:
        return msg.sender === MESSAGE_TYPES.AGENT ? (
           <div key={msg.id} className="my-3">
              <div>
                <div className="font-bold text-sm text-rose-400 mb-1">Nexus</div>
                <div className="p-3 rounded-xl max-w-xs text-sm prose prose-invert prose-sm text-gray-200 bg-dark-soft-800/60 rounded-bl-none" dangerouslySetInnerHTML={{ __html: msg.isHTML ? msg.text : msg.text.replace(/\n/g, '<br />') }} />
                {msg.intent && msg.intent.intent === 'opinion' && (
                  <div className="flex items-center gap-2 mt-2">
                    <button 
                      onClick={() => handlePreferenceAction('like', msg.intent)}
                      className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors bg-dark-soft-800/70 rounded-full px-2 py-1"
                    >
                      <ThumbsUp size={12} />
                      Like
                    </button>
                    <button 
                      onClick={() => handlePreferenceAction('dislike', msg.intent)}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors bg-dark-soft-800/70 rounded-full px-2 py-1"
                    >
                      <ThumbsDown size={12} />
                      Dislike
                    </button>
                  </div>
                )}
              </div>
          </div>
        ) : (
          <div key={msg.id} className="flex items-start gap-2.5 my-3 justify-end">
            <div className="p-3 rounded-xl max-w-xs text-sm prose prose-invert prose-sm text-gray-200 bg-rose-500/80 rounded-br-none" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />') }} />
          </div>
        );
    }
  };
  
  const getPlaceholderText = () => {
    if (mode === ASSISTANT_MODES.COMMENTS) {
      if (replyContext) {
        return `Replying to ${replyContext.user}...`;
      }
      return 'Instruct AI about comments...';
    }
    return 'Chat with me...';
  }

  return (
    <div className="w-full md:w-1/3 h-full bg-dark-soft-900/80 backdrop-blur-xl border-r border-white/10 flex flex-col p-4 relative">
      <div className="flex-1 overflow-y-auto pb-16 -mr-4 pr-4 auto-hide-scrollbar" onClick={() => isInputFocused && setIsInputFocused(false)}>
        {messages.map((msg) => renderMessage(msg))}
         {isLoading && 
            <div className="my-3">
              <div>
                <div className="font-bold text-sm text-rose-400 mb-1">Nexus</div>
                <div className="p-3 rounded-xl bg-dark-soft-800/60 rounded-bl-none">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-rose-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-rose-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 bg-rose-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                  </div>
                </div>
              </div>
            </div>
         }
        <div ref={chatEndRef} />
      </div>
      
      <div className="absolute bottom-4 left-4 right-4">
        <div className="absolute bottom-14 right-0 flex items-center gap-2">
          {mode === ASSISTANT_MODES.COMMENTS && !isInputFocused && (
            <button onClick={handleAnalyzeComments} disabled={isLoading} className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors disabled:text-gray-500 bg-dark-soft-800/80 backdrop-blur-lg rounded-full px-3 py-1.5 animate-fade-in">Summarize</button>
          )}
          {mode === ASSISTANT_MODES.COMMENTS && isInputFocused && (
            <>
              <button onClick={handleProofread} disabled={isLoading} className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors disabled:text-gray-500 bg-dark-soft-800/80 backdrop-blur-lg rounded-full px-3 py-1.5 animate-fade-in">Proofread</button>
              <button onClick={handleRewrite} disabled={isLoading} className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors disabled:text-gray-500 bg-dark-soft-800/80 backdrop-blur-lg rounded-full px-3 py-1.5 animate-fade-in">Rewrite</button>
            </>
          )}
        </div>
        <div className="relative flex items-center mt-4">
          <input 
            type="text" 
            value={inputValue} 
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsInputFocused(true)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()} 
            placeholder={getPlaceholderText()} 
            className="w-full bg-dark-soft-800/70 border border-white/20 rounded-lg py-2 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-rose-500" 
          />
          <button onClick={handleSend} disabled={isLoading} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors disabled:text-gray-600"><Send size={18} /></button>
        </div>
      </div>
    </div>
  );
});

AssistantPanel.displayName = 'AssistantPanel';

export default AssistantPanel;
