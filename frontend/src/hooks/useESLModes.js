import { useState, useCallback, useRef, useEffect } from 'react';

export const ESL_MODES = {
  NORMAL: 'normal',
  SHADOWING: 'shadowing',
  REPEAT: 'repeat'
};

export const useESLModes = (playerRef, segments = []) => {
  const [eslMode, setEslMode] = useState(ESL_MODES.NORMAL);
  const [repeatSegment, setRepeatSegment] = useState(null);
  const [shadowingDelay, setShadowingDelay] = useState(2);
  const [isInShadowingPause, setIsInShadowingPause] = useState(false);

  const shadowingTimeoutRef = useRef(null);
  const lastSegmentRef = useRef(-1);
  const repeatCheckIntervalRef = useRef(null);

  // Clean up timeouts and intervals on unmount
  useEffect(() => {
    return () => {
      if (shadowingTimeoutRef.current) {
        clearTimeout(shadowingTimeoutRef.current);
      }
      if (repeatCheckIntervalRef.current) {
        clearInterval(repeatCheckIntervalRef.current);
      }
    };
  }, []);

  // Manage repeat mode interval based on state changes
  useEffect(() => {
    // Clear interval if not in repeat mode or no repeat segment
    if (eslMode !== ESL_MODES.REPEAT || repeatSegment === null) {
      if (repeatCheckIntervalRef.current) {
        clearInterval(repeatCheckIntervalRef.current);
        repeatCheckIntervalRef.current = null;
      }
      return;
    }

    // If we're in repeat mode and have a segment, ensure interval is running
    if (!repeatCheckIntervalRef.current && playerRef.current && segments[repeatSegment]) {
      const segment = segments[repeatSegment];

      repeatCheckIntervalRef.current = setInterval(() => {
        if (!playerRef.current) {
          if (repeatCheckIntervalRef.current) {
            clearInterval(repeatCheckIntervalRef.current);
            repeatCheckIntervalRef.current = null;
          }
          return;
        }

        const player = playerRef.current;
        const currentTime = player.currentTime();

        // Check if we've reached the end of the segment
        if (currentTime >= segment.end - 0.05) {
          console.log('REPEAT mode interval: Pausing at segment end', { currentTime, segmentEnd: segment.end });
          player.pause();
          player.currentTime(segment.end);
        }
        // Check if we've gone before the start (user seeked backward)
        else if (currentTime < segment.start) {
          console.log('REPEAT mode interval: Jumping back to segment start', { currentTime, segmentStart: segment.start });
          player.currentTime(segment.start);
        }
      }, 100); // Check every 100ms for more precise control
    }
  }, [eslMode, repeatSegment, segments]);

  // Handle ESL mode logic based on current time and segment
  const handleESLModeLogic = useCallback((currentTime, currentSegmentIndex) => {
    if (!playerRef.current || !segments.length) return;

    const player = playerRef.current;
    const currentSegment = segments[currentSegmentIndex];

    switch (eslMode) {
      case ESL_MODES.REPEAT:
        if (repeatSegment !== null) {
          const segment = segments[repeatSegment];
          if (segment) {
            // If we've gone past the end of the repeat segment, pause and set to end
            if (currentTime >= segment.end - 0.1) {
              console.log('REPEAT mode: Pausing at segment end', { currentTime, segmentEnd: segment.end });
              player.pause();
              player.currentTime(segment.end);
            }
            // If we've gone before the start of the repeat segment, jump back to start
            else if (currentTime < segment.start) {
              console.log('REPEAT mode: Jumping back to segment start', { currentTime, segmentStart: segment.start });
              player.currentTime(segment.start);
            }
          }
        }
        break;

      case ESL_MODES.SHADOWING:
        if (currentSegment && currentSegmentIndex !== lastSegmentRef.current) {
          lastSegmentRef.current = currentSegmentIndex;

          // Check if we've reached the end of a segment
          if (currentTime >= currentSegment.end - 0.1) {
            player.pause();
            setIsInShadowingPause(true);

            // Clear any existing timeout
            if (shadowingTimeoutRef.current) {
              clearTimeout(shadowingTimeoutRef.current);
            }

            // Resume after delay
            shadowingTimeoutRef.current = setTimeout(() => {
              if (player && eslMode === ESL_MODES.SHADOWING) {
                player.play();
                setIsInShadowingPause(false);
              }
            }, shadowingDelay * 1000);
          }
        }
        break;

      case ESL_MODES.NORMAL:
      default:
        // Normal playback - no special logic needed
        break;
    }
  }, [eslMode, repeatSegment, shadowingDelay, segments]);

  // Change ESL mode
  const changeESLMode = useCallback((mode) => {
    // Clear any existing timeouts and intervals
    if (shadowingTimeoutRef.current) {
      clearTimeout(shadowingTimeoutRef.current);
      shadowingTimeoutRef.current = null;
    }
    if (repeatCheckIntervalRef.current) {
      clearInterval(repeatCheckIntervalRef.current);
      repeatCheckIntervalRef.current = null;
    }

    setEslMode(mode);
    setIsInShadowingPause(false);
    lastSegmentRef.current = -1;

    // Reset repeat segment when leaving repeat mode
    if (mode !== ESL_MODES.REPEAT) {
      setRepeatSegment(null);
    }

    // If entering repeat mode and we have a current segment, set it as repeat segment
    if (mode === ESL_MODES.REPEAT && repeatSegment === null) {
      // This will be set by activateRepeatMode
    }
  }, [repeatSegment]);

  // Activate repeat mode for a specific segment
  const activateRepeatMode = useCallback((segmentIndex) => {
    if (!playerRef.current || !segments[segmentIndex]) return;

    const segment = segments[segmentIndex];

    // Clear any existing timeouts and intervals
    if (shadowingTimeoutRef.current) {
      clearTimeout(shadowingTimeoutRef.current);
      shadowingTimeoutRef.current = null;
    }
    if (repeatCheckIntervalRef.current) {
      clearInterval(repeatCheckIntervalRef.current);
      repeatCheckIntervalRef.current = null;
    }

    setEslMode(ESL_MODES.REPEAT);
    setRepeatSegment(segmentIndex);
    setIsInShadowingPause(false);

    // Jump to the start of the segment
    playerRef.current.currentTime(segment.start);

    console.log('REPEAT mode activated for segment', segmentIndex, segment);
  }, [segments]);

  // Deactivate repeat mode (return to normal)
  const deactivateRepeatMode = useCallback(() => {
    setEslMode(ESL_MODES.NORMAL);
    setRepeatSegment(null);
    setIsInShadowingPause(false);

    if (shadowingTimeoutRef.current) {
      clearTimeout(shadowingTimeoutRef.current);
      shadowingTimeoutRef.current = null;
    }
    if (repeatCheckIntervalRef.current) {
      clearInterval(repeatCheckIntervalRef.current);
      repeatCheckIntervalRef.current = null;
    }
  }, []);

  // Handle spacebar in repeat mode
  const handleSpacebarInRepeatMode = useCallback(() => {
    if (!playerRef.current || eslMode !== ESL_MODES.REPEAT || repeatSegment === null) {
      return false; // Let normal spacebar handling take over
    }

    const player = playerRef.current;
    const segment = segments[repeatSegment];

    if (!segment) return false;

    if (player.paused()) {
      // If paused, always restart from beginning of segment
      player.currentTime(segment.start);
      player.play();
    } else {
      // If playing, pause
      player.pause();
    }

    return true; // Indicate we handled the spacebar
  }, [eslMode, repeatSegment, segments]);

  // Adjust shadowing delay
  const adjustShadowingDelay = useCallback((delta) => {
    const newDelay = Math.max(0.5, Math.min(10, shadowingDelay + delta));
    setShadowingDelay(newDelay);
  }, [shadowingDelay]);

  // Get current mode info
  const getModeInfo = useCallback(() => {
    const info = {
      mode: eslMode,
      isRepeatMode: eslMode === ESL_MODES.REPEAT,
      isShadowingMode: eslMode === ESL_MODES.SHADOWING,
      isNormalMode: eslMode === ESL_MODES.NORMAL,
      repeatSegment,
      shadowingDelay,
      isInShadowingPause
    };

    if (eslMode === ESL_MODES.REPEAT && repeatSegment !== null) {
      info.repeatSegmentInfo = segments[repeatSegment];
    }

    return info;
  }, [eslMode, repeatSegment, shadowingDelay, isInShadowingPause, segments]);

  // Check if a segment can be played in current mode
  const canPlaySegment = useCallback((segmentIndex) => {
    if (eslMode === ESL_MODES.REPEAT) {
      return segmentIndex === repeatSegment;
    }
    return true;
  }, [eslMode, repeatSegment]);

  return {
    // State
    eslMode,
    repeatSegment,
    shadowingDelay,
    isInShadowingPause,
    
    // Actions
    changeESLMode,
    activateRepeatMode,
    deactivateRepeatMode,
    adjustShadowingDelay,
    handleESLModeLogic,
    handleSpacebarInRepeatMode,
    
    // Utilities
    getModeInfo,
    canPlaySegment,
    
    // Constants
    ESL_MODES
  };
};

export default useESLModes;
