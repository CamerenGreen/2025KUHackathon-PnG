// Get HTML elements
const videoElement = document.getElementById('video');
const volumeIndicator = document.getElementById('volumeIndicator');
const volumeText = document.getElementById('volumeText');

// ----- Set Up Web Audio API -----
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const oscillator = audioCtx.createOscillator();
const gainNode = audioCtx.createGain();

oscillator.type = 'sine';
oscillator.frequency.value = 440; // A4 note
oscillator.connect(gainNode);
gainNode.connect(audioCtx.destination);
oscillator.start();

// Set an initial volume (gain)
gainNode.gain.value = 0.5;

// ----- Set Up MediaPipe Hands -----
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 2,            // We'll detect two hands
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

// Callback to process MediaPipe results
hands.onResults((results) => {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length === 2) {
    // Get landmarks for both hands
    const landmarks1 = results.multiHandLandmarks[0];
    const landmarks2 = results.multiHandLandmarks[1];

    // Use the index finger tip (landmark index 8) for each hand
    const finger1 = landmarks1[8]; // {x, y, z} normalized coordinates
    const finger2 = landmarks2[8];

    // Calculate Euclidean distance between the two index finger tips
    const dx = finger2.x - finger1.x;
    const dy = finger2.y - finger1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Map the distance to volume.
    // Assume a distance of 0.2 corresponds to volume 0 and 0.8 to volume 1.
    let volume = (distance - 0.2) / (0.8 - 0.2);
    volume = Math.min(Math.max(volume, 0), 1);  // Clamp volume between 0 and 1

    // Update the gain node's volume
    gainNode.gain.value = volume;

    // Update the on-screen volume indicator (0 to 100 scale)
    volumeIndicator.style.width = (volume * 100) + '%';
    volumeText.textContent = 'Volume: ' + Math.round(volume * 100);

    console.log("Volume set to:", volume, "Distance:", distance);
  } else {
    console.log("Two hands are needed to control volume. Detected:", results.multiHandLandmarks ? results.multiHandLandmarks.length : 0);
  }
});

// ----- Set Up the Camera -----
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 640,
  height: 480
});
camera.start();
