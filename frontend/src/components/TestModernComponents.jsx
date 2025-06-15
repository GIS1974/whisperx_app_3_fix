import React, { useState } from 'react';
import ModernVideoPlayer from './Player/ModernVideoPlayer';
import ModernInteractiveTranscript from './Player/ModernInteractiveTranscript';

// Test component to verify modern components are working
const TestModernComponents = () => {
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);

  // Mock data for testing
  const mockMediaFile = {
    file_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    file_type: 'video',
    filename_original: 'test-video.mp4'
  };

  const mockSegments = [
    {
      start: 0,
      end: 5,
      text: "This is the first segment of the test video."
    },
    {
      start: 5,
      end: 10,
      text: "This is the second segment with some more text."
    },
    {
      start: 10,
      end: 15,
      text: "And this is the third segment for testing purposes."
    }
  ];

  const mockTranscription = {
    segments: mockSegments
  };

  const handleSegmentClick = (segmentIndex) => {
    console.log('Segment clicked:', segmentIndex);
    setCurrentSegmentIndex(segmentIndex);
  };

  const handleSegmentUpdate = (segmentIndex, updatedSegment) => {
    console.log('Segment updated:', segmentIndex, updatedSegment);
  };

  const handleRepeatModeActivate = (segmentIndex) => {
    console.log('Repeat mode activated for segment:', segmentIndex);
    setCurrentSegmentIndex(segmentIndex);
  };

  const handleTimeUpdate = (time) => {
    console.log('Time update:', time);
  };

  const handleSegmentChange = (segmentIndex) => {
    console.log('Segment changed:', segmentIndex);
    setCurrentSegmentIndex(segmentIndex);
  };

  const handleModeChange = (mode) => {
    console.log('Mode changed:', mode);
  };

  return (
    <div className="h-screen bg-gray-50 p-6">
      <div className="h-full flex gap-6">
        {/* Video Player - 70% */}
        <div className="w-[70%]">
          <h2 className="text-xl font-bold mb-4">Modern Video Player Test</h2>
          <div className="h-[calc(100%-2rem)]">
            <ModernVideoPlayer
              mediaFile={mockMediaFile}
              transcription={mockTranscription}
              onTimeUpdate={handleTimeUpdate}
              onSegmentChange={handleSegmentChange}
              currentSegmentIndex={currentSegmentIndex}
              onModeChange={handleModeChange}
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Transcript - 30% */}
        <div className="w-[30%]">
          <h2 className="text-xl font-bold mb-4">Modern Interactive Transcript Test</h2>
          <div className="h-[calc(100%-2rem)]">
            <ModernInteractiveTranscript
              segments={mockSegments}
              currentSegmentIndex={currentSegmentIndex}
              onSegmentClick={handleSegmentClick}
              onSegmentUpdate={handleSegmentUpdate}
              onRepeatModeActivate={handleRepeatModeActivate}
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestModernComponents;
