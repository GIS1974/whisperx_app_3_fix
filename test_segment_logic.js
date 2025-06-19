// Test script to verify the segment detection logic fix
// This simulates the behavior of the useVideoPlayer hook

const ESL_MODES = {
  NORMAL: 'normal',
  SHADOWING: 'shadowing',
  REPEAT: 'repeat'
};

// Mock segments data
const segments = [
  { start: 0, end: 5, text: "Hello world" },
  { start: 5, end: 10, text: "This is a test" },
  { start: 10, end: 15, text: "Segment three" }
];

// Original segment detection logic (problematic)
function findCurrentSegmentOriginal(time, segments) {
  if (!segments.length) return -1;
  
  return segments.findIndex(segment => 
    time >= segment.start && time < segment.end
  );
}

// Fixed segment detection logic
function findCurrentSegmentFixed(time, segments, eslMode, repeatSegment) {
  if (!segments.length) return -1;
  
  // In REPEAT mode, the current segment should always be the repeat segment
  if (eslMode === ESL_MODES.REPEAT && repeatSegment !== null) {
    return repeatSegment;
  }
  
  // Normal segment detection based on time
  return segments.findIndex(segment => 
    time >= segment.start && time < segment.end
  );
}

// Test scenarios
console.log("=== Testing Segment Detection Logic ===\n");

// Test 1: Normal mode - time within segment
console.log("Test 1: Normal mode, time = 7 (within segment 1)");
const result1Original = findCurrentSegmentOriginal(7, segments);
const result1Fixed = findCurrentSegmentFixed(7, segments, ESL_MODES.NORMAL, null);
console.log(`Original: ${result1Original}, Fixed: ${result1Fixed}`);
console.log(`Expected: 1, Both should return 1\n`);

// Test 2: Normal mode - time at segment end (problematic case)
console.log("Test 2: Normal mode, time = 10 (at segment 1 end)");
const result2Original = findCurrentSegmentOriginal(10, segments);
const result2Fixed = findCurrentSegmentFixed(10, segments, ESL_MODES.NORMAL, null);
console.log(`Original: ${result2Original}, Fixed: ${result2Fixed}`);
console.log(`Expected: 2, Both should return 2\n`);

// Test 3: REPEAT mode - time within repeat segment
console.log("Test 3: REPEAT mode, repeatSegment = 1, time = 7 (within segment)");
const result3Original = findCurrentSegmentOriginal(7, segments);
const result3Fixed = findCurrentSegmentFixed(7, segments, ESL_MODES.REPEAT, 1);
console.log(`Original: ${result3Original}, Fixed: ${result3Fixed}`);
console.log(`Expected: Original=1, Fixed=1, Both should return 1\n`);

// Test 4: REPEAT mode - time at segment end (the bug case)
console.log("Test 4: REPEAT mode, repeatSegment = 1, time = 10 (at segment end)");
const result4Original = findCurrentSegmentOriginal(10, segments);
const result4Fixed = findCurrentSegmentFixed(10, segments, ESL_MODES.REPEAT, 1);
console.log(`Original: ${result4Original}, Fixed: ${result4Fixed}`);
console.log(`Expected: Original=2 (wrong!), Fixed=1 (correct!)`);
console.log(`This is the bug we're fixing - in REPEAT mode, segment 1 should stay highlighted\n`);

// Test 5: REPEAT mode - time outside repeat segment
console.log("Test 5: REPEAT mode, repeatSegment = 1, time = 12 (outside segment)");
const result5Original = findCurrentSegmentOriginal(12, segments);
const result5Fixed = findCurrentSegmentFixed(12, segments, ESL_MODES.REPEAT, 1);
console.log(`Original: ${result5Original}, Fixed: ${result5Fixed}`);
console.log(`Expected: Original=2, Fixed=1 (repeat segment should stay highlighted)\n`);

console.log("=== Summary ===");
console.log("The fix ensures that in REPEAT mode, the repeatSegment always stays highlighted,");
console.log("regardless of the exact current time position. This prevents the visual highlight");
console.log("from being removed when the video is paused at the segment end.");
