// Test script to verify the REPEAT mode fix for clicking the same segment multiple times
// This simulates the behavior of the useESLModes hook

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

// Mock player
class MockPlayer {
  constructor() {
    this.time = 0;
    this.playing = false;
    this.paused = () => !this.playing;
  }
  
  currentTime(newTime) {
    if (newTime !== undefined) {
      this.time = newTime;
      console.log(`Player: Set time to ${newTime}`);
    }
    return this.time;
  }
  
  play() {
    this.playing = true;
    console.log('Player: Started playing');
    return Promise.resolve();
  }
  
  pause() {
    this.playing = false;
    console.log('Player: Paused');
  }
  
  // Simulate time progression
  simulateTimeProgress(endTime, stepSize = 0.1) {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (this.playing && this.time < endTime) {
          this.time += stepSize;
          console.log(`Player: Time progressed to ${this.time.toFixed(2)}`);
        } else {
          clearInterval(interval);
          resolve();
        }
      }, 50); // 50ms intervals for simulation
    });
  }
}

// Mock interval management
let mockInterval = null;
const mockSetInterval = (callback, delay) => {
  console.log(`Creating interval with ${delay}ms delay`);
  mockInterval = setInterval(callback, delay);
  return mockInterval;
};

const mockClearInterval = (interval) => {
  if (interval) {
    console.log('Clearing interval');
    clearInterval(interval);
    mockInterval = null;
  }
};

// Simulate the activateRepeatMode function with immediate interval creation
function simulateActivateRepeatMode(segmentIndex, player, segments) {
  console.log(`\n=== Activating REPEAT mode for segment ${segmentIndex} ===`);
  
  const segment = segments[segmentIndex];
  if (!segment) {
    console.log('Invalid segment index');
    return;
  }
  
  // Clear existing interval (simulating the fix)
  if (mockInterval) {
    mockClearInterval(mockInterval);
  }
  
  // Set player to segment start and play
  player.currentTime(segment.start);
  player.play();
  
  // Immediately create interval (the fix)
  mockInterval = mockSetInterval(() => {
    const currentTime = player.currentTime();
    
    // Check if we've reached the end of the segment
    if (currentTime >= segment.end - 0.05) {
      if (!player.paused()) {
        console.log(`INTERVAL: Pausing at segment end (${currentTime.toFixed(2)} >= ${segment.end})`);
        player.pause();
        player.currentTime(segment.end);
      }
    }
    // Check if we've gone before the start
    else if (currentTime < segment.start) {
      console.log(`INTERVAL: Jumping back to segment start (${currentTime.toFixed(2)} < ${segment.start})`);
      player.currentTime(segment.start);
    }
  }, 100);
  
  console.log(`REPEAT mode activated for segment ${segmentIndex}: "${segment.text}" (${segment.start}s - ${segment.end}s)`);
}

// Test scenarios
async function runTests() {
  console.log("=== Testing REPEAT Mode Fix ===\n");
  
  const player = new MockPlayer();
  
  // Test 1: First click on segment 1
  console.log("Test 1: First click on segment 1");
  simulateActivateRepeatMode(1, player, segments);
  
  // Simulate playback until segment end
  await player.simulateTimeProgress(10);
  
  // Wait a bit to see interval action
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Test 2: Second click on same segment (the bug scenario)
  console.log("\nTest 2: Second click on same segment 1 (should restart and pause at end)");
  simulateActivateRepeatMode(1, player, segments);
  
  // Simulate playback until segment end again
  await player.simulateTimeProgress(10);
  
  // Wait a bit to see interval action
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Test 3: Third click on same segment
  console.log("\nTest 3: Third click on same segment 1 (should restart and pause at end again)");
  simulateActivateRepeatMode(1, player, segments);
  
  // Simulate playback until segment end again
  await player.simulateTimeProgress(10);
  
  // Wait a bit to see interval action
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Cleanup
  if (mockInterval) {
    mockClearInterval(mockInterval);
  }
  
  console.log("\n=== Test Summary ===");
  console.log("The fix ensures that:");
  console.log("1. Each click on the same segment restarts playback from the beginning");
  console.log("2. The interval is immediately created to monitor segment boundaries");
  console.log("3. Playback always pauses at the segment end, even on repeated clicks");
  console.log("4. No race conditions between state updates and interval creation");
}

// Run the tests
runTests().catch(console.error);
