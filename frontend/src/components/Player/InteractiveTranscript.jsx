import React, { useState, useRef, useEffect } from 'react';
import './InteractiveTranscript.css';

const InteractiveTranscript = ({
  subtitles,
  currentSegmentIndex,
  onSegmentClick,
  currentTime,
  onSegmentUpdate
}) => {
  const [editMode, setEditMode] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [editingSegment, setEditingSegment] = useState(null);
  const [editedText, setEditedText] = useState('');
  const [editedStart, setEditedStart] = useState(0);
  const [editedEnd, setEditedEnd] = useState(0);
  
  const transcriptRef = useRef(null);
  const activeSegmentRef = useRef(null);

  // Scroll to active segment when it changes
  useEffect(() => {
    if (activeSegmentRef.current && transcriptRef.current && (focusMode || editingSegment === currentSegmentIndex)) {
      const container = transcriptRef.current;
      const activeElement = activeSegmentRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const activeRect = activeElement.getBoundingClientRect();
      
      // Check if active element is not fully visible
      if (
        activeRect.top < containerRect.top ||
        activeRect.bottom > containerRect.bottom
      ) {
        // Calculate scroll position to center the active element
        const scrollTop = activeElement.offsetTop - container.clientHeight / 2 + activeElement.clientHeight / 2;
        container.scrollTop = scrollTop;
      }
    }
  }, [currentSegmentIndex, focusMode, editingSegment]);

  const handleSegmentClick = (index) => {
    if (!editMode) {
      onSegmentClick(index);
    }
  };

  const startEditing = (index) => {
    const segment = subtitles[index];
    setEditingSegment(index);
    setEditedText(segment.text);
    setEditedStart(segment.start);
    setEditedEnd(segment.end);
  };

  const saveEdits = () => {
    if (editingSegment !== null) {
      const updatedSegment = {
        ...subtitles[editingSegment],
        text: editedText,
        start: parseFloat(editedStart),
        end: parseFloat(editedEnd)
      };
      
      onSegmentUpdate(editingSegment, updatedSegment);
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

  if (!subtitles || subtitles.length === 0) {
    return (
      <div className="interactive-transcript h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p>No transcript available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="interactive-transcript h-full flex flex-col">
      {/* Controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setEditMode(!editMode)}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              editMode
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            {editMode ? 'Exit Edit' : 'Edit Mode'}
          </button>

          <button
            onClick={() => setFocusMode(!focusMode)}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              focusMode
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Focus Mode
          </button>
        </div>

        <div className="text-sm text-gray-500">
          {subtitles.length} segments
        </div>
      </div>

      {/* Transcript List */}
      <div
        ref={transcriptRef}
        className="flex-1 overflow-y-auto p-4 space-y-2"
      >
        {subtitles.map((subtitle, index) => (
          <div
            key={index}
            ref={index === currentSegmentIndex ? activeSegmentRef : null}
            className={`transcript-segment p-3 rounded-lg border transition-all duration-200 ${
              index === currentSegmentIndex
                ? 'bg-blue-50 border-blue-300 shadow-md'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            } ${!editMode ? 'cursor-pointer' : ''}`}
            onClick={() => handleSegmentClick(index)}
          >
            {editingSegment === index ? (
              // Edit mode for this segment
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={editedStart}
                      onChange={(e) => setEditedStart(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={editedEnd}
                      onChange={(e) => setEditedEnd(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Text
                  </label>
                  <textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    onClick={cancelEdits}
                    className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEdits}
                    className="px-3 py-1 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              // View mode
              <div>
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {formatTime(subtitle.start)} - {formatTime(subtitle.end)}
                  </span>
                  {editMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(index);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-900 leading-relaxed">
                  {subtitle.text}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default InteractiveTranscript;