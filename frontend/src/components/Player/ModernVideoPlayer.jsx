import React, { useRef, useEffect, useState, useCallback } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import './ModernVideoPlayer.css';
import { mediaAPI } from '../../services/api';

const ESL_MODES = {
  NORMAL: 'normal',
  SHADOWING: 'shadowing',
  REPEAT: 'repeat'
};

const ModernVideoPlayer = ({
  mediaFile,
  transcription,
  onTimeUpdate,
  onSegmentChange,
  currentSegmentIndex,
  onModeChange,
  onPlayerReady,
  eslMode: externalEslMode,
  repeatSegment: externalRepeatSegment,
  segments: externalSegments,
  onPlayerStateChange,
  className = ''
}) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const eslMode = externalEslMode || ESL_MODES.NORMAL;
  const repeatSegment = externalRepeatSegment;
  const segments = externalSegments || [];
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showCaptions, setShowCaptions] = useState(true);
  const [shadowingDelay, setShadowingDelay] = useState(2);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (!playerRef.current) {
      return;
    }

    // Use the player's actual paused state instead of React state to avoid race conditions
    const isPaused = playerRef.current.paused();

    // Handle REPEAT mode specially
    if (eslMode === ESL_MODES.REPEAT && repeatSegment !== null) {
      const segment = segments[repeatSegment];
      if (segment) {
        if (!isPaused) {
          playerRef.current.pause();
        } else {
          const currentTime = playerRef.current.currentTime();
          // Only restart from beginning if we're at or past the end of the segment
          if (currentTime >= segment.end - 0.1 || currentTime < segment.start) {
            playerRef.current.currentTime(segment.start);
          }
          // Otherwise continue from current position
          playerRef.current.play().catch(error => {
            console.error('Error playing video:', error);
          });
        }
        return;
      }
    }

    // Normal play/pause behavior
    if (!isPaused) {
      playerRef.current.pause();
    } else {
      playerRef.current.play().catch(error => {
        console.error('Error playing video:', error);
      });
    }
  }, [eslMode, repeatSegment, segments]);

  // Keyboard event handling
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code === 'Space') {
        event.preventDefault();

        // In repeat mode, handle spacebar specially
        if (eslMode === ESL_MODES.REPEAT && repeatSegment !== null) {
          const segment = segments[repeatSegment];
          if (segment && playerRef.current) {
            const player = playerRef.current;

            if (player.paused()) {
              const currentTime = player.currentTime();
              // Only restart from beginning if we're at or past the end of the segment
              if (currentTime >= segment.end - 0.1 || currentTime < segment.start) {
                player.currentTime(segment.start);
              }
              // Otherwise continue from current position
              player.play();
            } else {
              // If playing, pause
              player.pause();
            }
          }
        } else {
          // Normal spacebar behavior
          togglePlay();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [eslMode, repeatSegment, segments, togglePlay]);

  // Segments are now provided externally via props

  // Define handleTimeUpdate before it's used in useEffect
  const handleTimeUpdate = useCallback(() => {
    if (!playerRef.current) return;

    const time = playerRef.current.currentTime();
    setCurrentTime(time);

    // Notify parent about time change
    onPlayerStateChange?.({ currentTime: time });

    // Find current segment
    let currentSegment;

    // In REPEAT mode, the current segment should always be the repeat segment
    if (eslMode === ESL_MODES.REPEAT && repeatSegment !== null) {
      currentSegment = repeatSegment;
    } else {
      // Normal segment detection based on time
      currentSegment = segments.findIndex(segment =>
        time >= segment.start && time < segment.end
      );
    }

    if (currentSegment !== -1 && currentSegment !== currentSegmentIndex) {
      onSegmentChange?.(currentSegment);
    }

    // Let parent handle ESL mode logic via onTimeUpdate callback
    onTimeUpdate?.(time);
  }, [segments, currentSegmentIndex, onSegmentChange, onTimeUpdate, onPlayerStateChange, eslMode, repeatSegment]);

  // Initialize Video.js player with proper StrictMode handling
  useEffect(() => {
    if (!videoRef.current) return;

    const videoElement = videoRef.current;
    let isInitialized = false;

    // Check if player is already initialized
    if (playerRef.current) {
      console.log('Player already initialized, skipping...');
      return;
    }

    // Check if the video element already has a player attached (StrictMode protection)
    if (videoElement.player && typeof videoElement.player.dispose === 'function') {
      console.log('Video element already has a player, skipping initialization...');
      playerRef.current = videoElement.player;

      // Notify parent component that player is ready
      if (onPlayerReady) {
        onPlayerReady(videoElement.player);
      }
      return;
    }

    // Initialize player with a small delay to ensure DOM is ready
    const initializePlayer = () => {
      // Double-check to prevent race conditions in StrictMode
      if (isInitialized || playerRef.current) {
        console.log('Player initialization already in progress or completed, skipping...');
        return;
      }

      try {
        isInitialized = true;
        console.log('Initializing Video.js player...');

        // Dispose any existing player on the element first
        if (videoElement.player && typeof videoElement.player.dispose === 'function') {
          console.log('Disposing existing player...');
          try {
            videoElement.player.dispose();
          } catch (e) {
            console.warn('Error disposing existing player:', e);
          }
          // Clear the player reference from the element
          delete videoElement.player;
        }

        // Also check for any existing videojs instances and dispose them
        if (window.videojs && window.videojs.getPlayer) {
          try {
            const existingPlayer = window.videojs.getPlayer(videoElement);
            if (existingPlayer && typeof existingPlayer.dispose === 'function') {
              console.log('Disposing existing videojs player instance...');
              existingPlayer.dispose();
            }
          } catch (e) {
            console.warn('Error disposing existing videojs player:', e);
          }
        }

        // Clear any existing Video.js classes and reset
        videoElement.className = 'video-js vjs-default-skin';
        videoElement.removeAttribute('data-vjs-player');

        // Ensure the video element has required attributes
        videoElement.setAttribute('controls', 'false');
        videoElement.setAttribute('preload', 'metadata');

        const player = videojs(videoElement, {
          controls: false, // Completely disable Video.js controls
          responsive: false,
          fluid: false,
          playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
          preload: 'metadata',
          techOrder: ['html5'],
          userActions: {
            hotkeys: false
          },
          html5: {
            vhs: {
              overrideNative: true
            }
          }
        });

        // Completely disable all Video.js UI components
        player.ready(() => {
          // Hide all Video.js UI elements
          player.controls(false);
          player.bigPlayButton.hide();

          // Remove any control bar that might appear
          const controlBar = player.getChild('ControlBar');
          if (controlBar) {
            controlBar.hide();
          }

          // Remove loading spinner
          const loadingSpinner = player.getChild('LoadingSpinner');
          if (loadingSpinner) {
            loadingSpinner.hide();
          }
        });

        playerRef.current = player;
        console.log('Video.js player initialized successfully');

        // Set up event listeners
        player.on('timeupdate', handleTimeUpdate);
        player.on('loadedmetadata', () => {
          const duration = player.duration() || 0;
          setDuration(duration);
          onPlayerStateChange?.({ duration });
          console.log('Video metadata loaded, duration:', duration);
        });
        player.on('play', () => {
          setIsPlaying(true);
          onPlayerStateChange?.({ isPlaying: true });
        });
        player.on('pause', () => {
          setIsPlaying(false);
          onPlayerStateChange?.({ isPlaying: false });
        });
        player.on('volumechange', () => {
          const volume = player.volume() || 1;
          setVolume(volume);
          onPlayerStateChange?.({ volume });
        });
        player.on('error', (e) => {
          console.error('Video player error:', e);
          onPlayerStateChange?.({ error: 'Failed to load video' });
        });

        // Notify parent component that player is ready
        if (onPlayerReady) {
          onPlayerReady(player);
        }
      } catch (error) {
        console.error('Failed to initialize Video.js player:', error);
        isInitialized = false;
      }
    };

    // Use a small timeout to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      initializePlayer();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (playerRef.current && typeof playerRef.current.dispose === 'function') {
        try {
          console.log('Cleaning up Video.js player...');
          playerRef.current.dispose();
        } catch (error) {
          console.warn('Error disposing player:', error);
        }
        playerRef.current = null;
      }
      // Also clean up any references on the video element
      if (videoElement && videoElement.player) {
        delete videoElement.player;
      }
      isInitialized = false;
    };
  }, []);

  // Set video source when mediaFile changes
  useEffect(() => {
    console.log('MediaFile changed:', mediaFile);
    console.log('MediaFile properties:', mediaFile ? Object.keys(mediaFile) : 'null');

    if (playerRef.current && mediaFile && mediaFile.id) {
      // Use the correct API endpoint for serving media files
      const videoUrl = mediaAPI.getMediaFileUrl(mediaFile.id);

      console.log('Setting video source:', videoUrl);
      console.log('Media file type:', mediaFile.file_type);
      console.log('Media file ID:', mediaFile.id);

      // Set the source
      playerRef.current.src({
        src: videoUrl,
        type: mediaFile.file_type === 'video' ? 'video/mp4' : 'audio/mp3'
      });

      // Reset player state
      setCurrentTime(0);
      setIsPlaying(false);

      console.log('Video source set successfully');
    } else {
      console.log('Cannot set video source - player or mediaFile not ready:', {
        hasPlayer: !!playerRef.current,
        hasMediaFile: !!mediaFile,
        hasMediaFileId: !!mediaFile?.id
      });
    }
  }, [mediaFile, playerRef.current]);

  const seekToSegment = (segmentIndex) => {
    if (!playerRef.current || !segments[segmentIndex]) return;

    const segment = segments[segmentIndex];
    playerRef.current.currentTime(segment.start);
    onSegmentChange?.(segmentIndex);
  };

  const previousPhrase = () => {
    const prevIndex = Math.max(0, currentSegmentIndex - 1);
    seekToSegment(prevIndex);
  };

  const nextPhrase = () => {
    const nextIndex = Math.min(segments.length - 1, currentSegmentIndex + 1);
    seekToSegment(nextIndex);
  };

  const changeESLMode = (mode) => {
    onModeChange?.(mode);
  };

  const changePlaybackRate = (rate) => {
    if (!playerRef.current) return;
    setPlaybackRate(rate);
    playerRef.current.playbackRate(rate);
  };

  const changeVolume = (vol) => {
    if (!playerRef.current) return;
    setVolume(vol);
    playerRef.current.volume(vol);
  };

  const seek = (time) => {
    if (!playerRef.current) return;
    playerRef.current.currentTime(time);
  };

  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentSegment = () => {
    return segments[currentSegmentIndex] || null;
  };

  const currentSegment = getCurrentSegment();

  return (
    <div className={`modern-video-player ${className}`}>
      {/* Video Container */}
      <div className="video-container">
        <video
          ref={videoRef}
          className="video-js vjs-default-skin"
          data-setup='{"controls": false, "preload": "metadata"}'
          controls={false}
          preload="metadata"
          playsInline
          webkit-playsinline="true"
          x-webkit-airplay="allow"
        />

        {/* Subtitle Overlay */}
        {showCaptions && currentSegment && (
          <div className="subtitle-overlay">
            <div className="subtitle-text">
              {currentSegment.text}
            </div>
          </div>
        )}

        {/* ESL Mode Indicator */}
        {eslMode !== ESL_MODES.NORMAL && (
          <div className="esl-mode-indicator">
            <span className={`mode-badge mode-${eslMode}`}>
              {eslMode.toUpperCase()}
              {eslMode === ESL_MODES.REPEAT && repeatSegment !== null && (
                <span className="segment-info"> - Segment {repeatSegment + 1}</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Custom Controls */}
      <div className="custom-controls">
        {/* Progress Bar */}
        <div className="progress-container">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="progress-slider"
          />
          <div className="time-display">
            <span>{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main Controls Row */}
        <div className="main-controls">
          {/* Playback Controls */}
          <div className="playback-controls">
            <button onClick={previousPhrase} className="control-btn" title="Previous Phrase">
              ⏮
            </button>
            <button onClick={togglePlay} className="control-btn play-btn" title={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={nextPhrase} className="control-btn" title="Next Phrase">
              ⏭
            </button>
          </div>

          {/* ESL Mode Controls */}
          <div className="esl-controls">
            <button
              onClick={() => changeESLMode(ESL_MODES.NORMAL)}
              className={`esl-btn ${eslMode === ESL_MODES.NORMAL ? 'active' : ''}`}
            >
              NORMAL
            </button>
            <button
              onClick={() => changeESLMode(ESL_MODES.SHADOWING)}
              className={`esl-btn ${eslMode === ESL_MODES.SHADOWING ? 'active' : ''}`}
            >
              SHADOWING
            </button>
            <button
              onClick={() => changeESLMode(ESL_MODES.REPEAT)}
              className={`esl-btn ${eslMode === ESL_MODES.REPEAT ? 'active' : ''}`}
            >
              REPEAT
            </button>
          </div>

          {/* Additional Controls */}
          <div className="additional-controls">
            {/* Speed Control */}
            <div className="speed-control">
              <button onClick={() => changePlaybackRate(Math.max(0.25, playbackRate - 0.25))} className="control-btn small">
                -
              </button>
              <span className="speed-display">{playbackRate}x</span>
              <button onClick={() => changePlaybackRate(Math.min(2, playbackRate + 0.25))} className="control-btn small">
                +
              </button>
            </div>

            {/* CC Toggle */}
            <button
              onClick={() => setShowCaptions(!showCaptions)}
              className={`control-btn ${showCaptions ? 'active' : ''}`}
              title="Toggle Captions"
            >
              CC
            </button>

            {/* Volume Control */}
            <div className="volume-control">
              <button onClick={() => changeVolume(volume > 0 ? 0 : 1)} className="control-btn">
                {volume > 0 ? '🔊' : '🔇'}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => changeVolume(parseFloat(e.target.value))}
                className="volume-slider"
              />
            </div>
          </div>
        </div>

        {/* Shadowing Controls */}
        {eslMode === ESL_MODES.SHADOWING && (
          <div className="shadowing-controls">
            <span>Delay:</span>
            <button onClick={() => setShadowingDelay(Math.max(0.5, shadowingDelay - 0.5))} className="control-btn small">
              -
            </button>
            <span className="delay-display">{shadowingDelay}s</span>
            <button onClick={() => setShadowingDelay(Math.min(5, shadowingDelay + 0.5))} className="control-btn small">
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernVideoPlayer;
