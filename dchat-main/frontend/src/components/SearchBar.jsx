/**
 * Search Bar Component
 * 
 * Universal search bar with autocomplete suggestions.
 * Integrates with SearchService for full-text search.
 * 
 * Features:
 * - Real-time search suggestions
 * - Search history
 * - Advanced filters
 * - Keyboard navigation
 * 
 * @author Manus AI
 * @date 2024-11-05
 */

import React, { useState, useEffect, useRef } from 'react';
import searchService from '../services/SearchService';

const SearchBar = ({ onSearch, placeholder = 'Search messages, users...', autoFocus = false }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceTimer = useRef(null);
  
  useEffect(() => {
    // Load search history
    loadSearchHistory();
    
    // Focus input if autoFocus
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
    
    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [autoFocus]);
  
  useEffect(() => {
    // Handle click outside to close suggestions
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const loadSearchHistory = async () => {
    try {
      const history = await searchService.getHistory(10);
      setSearchHistory(history);
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };
  
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
    
    // Debounce suggestions
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    if (value.length >= 2) {
      debounceTimer.current = setTimeout(() => {
        loadSuggestions(value);
      }, 300);
    } else if (value.length === 0) {
      // Show search history when input is empty
      setSuggestions(searchHistory.map(h => h.query));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };
  
  const loadSuggestions = async (searchQuery) => {
    try {
      setIsLoading(true);
      const results = await searchService.getSuggestions(searchQuery, 10);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSearch = (searchQuery = query) => {
    if (!searchQuery.trim()) {
      return;
    }
    
    setShowSuggestions(false);
    
    if (onSearch) {
      onSearch(searchQuery.trim());
    }
    
    // Reload history after search
    setTimeout(() => {
      loadSearchHistory();
    }, 500);
  };
  
  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };
  
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch();
      }
      return;
    }
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else {
          handleSearch();
        }
        break;
      
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      
      default:
        break;
    }
  };
  
  const handleClearHistory = async () => {
    try {
      await searchService.clearHistory();
      setSearchHistory([]);
      setSuggestions([]);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };
  
  const handleFocus = () => {
    if (query.length === 0 && searchHistory.length > 0) {
      setSuggestions(searchHistory.map(h => h.query));
      setShowSuggestions(true);
    } else if (query.length >= 2) {
      setShowSuggestions(suggestions.length > 0);
    }
  };
  
  return (
    <div className="search-bar-container">
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
        />
        {query && (
          <button
            className="clear-button"
            onClick={() => {
              setQuery('');
              setSuggestions([]);
              setShowSuggestions(false);
              if (inputRef.current) {
                inputRef.current.focus();
              }
            }}
            title="Clear"
          >
            ✕
          </button>
        )}
        {isLoading && (
          <span className="loading-spinner">⏳</span>
        )}
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div ref={suggestionsRef} className="suggestions-dropdown">
          {query.length === 0 && searchHistory.length > 0 && (
            <div className="suggestions-header">
              <span>Recent Searches</span>
              <button
                className="clear-history-button"
                onClick={handleClearHistory}
              >
                Clear
              </button>
            </div>
          )}
          
          <ul className="suggestions-list">
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="suggestion-icon">
                  {query.length === 0 ? '🕒' : '🔍'}
                </span>
                <span className="suggestion-text">{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <style jsx>{`
        .search-bar-container {
          position: relative;
          width: 100%;
          max-width: 600px;
        }
        
        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          background: #f5f5f5;
          border-radius: 24px;
          padding: 8px 16px;
          transition: all 0.3s;
        }
        
        .search-input-wrapper:focus-within {
          background: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .search-icon {
          font-size: 18px;
          margin-right: 8px;
          color: #666;
        }
        
        .search-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 16px;
          outline: none;
          color: #333;
        }
        
        .search-input::placeholder {
          color: #999;
        }
        
        .clear-button {
          background: none;
          border: none;
          font-size: 18px;
          color: #999;
          cursor: pointer;
          padding: 0 4px;
          margin-left: 8px;
          transition: color 0.2s;
        }
        
        .clear-button:hover {
          color: #333;
        }
        
        .loading-spinner {
          font-size: 16px;
          margin-left: 8px;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .suggestions-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          max-height: 400px;
          overflow-y: auto;
          z-index: 1000;
        }
        
        .suggestions-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #eee;
          font-size: 14px;
          color: #666;
        }
        
        .clear-history-button {
          background: none;
          border: none;
          color: #4CAF50;
          cursor: pointer;
          font-size: 14px;
          padding: 4px 8px;
        }
        
        .clear-history-button:hover {
          text-decoration: underline;
        }
        
        .suggestions-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        
        .suggestion-item {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .suggestion-item:hover,
        .suggestion-item.selected {
          background: #f5f5f5;
        }
        
        .suggestion-icon {
          font-size: 16px;
          margin-right: 12px;
        }
        
        .suggestion-text {
          flex: 1;
          font-size: 15px;
          color: #333;
        }
        
        @media (max-width: 768px) {
          .search-bar-container {
            max-width: 100%;
          }
          
          .search-input-wrapper {
            padding: 6px 12px;
          }
          
          .search-input {
            font-size: 14px;
          }
          
          .suggestions-dropdown {
            max-height: 300px;
          }
        }
      `}</style>
    </div>
  );
};

export default SearchBar;
