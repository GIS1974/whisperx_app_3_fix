import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { mediaAPI, transcriptionAPI } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

import ModernVideoPlayer from '../components/Player/ModernVideoPlayer';
import ModernInteractiveTranscript from '../components/Player/ModernInteractiveTranscript';
import { useVideoPlayer } from '../hooks/useVideoPlayer';
import { useESLModes } from '../hooks/useESLModes';

export const PlayerPage = ({ onPlayerPageInfoChange }) => {
  const { fileId } = useParams();
  const navigate = useNavigate();

  // Basic state
  const [mediaFile, setMediaFile] = useState(null);
  const [transcription, setTranscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [segments, setSegments] = useState([]);

  // Initialize video player and ESL modes hooks
  const videoPlayer = useVideoPlayer(segments);
  const eslModes = useESLModes(videoPlayer.playerRef, segments);

  // Legacy state for compatibility (will be removed)
  const [eslVideoPlayerAPI, setEslVideoPlayerAPI] = useState(null);

  useEffect(() => {
    fetchMediaFile();

    // Cleanup navbar info when component unmounts
    return () => {
      if (onPlayerPageInfoChange) {
        onPlayerPageInfoChange(null);
      }
    };
  }, [fileId]);

  useEffect(() => {
    if (mediaFile && mediaFile.is_completed) {
      fetchTranscription();
    }
  }, [mediaFile]);

  const fetchMediaFile = async () => {
    try {
      setLoading(true);
      const file = await mediaAPI.getMediaFile(fileId);
      setMediaFile(file);

      // Update navbar with file info
      if (onPlayerPageInfoChange) {
        onPlayerPageInfoChange(file);
      }

      if (!file.is_completed && !file.has_failed) {
        // Start polling for completion
        startStatusPolling();
      }
    } catch (error) {
      console.error('Error fetching media file:', error);
      setError('Failed to load media file');
      toast.error('Failed to load media file');
    } finally {
      setLoading(false);
    }
  };

  const fetchTranscription = async () => {
    try {
      console.log('=== FETCHING TRANSCRIPTION ===');
      const transcriptionData = await transcriptionAPI.getTranscription(fileId);
      console.log('Transcription data received:', transcriptionData);

      // Parse segments from raw output for transcript display
      if (transcriptionData.raw_whisperx_output?.segments) {
        console.log('Setting segments from raw_whisperx_output:', transcriptionData.raw_whisperx_output.segments.length, 'segments');
        console.log('First few segments:', transcriptionData.raw_whisperx_output.segments.slice(0, 10));
        setSegments(transcriptionData.raw_whisperx_output.segments);

        // Add segments to transcription object for WordHighlighter
        const transcriptionWithSegments = {
          ...transcriptionData,
          segments: transcriptionData.raw_whisperx_output.segments
        };
        setTranscription(transcriptionWithSegments);
      } else {
        console.log('No segments found in raw_whisperx_output');
        // Set transcription without segments if no segments available
        setTranscription(transcriptionData);
      }
    } catch (error) {
      console.error('Error fetching transcription:', error);
      // Don't show error toast as transcription might still be processing
    }
  };

  const startStatusPolling = () => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await transcriptionAPI.getTranscriptionStatus(fileId);

        if (status.is_completed) {
          clearInterval(pollInterval);
          await fetchMediaFile();
          await fetchTranscription();
          toast.success('Transcription completed!');
        } else if (status.has_failed) {
          clearInterval(pollInterval);
          await fetchMediaFile();
          toast.error('Transcription failed');
        }
      } catch (error) {
        console.error('Error polling status:', error);
        clearInterval(pollInterval);
      }
    }, 5000);

    // Cleanup on unmount
    return () => clearInterval(pollInterval);
  };

  const downloadSubtitle = async (format) => {
    try {
      const response = await transcriptionAPI.downloadSubtitleFile(fileId, format);

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${mediaFile.filename_original}_${format}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`${format.toUpperCase()} file downloaded`);
    } catch (error) {
      console.error(`Error downloading ${format}:`, error);
      toast.error(`Failed to download ${format.toUpperCase()} file`);
    }
  };

  // Handler for transcript panel navigation
  const handleSegmentClick = (segmentIndex) => {
    videoPlayer.seekToSegment(segmentIndex);
  };

  // Handler for repeat mode activation from transcript
  const handleRepeatModeActivate = (segmentIndex) => {
    eslModes.activateRepeatMode(segmentIndex);
  };

  // Handler for segment updates from transcript editing
  const handleSegmentUpdate = (segmentIndex, updatedSegment) => {
    const newSegments = [...segments];
    newSegments[segmentIndex] = updatedSegment;
    setSegments(newSegments);
    // TODO: Save to backend via API
  };

  if (loading) {
    return <LoadingSpinner text="Loading media file..." />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-xl mb-4">{error}</div>
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-primary"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!mediaFile) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-xl mb-4">Media file not found</div>
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-primary"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Main Content Area - Full height */}
      <div className="h-full overflow-hidden">
        {/* Processing Status */}
        {mediaFile.is_processing && (
          <div className="h-full flex items-center justify-center">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600 mr-3"></div>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Processing in progress</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Your file is being processed. Transcription will be available shortly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Status */}
        {mediaFile.has_failed && (
          <div className="h-full flex items-center justify-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
              <h3 className="text-sm font-medium text-red-800">Processing Failed</h3>
              <p className="text-sm text-red-700 mt-1">{mediaFile.error_message}</p>
            </div>
          </div>
        )}

        {/* Modern ESL Video Player - Fixed Layout */}
        {mediaFile.is_completed && (
          <div className="h-full flex gap-6 p-6">
            {/* Video Player Column - Takes 70% width */}
            <div className="w-[70%] flex flex-col overflow-hidden">
              <ModernVideoPlayer
                mediaFile={mediaFile}
                transcription={transcription}
                onTimeUpdate={(time) => {
                  eslModes.handleESLModeLogic(time, videoPlayer.currentSegmentIndex);
                }}
                onSegmentChange={videoPlayer.seekToSegment}
                currentSegmentIndex={videoPlayer.currentSegmentIndex}
                onModeChange={eslModes.changeESLMode}
                className="w-full h-full"
              />
            </div>

            {/* Modern Interactive Transcript Column - Takes 30% width */}
            <div className="w-[30%] flex flex-col overflow-hidden">
              {transcription && segments.length > 0 ? (
                <ModernInteractiveTranscript
                  segments={segments}
                  currentSegmentIndex={videoPlayer.currentSegmentIndex}
                  onSegmentClick={handleSegmentClick}
                  onSegmentUpdate={handleSegmentUpdate}
                  onRepeatModeActivate={handleRepeatModeActivate}
                  className="w-full h-full"
                />
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Transcript</h3>
                    <p className="text-gray-500">Transcript will appear here once transcription data is loaded.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
