import React, { useRef, useEffect, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import './VideoPlayer.css';

const ESL_MODES = {
  NORMAL: 'normal',
  SHADOWING: 'shadowing',
  REPEAT: 'repeat'
};

const VideoPlayer = ({ 
  videoSrc, 
  posterSrc,
  subtitles,
  onTimeUpdate,
  onSegmentChange,
  currentSegmentIndex
}) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [eslMode, setEslMode] = useState(ESL_MODES.NORMAL);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showCaptions, setShowCaptions] = useState(true);
  const [shadowingDelay, setShadowingDelay] = useState(2); // seconds
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Initialize video player
  useEffect(() => {
    if (!playerRef.current) {
      const videoElement = videoRef.current;
      
      if (!videoElement) return;

      playerRef.current = videojs(videoElement, {
        controls: false,
        autoplay: false,
        preload: 'auto',
        fluid: true,
        playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
      });
      
      // Add event listeners
      playerRef.current.on('timeupdate', handleTimeUpdate);
      playerRef.current.on('play', () => setIsPlaying(true));
      playerRef.current.on('pause', () => setIsPlaying(false));
    }
    
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  // Update video source when it changes
  useEffect(() => {
    if (playerRef.current && videoSrc) {
      playerRef.current.src({ src: videoSrc, type: 'video/mp4' });
      if (posterSrc) {
        playerRef.current.poster(posterSrc);
      }
    }
  }, [videoSrc, posterSrc]);

  // Handle ESL mode changes
  useEffect(() => {
    if (!playerRef.current) return;
    
    if (eslMode === ESL_MODES.REPEAT && currentSegmentIndex !== null) {
      setupRepeatMode(currentSegmentIndex);
    } else if (eslMode === ESL_MODES.SHADOWING) {
      setupShadowingMode();
    }
  }, [eslMode, currentSegmentIndex, subtitles]);

  // Handle playback rate changes
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.playbackRate(playbackRate);
    }
  }, [playbackRate]);

  const handleTimeUpdate = () => {
    if (!playerRef.current) return;
    
    const currentTime = playerRef.current.currentTime();
    onTimeUpdate(currentTime);
    
    // Handle shadowing mode pauses
    if (eslMode === ESL_MODES.SHADOWING) {
      const currentSegment = findCurrentSegment(currentTime);
      if (currentSegment && currentTime >= currentSegment.end) {
        playerRef.current.pause();
        setTimeout(() => {
          if (playerRef.current && eslMode === ESL_MODES.SHADOWING) {
            playerRef.current.play();
          }
        }, shadowingDelay * 1000);
      }
    }
    
    // Handle repeat mode boundaries
    if (eslMode === ESL_MODES.REPEAT && currentSegmentIndex !== null) {
      const segment = subtitles[currentSegmentIndex];
      if (segment && currentTime >= segment.end) {
        playerRef.current.currentTime(segment.start);
        playerRef.current.play();
      }
    }
  };

  const findCurrentSegment = (currentTime) => {
    if (!subtitles || !subtitles.length) return null;
    
    return subtitles.find(segment => 
      currentTime >= segment.start && currentTime < segment.end
    );
  };

  const setupRepeatMode = (segmentIndex) => {
    if (!subtitles || !subtitles[segmentIndex]) return;
    
    const segment = subtitles[segmentIndex];
    playerRef.current.currentTime(segment.start);
    if (isPlaying) {
      playerRef.current.play();
    }
  };

  const setupShadowingMode = () => {
    // Just continue playing in shadowing mode
    // The timeupdate handler will manage the pauses
  };

  const handlePlayPause = () => {
    if (!playerRef.current) return;
    
    if (playerRef.current.paused()) {
      playerRef.current.play();
    } else {
      playerRef.current.pause();
    }
  };

  const handlePreviousSegment = () => {
    if (currentSegmentIndex > 0) {
      onSegmentChange(currentSegmentIndex - 1);
    }
  };

  const handleNextSegment = () => {
    if (currentSegmentIndex < subtitles.length - 1) {
      onSegmentChange(currentSegmentIndex + 1);
    }
  };

  const handleModeChange = (mode) => {
    setEslMode(mode);
  };

  const handleVolumeChange = (e) => {
    if (playerRef.current) {
      playerRef.current.volume(parseFloat(e.target.value));
    }
  };

  const handleProgressChange = (e) => {
    if (playerRef.current) {
      const newTime = (e.target.value / 100) * playerRef.current.duration();
      playerRef.current.currentTime(newTime);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '00:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentProgress = () => {
    if (!playerRef.current) return 0;
    
    const duration = playerRef.current.duration() || 0;
    const currentTime = playerRef.current.currentTime() || 0;
    return (currentTime / duration) * 100;
  };

  return (
    <div className="video-player-container">
      <div data-vjs-player>
        <video
          ref={videoRef}
          className="video-js vjs-big-play-centered"
        />
      </div>
      
      <div className="controls-container">
        <div className="progress-container">
          <input
            type="range"
            min="0"
            max="100"
            value={getCurrentProgress()}
            onChange={handleProgressChange}
            className="progress-slider"
          />
        </div>
        
        <div className="main-controls">
          <button onClick={handlePreviousSegment} className="control-button">
            <span className="icon">⏮</span>
          </button>
          
          <button onClick={handlePlayPause} className="control-button play-button">
            <span className="icon">{isPlaying ? '⏸' : '▶'}</span>
          </button>
          
          <button onClick={handleNextSegment} className="control-button">
            <span className="icon">⏭</span>
          </button>
          
          <div className="time-display">
            {formatTime(playerRef.current?.currentTime())} / {formatTime(playerRef.current?.duration())}
          </div>
          
          <div className="volume-control">
            <span className="icon">🔊</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              defaultValue="1"
              onChange={handleVolumeChange}
              className="volume-slider"
            />
          </div>
        </div>
        
        <div className="esl-controls">
          <div className="esl-mode-buttons">
            <button 
              onClick={() => handleModeChange(ESL_MODES.NORMAL)}
              className={`esl-button ${eslMode === ESL_MODES.NORMAL ? 'active' : ''}`}
            >
              NORMAL
            </button>
            <button 
              onClick={() => handleModeChange(ESL_MODES.SHADOWING)}
              className={`esl-button ${eslMode === ESL_MODES.SHADOWING ? 'active' : ''}`}
            >
              SHADOWING
            </button>
            <button 
              onClick={() => handleModeChange(ESL_MODES.REPEAT)}
              className={`esl-button ${eslMode === ESL_MODES.REPEAT ? 'active' : ''}`}
            >
              REPEAT
            </button>
          </div>
          
          <div className="playback-controls">
            <button 
              onClick={() => setPlaybackRate(Math.max(0.5, playbackRate - 0.25))}
              className="control-button small"
            >
              -
            </button>
            <span className="playback-rate">{playbackRate}x</span>
            <button 
              onClick={() => setPlaybackRate(Math.min(2, playbackRate + 0.25))}
              className="control-button small"
            >
              +
            </button>
          </div>
          
          {eslMode === ESL_MODES.SHADOWING && (
            <div className="shadowing-controls">
              <span>Delay:</span>
              <button 
                onClick={() => setShadowingDelay(Math.max(0.5, shadowingDelay - 0.5))}
                className="control-button small"
              >
                -
              </button>
              <span>{shadowingDelay}s</span>
              <button 
                onClick={() => setShadowingDelay(Math.min(10, shadowingDelay + 0.5))}
                className="control-button small"
              >
                +
              </button>
            </div>
          )}
          
          <button 
            onClick={() => setShowCaptions(!showCaptions)}
            className={`cc-button ${showCaptions ? 'active' : ''}`}
          >
            CC
          </button>
        </div>
      </div>
      
      {showCaptions && (
        <div className="captions-container">
          {currentSegmentIndex !== null && subtitles[currentSegmentIndex]?.text}
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;