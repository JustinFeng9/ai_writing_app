import React, { useState, useRef, useEffect, useCallback } from 'react';
import { generateDraft, refineSelection, analyzeContentForSuggestions } from './services/geminiService';
import { Suggestion, AIState, Attachment, EditorSelection } from './types';
import FloatingMenu from './components/FloatingMenu';
import { SparklesIcon, BoltIcon, PaperClipIcon, ArrowPathIcon, LightBulbIcon } from './components/Icons';

function App() {
  const [content, setContent] = useState<string>("Welcome to Muse. Start writing, or ask AI to draft something for you...");
  const [title, setTitle] = useState("Untitled Draft");
  const [aiState, setAiState] = useState<AIState>(AIState.IDLE);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDraftPanel, setShowDraftPanel] = useState(true);
  
  // Drafting State
  const [draftPrompt, setDraftPrompt] = useState("");
  const [draftFiles, setDraftFiles] = useState<Attachment[]>([]);
  
  // Selection State
  const [selection, setSelection] = useState<EditorSelection | null>(null);
  const [menuPosition, setMenuPosition] = useState<{top: number, left: number} | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- File Handling ---
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newAttachments: Attachment[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const reader = new FileReader();
        
        await new Promise<void>((resolve) => {
          reader.onload = (ev) => {
            if (ev.target?.result) {
              newAttachments.push({
                name: file.name,
                mimeType: file.type,
                data: ev.target.result as string
              });
            }
            resolve();
          };
          reader.readAsDataURL(file);
        });
      }
      setDraftFiles(prev => [...prev, ...newAttachments]);
    }
  };

  // --- AI Drafting ---
  const handleDraftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftPrompt.trim()) return;

    setAiState(AIState.THINKING);
    try {
      const generatedText = await generateDraft(draftPrompt, draftFiles);
      if (content.length < 50) {
          setContent(generatedText);
      } else {
          setContent(prev => prev + "\n\n" + generatedText);
      }
      setDraftPrompt("");
      setDraftFiles([]);
      setShowDraftPanel(false);
      // Trigger a proactive analysis after a draft
      setTimeout(() => triggerProactiveAnalysis(generatedText), 1000);
    } catch (err) {
      console.error(err);
      alert("Failed to generate draft. Check API key or connection.");
    } finally {
      setAiState(AIState.IDLE);
    }
  };

  // --- Inline Refinement ---
  const handleSelectionChange = () => {
    const el = textareaRef.current;
    if (!el) return;

    if (el.selectionStart !== el.selectionEnd) {
      const text = el.value.substring(el.selectionStart, el.selectionEnd);
      
      // Calculate position for floating menu
      // Note: Textarea coordinates are tricky. We use a rough estimation or a library usually. 
      // For this simplified version without dependencies, we'll position centered at bottom of viewport if mobile,
      // or try to follow cursor broadly. 
      // Better approach: Use getBoundingClientRect of the textarea, but that doesn't give cursor X/Y.
      // We will fallback to a "Mouse Up" event for positioning.
    } else {
      setSelection(null);
      setMenuPosition(null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const el = textareaRef.current;
    if (!el) return;
    
    if (el.selectionStart !== el.selectionEnd) {
       const text = el.value.substring(el.selectionStart, el.selectionEnd);
       setSelection({
         start: el.selectionStart,
         end: el.selectionEnd,
         text
       });
       // Position menu near mouse click
       setMenuPosition({ top: e.clientY, left: e.clientX });
    }
  };

  const handleInlineRefinement = async (instruction: string) => {
    if (!selection) return;

    setAiState(AIState.THINKING);
    try {
      const newText = await refineSelection(selection.text, content, instruction);
      
      // Replace text in content
      const before = content.substring(0, selection.start);
      const after = content.substring(selection.end);
      const updatedContent = before + newText + after;
      
      setContent(updatedContent);
      setSelection(null);
      setMenuPosition(null);
    } catch (err) {
      console.error(err);
    } finally {
      setAiState(AIState.IDLE);
    }
  };

  // --- Proactive Analysis ---
  const triggerProactiveAnalysis = useCallback(async (textToAnalyze: string) => {
    // Only analyze if content is substantial and we aren't already doing something
    if (textToAnalyze.length < 100 || aiState !== AIState.IDLE) return;

    // Silent background analysis
    try {
      const newSuggestions = await analyzeContentForSuggestions(textToAnalyze);
      setSuggestions(newSuggestions);
    } catch (e) {
      // Ignore background errors
    }
  }, [aiState]);

  // Debounced analysis effect
  useEffect(() => {
    const timer = setTimeout(() => {
      triggerProactiveAnalysis(content);
    }, 5000); // Analyze 5 seconds after typing stops

    return () => clearTimeout(timer);
  }, [content, triggerProactiveAnalysis]);


  return (
    <div className="flex h-screen w-full bg-[#f3f4f6] overflow-hidden font-sans">
      
      {/* Left Sidebar - Drafting & Context */}
      <div className={`flex-shrink-0 bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${showDraftPanel ? 'w-80' : 'w-0 overflow-hidden'}`}>
        <div className="h-full flex flex-col p-4 w-80">
          <div className="flex items-center gap-2 mb-6 text-indigo-600">
            <SparklesIcon className="w-6 h-6" />
            <h1 className="font-bold text-lg tracking-tight">Muse</h1>
          </div>

          <div className="flex-1 overflow-y-auto">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Drafting Partner</h2>
            <form onSubmit={handleDraftSubmit} className="flex flex-col gap-3">
              <div className="relative">
                <textarea
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none h-32"
                  placeholder="What should we write today? Describe the tone, audience, and key points..."
                  value={draftPrompt}
                  onChange={(e) => setDraftPrompt(e.target.value)}
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                 {draftFiles.map((f, i) => (
                   <div key={i} className="text-xs bg-gray-100 px-2 py-1 rounded-full flex items-center gap-1 max-w-full truncate">
                      <PaperClipIcon className="w-3 h-3" />
                      <span className="truncate">{f.name}</span>
                   </div>
                 ))}
              </div>

              <div className="flex items-center justify-between mt-1">
                <label className="cursor-pointer text-gray-500 hover:text-indigo-600 transition-colors p-2 rounded-full hover:bg-gray-100">
                  <input type="file" multiple className="hidden" onChange={handleFileSelect} />
                  <PaperClipIcon className="w-5 h-5" />
                </label>
                <button 
                  type="submit" 
                  disabled={aiState !== AIState.IDLE || !draftPrompt}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {aiState === AIState.THINKING ? 'Working...' : 'Draft'}
                  <BoltIcon className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="mt-8 border-t border-gray-100 pt-6">
               <div className="flex items-center justify-between mb-3">
                 <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Suggestions</h2>
                 {aiState === AIState.THINKING && <span className="text-[10px] text-indigo-500 animate-pulse">Analyzing...</span>}
               </div>
               
               <div className="space-y-3">
                  {suggestions.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Start writing to get proactive feedback...</p>
                  ) : (
                    suggestions.map(s => (
                      <div key={s.id} className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-sm">
                        <div className="flex items-center gap-2 mb-1 text-orange-700 font-medium text-xs uppercase">
                          <LightBulbIcon className="w-3 h-3" />
                          {s.type}
                        </div>
                        <p className="font-medium text-gray-800 mb-1">{s.text}</p>
                        <p className="text-gray-600 text-xs leading-relaxed">{s.explanation}</p>
                      </div>
                    ))
                  )}
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative h-full">
        {/* Toggle Sidebar Button (if hidden) */}
        {!showDraftPanel && (
           <button 
             onClick={() => setShowDraftPanel(true)}
             className="absolute top-4 left-4 p-2 bg-white shadow rounded-full z-10 hover:bg-gray-50 text-gray-500"
           >
             <SparklesIcon className="w-5 h-5" />
           </button>
        )}

        {/* Toolbar / Header */}
        <header className="h-14 bg-white/80 backdrop-blur border-b border-gray-200 flex items-center justify-between px-8 flex-shrink-0 z-10">
           <div className="flex items-center gap-4">
              {showDraftPanel && (
                <button onClick={() => setShowDraftPanel(false)} className="text-gray-400 hover:text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
              <input 
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                className="bg-transparent font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1"
              />
           </div>
           
           <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                {aiState === AIState.THINKING ? 'AI is thinking...' : 'AI Ready'}
              </span>
              <div className={`w-2 h-2 rounded-full ${aiState === AIState.THINKING ? 'bg-indigo-500 animate-pulse' : 'bg-green-400'}`}></div>
           </div>
        </header>

        {/* Editor Surface */}
        <main className="flex-1 overflow-y-auto bg-paper relative flex justify-center" onClick={() => {
           // Close floating menu if clicking outside selection
           if (!window.getSelection()?.toString()) {
             setMenuPosition(null);
             setSelection(null);
           }
        }}>
           <div className="w-full max-w-3xl py-12 px-8 min-h-[calc(100vh-4rem)]">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onSelect={handleSelectionChange}
                onMouseUp={handleMouseUp}
                className="w-full h-full min-h-[80vh] bg-transparent border-none outline-none resize-none text-lg leading-relaxed font-serif text-ink placeholder-gray-300"
                placeholder="Start writing..."
                spellCheck={false}
              />
           </div>
        </main>
        
        {/* Floating AI Menu */}
        <FloatingMenu 
          position={menuPosition} 
          onClose={() => { setMenuPosition(null); setSelection(null); }}
          onSubmit={handleInlineRefinement}
          aiState={aiState}
        />
      </div>
    </div>
  );
}

export default App;
