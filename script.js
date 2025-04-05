// Get HTML elements
const videoElement = document.getElementById('video');
const overlay = document.getElementById('overlay');
const overlayCtx = overlay.getContext('2d');
const volumeIndicator = document.getElementById('volumeIndicator');
const volumeText = document.getElementById('volumeText');
const modeText = document.getElementById('modeText');

// Set canvas size to match video dimensions
overlay.width = 800;
overlay.height = 480;

// ----- Set Up Web Audio API -----
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const oscillator = audioCtx.createOscillator();
const gainNode = audioCtx.createGain();

oscillator.type = 'sine'; // Waveform type: 'sine',
oscillator.frequency.value = 440; // A4 note
oscillator.connect(gainNode); // Connect oscillator to gain node
gainNode.connect(audioCtx.destination); // Connect gain node to audio output
oscillator.start(); // Start the oscillator


// Set an initial volume
gainNode.gain.value = 0.5;

// ----- State Variable -----
// Two states: "VOLUME CONTROL" (default) and "AUDIO EQUALIZER" 
let currentState = "VOLUME CONTROL";

// ----- Gesture Threshold -----
const pinchThreshold = 0.1; // Adjust this threshold as needed

// ----- Helper Functions for Gesture Detection -----

// isPinch: Returns true if thumb and index finger are close together in one hand.
function isPinch(hand) {
  const thumbTip = hand[4];
  const indexTip = hand[8];
  const dx = thumbTip.x - indexTip.x;
  const dy = thumbTip.y - indexTip.y;
  return Math.sqrt(dx * dx + dy * dy) < pinchThreshold;
}

// ----- Set Up MediaPipe Hands -----
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});
hands.setOptions({
  maxNumHands: 2, // We need two hands for volume control.
  modelComplexity: 1, 
  minDetectionConfidence: 0.7, // Minimum confidence for detection
  minTrackingConfidence: 0.7 // Minimum confidence for tracking
});

// ----- Process Hand Results -----
hands.onResults((results) => {
  // Clear the overlay canvas each frame.
  overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
  
  // Default mode text.
  modeText.textContent = "Mode: " + currentState;
  
  // Proceed only if two hands are detected.
  if (!results.multiHandLandmarks || results.multiHandLandmarks.length !== 2) {
    volumeText.textContent = "Volume: --";
    return;
  }
  
  const hand1 = results.multiHandLandmarks[0];
  const hand2 = results.multiHandLandmarks[1];
  
  // Check if both hands are pinched.
  const bothPinched = isPinch(hand1) && isPinch(hand2);
  
  // Update state: if both hands are pinched, lock the volume.
  if (bothPinched) {
    currentState = "AUDIO EQUALIZER";
  } else {
    currentState = "VOLUME CONTROL";
  }
  
  // In VOLUME_CONTROL mode, update volume based on index finger distance.
  if (currentState === "VOLUME CONTROL") {
    const finger1 = hand1[8];
    const finger2 = hand2[8];
    
    // Draw a white line connecting the two index finger tips.
    const x1 = finger1.x * overlay.width;
    const y1 = finger1.y * overlay.height;
    const x2 = finger2.x * overlay.width;
    const y2 = finger2.y * overlay.height;
    overlayCtx.beginPath();
    overlayCtx.moveTo(x1, y1);
    overlayCtx.lineTo(x2, y2);
    overlayCtx.lineCap = 'round';
    overlayCtx.strokeStyle = 'white';
    overlayCtx.lineWidth = 4;
    overlayCtx.stroke();

    
    // Compute the normalized Euclidean distance between the two index finger tips.
    const dx = finger2.x - finger1.x;
    const dy = finger2.y - finger1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Map the distance to a volume value.
    // Example mapping: a distance of 0.2 → volume 0; a distance of 0.8 → volume 1.
    let volume = (distance - 0.2) / (0.8 - 0.2);
    volume = Math.min(Math.max(volume, 0), 1);
    gainNode.gain.value = volume;
    volumeIndicator.style.width = (volume * 100) + '%';
    volumeText.textContent = 'Volume: ' + Math.round(volume * 100);
    
  } else if (currentState === "AUDIO EQUALIZER") {
    // In locked state, display the locked volume.
    volumeText.textContent = 'Volume Locked: ' + Math.round(gainNode.gain.value * 100);

    // Adjust pitch based on the horizontal position of a single hand.
    const hand = results.multiHandLandmarks[0]; // Use the first detected hand.
    const indexFinger = hand[8]; // Index finger tip.

    // Map the horizontal position (x) to a frequency range.
    // Assuming x ranges from 0 (left) to 1 (right).
    const minFrequency = 220; // A3 note
    const maxFrequency = 880; // A5 note
    const normalizedX = indexFinger.x; // x is already normalized between 0 and 1.
    const frequency = minFrequency + (maxFrequency - minFrequency) * normalizedX;

    // Update the oscillator frequency.
    oscillator.frequency.value = frequency;

    // Display the current frequency and volume.
    volumeIndicator.style.width = (gainNode.gain.value * 100) + '%';
    volumeText.textContent = 'Volume: ' + Math.round(gainNode.gain.value * 100) + '% | Frequency: ' + Math.round(frequency) + ' Hz';
  }
  
  modeText.textContent = "Mode: " + currentState;
});

// ----- Set Up the Camera -----
// Using flipHorizontal: true so that the video and overlay appear mirrored.
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 800,
  height: 480,
  flipHorizontal: true
});
camera.start();
camera.start();