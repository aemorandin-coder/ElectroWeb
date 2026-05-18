'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiSearch, FiX } from 'react-icons/fi';

const SEARCH_SUGGESTIONS = [
  'Gift Card PlayStation',
  'Control PS5',
  'Gift Card Xbox',
  'Roblox Premium',
  'Control Nintendo Switch',
  'Mantenimiento PC',
];

export default function HomeSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderText, setPlaceholderText] = useState('');
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isFocused) return; // Don't animate while user is typing/focused

    let typingSpeed = isDeleting ? 40 : 80;
    
    const timeout = setTimeout(() => {
      const currentSuggestion = SEARCH_SUGGESTIONS[suggestionIndex];
      
      if (!isDeleting) {
        setPlaceholderText(currentSuggestion.substring(0, placeholderText.length + 1));
        if (placeholderText.length === currentSuggestion.length) {
          typingSpeed = 2000; // Pause before deleting
          setIsDeleting(true);
        }
      } else {
        setPlaceholderText(currentSuggestion.substring(0, placeholderText.length - 1));
        if (placeholderText.length === 0) {
          setIsDeleting(false);
          setSuggestionIndex((prev) => (prev + 1) % SEARCH_SUGGESTIONS.length);
          typingSpeed = 500; // Pause before typing next
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timeout);
  }, [placeholderText, isDeleting, suggestionIndex, isFocused]);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/productos?search=${encodeURIComponent(q)}`);
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-6 mb-2">
      <form onSubmit={handleSearch} className="relative group">
        <div
          className={`flex items-center gap-2 p-1.5 rounded-2xl transition-all duration-500 overflow-hidden ${
            isFocused
              ? 'bg-white/10 ring-4 ring-[#2a63cd]/40 shadow-[0_0_30px_rgba(42,99,205,0.4)]'
              : 'bg-white/5 shadow-2xl backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/20'
          }`}
        >
          <div className="pl-4">
            <FiSearch className={`w-5 h-5 transition-colors duration-300 ${isFocused ? 'text-cyan-400' : 'text-white/50'}`} />
          </div>
          
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={isFocused ? "Escribe lo que buscas..." : `Ej: ${placeholderText}|`}
            className="flex-1 py-3.5 px-2 text-white bg-transparent outline-none placeholder:text-white/40 font-medium tracking-wide"
            style={{ fontSize: '16px' }}
            autoComplete="off"
            autoCorrect="off"
          />
          
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="p-3 text-white/50 hover:text-white transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          )}
          
          <button
            type="submit"
            className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all active:scale-95 flex-shrink-0 shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)]"
          >
            Buscar
          </button>
        </div>
      </form>
    </div>
  );
}
