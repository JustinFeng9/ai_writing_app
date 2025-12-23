import React, { useState, useRef, useEffect } from 'react';
import { SparklesIcon, SendIcon } from './Icons';
import { AIState } from '../types';

interface FloatingMenuProps {
  position: { top: number; left: number } | null;
  onClose: () => void;
  onSubmit: (instruction: string) => void;
  aiState: AIState;
}

const FloatingMenu: React.FC<FloatingMenuProps> = ({ position, onClose, onSubmit, aiState }) => {
  const [instruction, setInstruction] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (position && inputRef.current) {
      inputRef.current.focus();
    }
  }, [position]);

  if (!position) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (instruction.trim()) {
      onSubmit(instruction);
      setInstruction('');
    }
  };

  return (
    <div
      className="fixed z-50 flex flex-col gap-2 bg-white rounded-lg shadow-xl border border-gray-100 p-2 animate-in fade-in zoom-in duration-200"
      style={{
        top: position.top + 40, // Position slightly below selection
        left: Math.min(Math.max(10, position.left - 150), window.innerWidth - 320), // Keep within viewport
        width: '320px'
      }}
    >
      <div className="flex items-center justify-between text-xs text-gray-400 font-medium px-1 mb-1">
        <span className="flex items-center gap-1">
           <SparklesIcon className="w-3 h-3 text-indigo-500" />
           Muse AI
        </span>
        <button onClick={onClose} className="hover:text-gray-600">&times;</button>
      </div>
      
      <form onSubmit={handleSubmit} className="relative">
        <input
          ref={inputRef}
          type="text"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Make it punchier, fix grammar, expand..."
          className="w-full bg-gray-50 border border-gray-200 rounded-md py-2 pl-3 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          disabled={aiState === AIState.THINKING}
        />
        <button
          type="submit"
          disabled={!instruction.trim() || aiState === AIState.THINKING}
          className="absolute right-1.5 top-1.5 p-1 text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-50"
        >
          {aiState === AIState.THINKING ? (
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <SendIcon className="w-4 h-4" />
          )}
        </button>
      </form>
      
      <div className="flex gap-2 mt-1">
        {['Fix grammar', 'Make longer', 'Simplify'].map(preset => (
          <button
            key={preset}
            type="button"
            onClick={() => onSubmit(preset)}
            className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 py-1 px-2 rounded transition-colors"
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FloatingMenu;
