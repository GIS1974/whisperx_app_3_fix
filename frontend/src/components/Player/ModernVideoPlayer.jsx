import React, { useRef, useEffect, useState, useCallback } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import './ModernVideoPlayer.css';

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
  className = ''
}) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [eslMode, setEslMode] = useState(ESL_MODES.NORMAL);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showCaptions, setShowCaptions] = useState(true);
  const [shadowingDelay, setShadowingDelay] = useState(2);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [segments, setSegments] = useState([]);
  const [repeatSegment, setRepeatSegment] = useState(null);

  // Parse segments from transcription
  useEffect(() => {
    if (transcription && transcription.segments) {
      const parsedSegments = transcription.segments.map((segment, index) => ({
        id: index,
        start: segment.start,
        end: segment.end,
        text: segment.text?.trim() || '',
        duration: segment.end - segment.start
      }));
      setSegments(parsedSegments);
    }
  }, [transcription]);

  // Initialize Video.js player
  useEffect(() => {
    if (!videoRef.current || playerRef.current) return;

    const videoElement = videoRef.current;
    const player = videojs(videoElement, {
      controls: false, // We'll use custom controls
      responsive: true,
      fluid: true,
      playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
      preload: 'metadata'
    });

    playerRef.current = player;

    // Set up event listeners
    player.on('timeupdate', handleTimeUpdate);
    player.on('loadedmetadata', () => {
      setDuration(player.duration());
    });
    player.on('play', () => setIsPlaying(true));
    player.on('pause', () => setIsPlaying(false));
    player.on('volumechange', () => setVolume(player.volume()));

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  // Set video source when mediaFile changes
  useEffect(() => {
    if (playerRef.current && mediaFile?.file_url) {
      playerRef.current.src({
        src: mediaFile.file_url,
        type: 'video/mp4'
      });
    }
  }, [mediaFile]);

  const handleTimeUpdate = useCallback(() => {
    if (!playerRef.current) return;

    const time = playerRef.current.currentTime();
    setCurrentTime(time);

    // Find current segment
    const currentSegment = segments.findIndex(segment => 
      time >= segment.start && time < segment.end
    );

    if (currentSegment !== -1 && currentSegment !== currentSegmentIndex) {
      onSegmentChange?.(currentSegment);
    }

    onTimeUpdate?.(time);

    // Handle ESL mode logic
    handleESLModeLogic(time, currentSegment);
  }, [segments, currentSegmentIndex, eslMode, repeatSegment, onSegmentChange, onTimeUpdate]);

  const handleESLModeLogic = (time, segmentIndex) => {
    if (eslMode === ESL_MODES.REPEAT && repeatSegment !== null) {
      const segment = segments[repeatSegment];
      if (segment && time >= segment.end) {
        // Loop back to start of segment
        playerRef.current.currentTime(segment.start);
      }
    } else if (eslMode === ESL_MODES.SHADOWING && segmentIndex !== -1) {
      const segment = segments[segmentIndex];
      if (segment && time >= segment.end) {
        // Pause for shadowing delay
        playerRef.current.pause();
        setTimeout(() => {
          if (playerRef.current && eslMode === ESL_MODES.SHADOWING) {
            playerRef.current.play();
          }
        }, shadowingDelay * 1000);
      }
    }
  };

  const togglePlay = () => {
    if (!playerRef.current) return;

    if (isPlaying) {
      playerRef.current.pause();
    } else {
      playerRef.current.play();
    }
  };

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
    setEslMode(mode);
    setRepeatSegment(null);
    onModeChange?.(mode);

    if (mode === ESL_MODES.REPEAT && currentSegmentIndex !== -1) {
      setRepeatSegment(currentSegmentIndex);
      seekToSegment(currentSegmentIndex);
    }
  };

  const activateRepeatMode = (segmentIndex) => {
    setEslMode(ESL_MODES.REPEAT);
    setRepeatSegment(segmentIndex);
    seekToSegment(segmentIndex);
    onModeChange?.(ESL_MODES.REPEAT);
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
          data-setup="{}"
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
