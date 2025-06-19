import { useState, useCallback, useRef, useEffect } from 'react';
import { ESL_MODES } from './useESLModes';

export const useVideoPlayer = (segments = []) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(-1);
  const [buffered, setBuffered] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // ESL mode state for segment detection
  const [eslMode, setEslMode] = useState(null);
  const [repeatSegment, setRepeatSegment] = useState(null);

  const playerRef = useRef(null);
  const timeUpdateIntervalRef = useRef(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
    };
  }, []);

  // Find current segment based on time
  const findCurrentSegment = useCallback((time) => {
    if (!segments.length) return -1;

    // In REPEAT mode, the current segment should always be the repeat segment
    if (eslMode === ESL_MODES.REPEAT && repeatSegment !== null) {
      return repeatSegment;
    }

    // Normal segment detection based on time
    return segments.findIndex(segment =>
      time >= segment.start && time < segment.end
    );
  }, [segments, eslMode, repeatSegment]);

  // Update current segment when time changes
  useEffect(() => {
    const newSegmentIndex = findCurrentSegment(currentTime);
    if (newSegmentIndex !== currentSegmentIndex) {
      setCurrentSegmentIndex(newSegmentIndex);
    }
  }, [currentTime, findCurrentSegment, currentSegmentIndex]);

  // Initialize player - just store reference, let ModernVideoPlayer handle events
  const initializePlayer = useCallback((player) => {
    if (!player) return;

    playerRef.current = player;
    setError(null);

    // Get initial state from player
    setDuration(player.duration() || 0);
    setVolume(player.volume() || 1);
    setPlaybackRate(player.playbackRate() || 1);
    setIsLoading(false);

    // Note: Event listeners are handled by ModernVideoPlayer to avoid conflicts
  }, []);

  // Sync state from ModernVideoPlayer
  const syncPlayerState = useCallback((stateUpdate) => {
    if (stateUpdate.isPlaying !== undefined) setIsPlaying(stateUpdate.isPlaying);
    if (stateUpdate.currentTime !== undefined) setCurrentTime(stateUpdate.currentTime);
    if (stateUpdate.duration !== undefined) setDuration(stateUpdate.duration);
    if (stateUpdate.volume !== undefined) setVolume(stateUpdate.volume);
    if (stateUpdate.playbackRate !== undefined) setPlaybackRate(stateUpdate.playbackRate);
    if (stateUpdate.error !== undefined) setError(stateUpdate.error);
    if (stateUpdate.isLoading !== undefined) setIsLoading(stateUpdate.isLoading);
  }, []);

  // Play/pause toggle
  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;

    if (isPlaying) {
      playerRef.current.pause();
    } else {
      playerRef.current.play().catch(error => {
        console.error('Play failed:', error);
        setError('Failed to play video');
      });
    }
  }, [isPlaying]);

  // Seek to specific time
  const seekTo = useCallback((time) => {
    if (!playerRef.current) return;
    
    const clampedTime = Math.max(0, Math.min(duration, time));
    playerRef.current.currentTime(clampedTime);
    setCurrentTime(clampedTime);
  }, [duration]);

  // Seek to specific segment
  const seekToSegment = useCallback((segmentIndex) => {
    if (!segments[segmentIndex]) return;
    
    const segment = segments[segmentIndex];
    seekTo(segment.start);
  }, [segments, seekTo]);

  // Navigate to previous segment
  const previousSegment = useCallback(() => {
    const prevIndex = Math.max(0, currentSegmentIndex - 1);
    seekToSegment(prevIndex);
  }, [currentSegmentIndex, seekToSegment]);

  // Navigate to next segment
  const nextSegment = useCallback(() => {
    const nextIndex = Math.min(segments.length - 1, currentSegmentIndex + 1);
    seekToSegment(nextIndex);
  }, [currentSegmentIndex, segments.length, seekToSegment]);

  // Change volume
  const changeVolume = useCallback((newVolume) => {
    if (!playerRef.current) return;
    
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    playerRef.current.volume(clampedVolume);
    setVolume(clampedVolume);
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!playerRef.current) return;
    
    if (volume > 0) {
      playerRef.current.volume(0);
    } else {
      playerRef.current.volume(1);
    }
  }, [volume]);

  // Change playback rate
  const changePlaybackRate = useCallback((rate) => {
    if (!playerRef.current) return;
    
    const clampedRate = Math.max(0.25, Math.min(4, rate));
    playerRef.current.playbackRate(clampedRate);
    setPlaybackRate(clampedRate);
  }, []);

  // Skip forward/backward
  const skip = useCallback((seconds) => {
    const newTime = currentTime + seconds;
    seekTo(newTime);
  }, [currentTime, seekTo]);

  // Get current segment
  const getCurrentSegment = useCallback(() => {
    return segments[currentSegmentIndex] || null;
  }, [segments, currentSegmentIndex]);

  // Get progress percentage
  const getProgress = useCallback(() => {
    if (!duration) return 0;
    return (currentTime / duration) * 100;
  }, [currentTime, duration]);

  // Get buffered percentage
  const getBufferedProgress = useCallback(() => {
    if (!duration) return 0;
    return (buffered / duration) * 100;
  }, [buffered, duration]);

  // Format time for display
  const formatTime = useCallback((seconds) => {
    if (!seconds && seconds !== 0) return '00:00';
    
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Check if player is ready
  const isReady = useCallback(() => {
    return playerRef.current && !isLoading && !error;
  }, [isLoading, error]);

  // Update ESL mode information
  const updateESLMode = useCallback((newEslMode, newRepeatSegment) => {
    setEslMode(newEslMode);
    setRepeatSegment(newRepeatSegment);
  }, []);

  // Get player state summary
  const getPlayerState = useCallback(() => {
    return {
      isPlaying,
      currentTime,
      duration,
      volume,
      playbackRate,
      currentSegmentIndex,
      buffered,
      isLoading,
      error,
      progress: getProgress(),
      bufferedProgress: getBufferedProgress(),
      currentSegment: getCurrentSegment(),
      isReady: isReady()
    };
  }, [
    isPlaying, currentTime, duration, volume, playbackRate,
    currentSegmentIndex, buffered, isLoading, error,
    getProgress, getBufferedProgress, getCurrentSegment, isReady
  ]);

  return {
    // State
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackRate,
    currentSegmentIndex,
    buffered,
    isLoading,
    error,

    // Player reference
    playerRef,

    // Actions
    initializePlayer,
    syncPlayerState,
    togglePlay,
    seekTo,
    seekToSegment,
    previousSegment,
    nextSegment,
    changeVolume,
    toggleMute,
    changePlaybackRate,
    skip,
    updateESLMode,

    // Utilities
    getCurrentSegment,
    getProgress,
    getBufferedProgress,
    formatTime,
    isReady,
    getPlayerState,
    findCurrentSegment
  };
};

export default useVideoPlayer;
