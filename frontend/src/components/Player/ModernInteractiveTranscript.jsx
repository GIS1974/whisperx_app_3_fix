import React, { useState, useRef, useEffect } from 'react';
import './ModernInteractiveTranscript.css';

const ModernInteractiveTranscript = ({
  segments,
  currentSegmentIndex,
  onSegmentClick,
  onSegmentUpdate,
  onRepeatModeActivate,
  className = ''
}) => {
  const [editMode, setEditMode] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [editingSegment, setEditingSegment] = useState(null);
  const [editedText, setEditedText] = useState('');
  const [editedStart, setEditedStart] = useState(0);
  const [editedEnd, setEditedEnd] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  const transcriptRef = useRef(null);
  const activeSegmentRef = useRef(null);

  // Auto-scroll to active segment in focus mode
  useEffect(() => {
    if (activeSegmentRef.current && transcriptRef.current && focusMode) {
      const container = transcriptRef.current;
      const activeElement = activeSegmentRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const activeRect = activeElement.getBoundingClientRect();
      
      if (
        activeRect.top < containerRect.top ||
        activeRect.bottom > containerRect.bottom
      ) {
        const scrollTop = activeElement.offsetTop - container.clientHeight / 2 + activeElement.clientHeight / 2;
        container.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
      }
    }
  }, [currentSegmentIndex, focusMode]);

  const handleSegmentClick = (index) => {
    if (!editMode) {
      onSegmentClick?.(index);
    }
  };

  const handleSegmentDoubleClick = (index) => {
    if (!editMode) {
      onRepeatModeActivate?.(index);
    }
  };

  const startEditing = (index) => {
    const segment = segments[index];
    setEditingSegment(index);
    setEditedText(segment.text);
    setEditedStart(secondsToTimeString(segment.start));
    setEditedEnd(secondsToTimeString(segment.end));
  };

  const saveEdits = () => {
    if (editingSegment !== null) {
      const startSeconds = timeStringToSeconds(editedStart);
      const endSeconds = timeStringToSeconds(editedEnd);

      // Validate time format and values
      if (startSeconds === 0 && editedStart !== '00:00.000' && editedStart !== '00:00') {
        alert('Invalid start time format. Please use mm:ss.xxx format (e.g., 01:30.500)');
        return;
      }

      if (endSeconds === 0 && editedEnd !== '00:00.000' && editedEnd !== '00:00') {
        alert('Invalid end time format. Please use mm:ss.xxx format (e.g., 01:30.500)');
        return;
      }

      // Validate that end time is after start time
      if (endSeconds <= startSeconds) {
        alert(`End time (${editedEnd}) must be after start time (${editedStart})`);
        return;
      }

      // Validate that text is not empty
      if (!editedText.trim()) {
        alert('Segment text cannot be empty');
        return;
      }

      const updatedSegment = {
        ...segments[editingSegment],
        text: editedText.trim(),
        start: startSeconds,
        end: endSeconds
      };

      onSegmentUpdate?.(editingSegment, updatedSegment);
      setEditingSegment(null);
    }
  };

  const cancelEdits = () => {
    setEditingSegment(null);
  };

  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return '00:00.000';

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  // Convert seconds to mm:ss.xxx format for editing
  const secondsToTimeString = (seconds) => {
    if (!seconds && seconds !== 0) return '00:00.000';

    // Round to 3 decimal places to avoid floating point precision issues
    const roundedSeconds = Math.round(seconds * 1000) / 1000;

    const mins = Math.floor(roundedSeconds / 60);
    const secs = Math.floor(roundedSeconds % 60);
    const ms = Math.round((roundedSeconds % 1) * 1000);

    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  // Convert mm:ss.xxx format back to seconds
  const timeStringToSeconds = (timeString) => {
    if (!timeString) return 0;

    // Handle both mm:ss.xxx and mm:ss formats
    const parts = timeString.split(':');
    if (parts.length !== 2) return 0;

    const minutes = parseInt(parts[0]) || 0;
    const secondsPart = parts[1].split('.');
    const seconds = parseInt(secondsPart[0]) || 0;
    const milliseconds = secondsPart[1] ? parseInt(secondsPart[1].padEnd(3, '0').substring(0, 3)) || 0 : 0;

    return minutes * 60 + seconds + milliseconds / 1000;
  };

  const highlightSearchTerm = (text) => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="search-highlight">{part}</mark>
      ) : part
    );
  };

  const filteredSegments = segments.filter(segment =>
    !searchTerm || segment.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!segments || segments.length === 0) {
    return (
      <div className={`modern-interactive-transcript ${className}`}>
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>No transcript available</h3>
          <p>Transcript will appear here once transcription is complete.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`modern-interactive-transcript ${className}`}>
      {/* Header Controls */}
      <div className="transcript-header">
        <div className="header-left">
          <h3 className="transcript-title">Interactive Transcript</h3>
          <span className="segment-count">{filteredSegments.length} segments</span>
        </div>
        
        <div className="header-controls">
          <button
            onClick={() => setFocusMode(!focusMode)}
            className={`control-toggle ${focusMode ? 'active' : ''}`}
            title="Focus Mode - Auto-scroll to active segment"
          >
            <span className="toggle-icon">🎯</span>
            Focus
          </button>
          
          <button
            onClick={() => setEditMode(!editMode)}
            className={`control-toggle ${editMode ? 'active edit-mode' : ''}`}
            title="Edit Mode - Click segments to edit"
          >
            <span className="toggle-icon">✏️</span>
            {editMode ? 'Exit Edit' : 'Edit'}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search transcript..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="clear-search"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Transcript List */}
      <div 
        ref={transcriptRef}
        className="transcript-list"
      >
        {filteredSegments.map((segment, index) => {
          const originalIndex = segments.indexOf(segment);
          const isActive = originalIndex === currentSegmentIndex;
          const isEditing = editingSegment === originalIndex;
          
          return (
            <div
              key={originalIndex}
              ref={isActive ? activeSegmentRef : null}
              className={`transcript-segment ${isActive ? 'active' : ''} ${editMode ? 'edit-mode' : ''} ${isEditing ? 'editing' : ''}`}
              onClick={() => handleSegmentClick(originalIndex)}
              onDoubleClick={() => handleSegmentDoubleClick(originalIndex)}
            >
              {isEditing ? (
                // Edit Mode
                <div className="segment-editor">
                  <div className="editor-header">
                    <span className="editor-title">Editing Segment {originalIndex + 1}</span>
                  </div>
                  
                  <div className="time-inputs">
                    <div className="time-input-group">
                      <label>Start Time (mm:ss.xxx)</label>
                      <input
                        type="text"
                        value={editedStart}
                        onChange={(e) => setEditedStart(e.target.value)}
                        className="time-input"
                        placeholder="00:00.000"
                        title="Format: mm:ss.xxx (e.g., 01:30.500)"
                      />
                    </div>
                    <div className="time-input-group">
                      <label>End Time (mm:ss.xxx)</label>
                      <input
                        type="text"
                        value={editedEnd}
                        onChange={(e) => setEditedEnd(e.target.value)}
                        className="time-input"
                        placeholder="00:00.000"
                        title="Format: mm:ss.xxx (e.g., 01:30.500)"
                      />
                    </div>
                  </div>
                  
                  <div className="text-input-group">
                    <label>Text</label>
                    <textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      className="text-input"
                      rows="3"
                      placeholder="Enter segment text..."
                    />
                  </div>
                  
                  <div className="editor-actions">
                    <button onClick={cancelEdits} className="btn-cancel">
                      Cancel
                    </button>
                    <button onClick={saveEdits} className="btn-save">
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="segment-content">
                  <div className="segment-header">
                    <div className="segment-time">
                      {formatTime(segment.start)}
                    </div>
                    <div className="segment-actions">
                      {editMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(originalIndex);
                          }}
                          className="edit-btn"
                          title="Edit this segment"
                        >
                          ✏️
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="segment-text">
                    {highlightSearchTerm(segment.text)}
                  </div>
                  
                  {segment.speaker && (
                    <div className="speaker-label">
                      Speaker: {segment.speaker}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Instructions */}
      <div className="transcript-instructions">
        <div className="instruction-item">
          <span className="instruction-icon">👆</span>
          <span>Click to activate repeat mode</span>
        </div>
        {editMode && (
          <div className="instruction-item">
            <span className="instruction-icon">✏️</span>
            <span>Click edit button to modify</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernInteractiveTranscript;
