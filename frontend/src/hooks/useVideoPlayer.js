import { useState, useCallback, useRef, useEffect } from 'react';

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
    
    return segments.findIndex(segment => 
      time >= segment.start && time < segment.end
    );
  }, [segments]);

  // Update current segment when time changes
  useEffect(() => {
    const newSegmentIndex = findCurrentSegment(currentTime);
    if (newSegmentIndex !== currentSegmentIndex) {
      setCurrentSegmentIndex(newSegmentIndex);
    }
  }, [currentTime, findCurrentSegment, currentSegmentIndex]);

  // Initialize player
  const initializePlayer = useCallback((player) => {
    if (!player) return;

    playerRef.current = player;
    setError(null);

    // Set up event listeners
    player.on('loadstart', () => {
      setIsLoading(true);
      setError(null);
    });

    player.on('loadedmetadata', () => {
      setDuration(player.duration() || 0);
      setIsLoading(false);
    });

    player.on('canplay', () => {
      setIsLoading(false);
    });

    player.on('play', () => {
      setIsPlaying(true);
    });

    player.on('pause', () => {
      setIsPlaying(false);
    });

    player.on('timeupdate', () => {
      const time = player.currentTime() || 0;
      setCurrentTime(time);
    });

    player.on('volumechange', () => {
      setVolume(player.volume() || 0);
    });

    player.on('ratechange', () => {
      setPlaybackRate(player.playbackRate() || 1);
    });

    player.on('progress', () => {
      const bufferedEnd = player.buffered().length > 0 
        ? player.buffered().end(player.buffered().length - 1)
        : 0;
      setBuffered(bufferedEnd);
    });

    player.on('error', (e) => {
      console.error('Video player error:', e);
      setError('Failed to load video');
      setIsLoading(false);
    });

    player.on('ended', () => {
      setIsPlaying(false);
    });

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
    togglePlay,
    seekTo,
    seekToSegment,
    previousSegment,
    nextSegment,
    changeVolume,
    toggleMute,
    changePlaybackRate,
    skip,
    
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
