import { useState, useRef, useEffect, useMemo } from 'react';
import type { Topic } from '../../types';
import './AutocompleteInput.css';

interface AutocompleteInputProps {
  topics: Topic[];
  excludeSlugs?: string[];
  placeholder?: string;
  onSelect: (topic: Topic) => void;
}

export function AutocompleteInput({
  topics,
  excludeSlugs = [],
  placeholder = 'Search topics...',
  onSelect,
}: AutocompleteInputProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const excludeSet = useMemo(() => new Set(excludeSlugs), [excludeSlugs]);

  const filteredTopics = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return topics
      .filter(
        (t) =>
          !excludeSet.has(t.url_slug) &&
          (t.display_name.toLowerCase().includes(q) ||
            t.url_slug.toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [topics, query, excludeSet]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [filteredTopics]);

  const handleSelect = (topic: Topic) => {
    onSelect(topic);
    setQuery('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredTopics.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, filteredTopics.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredTopics[highlightIndex]) {
          handleSelect(filteredTopics[highlightIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        listRef.current &&
        !listRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="autocomplete-container">
      <input
        ref={inputRef}
        type="text"
        className="autocomplete-input"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {isOpen && filteredTopics.length > 0 && (
        <div ref={listRef} className="autocomplete-dropdown">
          {filteredTopics.map((topic, index) => (
            <button
              key={topic.url_slug}
              type="button"
              className={`autocomplete-option ${index === highlightIndex ? 'highlighted' : ''}`}
              onClick={() => handleSelect(topic)}
              onMouseEnter={() => setHighlightIndex(index)}
            >
              <span className="option-name">{topic.display_name}</span>
              <span className="option-slug">{topic.url_slug}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
