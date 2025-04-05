// Get HTML elements
const videoElement = document.getElementById('video');
const overlay = document.getElementById('overlay');
const overlayCtx = overlay.getContext('2d');
const volumeIndicator = document.getElementById('volumeIndicator');
const volumeText = document.getElementById('volumeText');
const modeText = document.getElementById('modeText');

// Get the audio file input and play button elements
const audioFileInput = document.getElementById('audioFile');
const playAudioButton = document.getElementById('playAudio');

// Set canvas size to match video dimensions
overlay.width = 800;
overlay.height = 480;

// ----- Set Up Web Audio API -----
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const oscillator = audioCtx.createOscillator();
const gainNode = audioCtx.createGain();
const audio = new Audio();


oscillator.type = 'sine'; // Waveform type: 'sine',
oscillator.frequency.value = 440; // A4 note
oscillator.connect(gainNode); // Connect oscillator to gain node
gainNode.connect(audioCtx.destination); // Connect gain node to audio output
oscillator.start(); // Start the oscillator



// Set up an audio context based on the user's device
// Prompt the user to select an audio file
const audioInput = document.createElement('input');
audioInput.type = 'file';
audioInput.accept = 'audio/*';
audioInput.style.display = 'none';
document.body.appendChild(audioInput);



// Add event listener to the audio input
audioInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const fileURL = URL.createObjectURL(file);
    const audioElement = new Audio(fileURL);
    const audioSource = audioCtx.createMediaElementSource(audioElement);

    // Connect the audio source to the gain node and destination
    audioSource.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Play the audio
    audioElement.play();
  }
});

// Add event listener to the play button
playAudioButton.addEventListener('click', () => {
  const file = audioFileInput.files[0];
  if (file) {
    const fileURL = URL.createObjectURL(file);
    audio.src = fileURL;
    audio.play();
  } else {
    alert('Please upload an audio file first.');
  }
});

// Trigger the file input dialog
audioInput.click();

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
  const thumbTip = hand[4]; // Thumb tip
  const indexTip = hand[8]; // Index finger tip
  const dx = thumbTip.x - indexTip.x; // Horizontal distance between thumb and index finger tips
  const dy = thumbTip.y - indexTip.y; // Vertical distance between thumb and index finger tips
  // Check if the distance between thumb and index finger is less than the pinch threshold
  return Math.sqrt(dx * dx + dy * dy) < pinchThreshold;
}

// onlyIndex: Returns true if only the index finger is showing, not pinching.
function onlyIndex(hand) {
  const indexTip = hand[8]; // Index finger tip
  const middleTip = hand[12]; // Middle finger tip
  const ringTip = hand[16]; // Ring finger tip
  const pinkyTip = hand[20]; // Pinky finger tip

  // Check if the index finger is extended while other fingers are not.
  return (
    indexTip.y < middleTip.y &&
    indexTip.y < ringTip.y &&
    indexTip.y < pinkyTip.y
  );
}

// openPalm: Returns true if the hand is open (not pinching).
function openPalm(hand) {
  const thumbTip = hand[4]; // Thumb tip
  const indexTip = hand[8]; // Index finger tip
  const middleTip = hand[12]; // Middle finger tip
  const ringTip = hand[16]; // Ring finger tip
  const pinkyTip = hand[20]; // Pinky finger tip
  const dx = thumbTip.x - indexTip.x; // Horizontal distance between thumb and index finger tips
  const dy = thumbTip.y - indexTip.y; // Vertical distance between thumb and index finger tips
  // Check if the distance between thumb and index finger is greater than the pinch threshold
  return Math.sqrt(dx * dx + dy * dy) > pinchThreshold;
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
  const bothOpen = openPalm(hand1) && openPalm(hand2);
  const onlyIndexes = onlyIndex(hand1) && onlyIndex(hand2);


  // Update state: if both hands are pinched, lock the volume.
  if (bothPinched) {
    currentState = "AUDIO EQUALIZER";
  } else if (onlyIndexes) {
    // If only the index fingers are showing, switch to volume control mode.
    currentState = "VOLUME CONTROL";
  } else if (bothOpen) {
    // If both hands are open, switch to total lock mode.
    currentState = "TOTAL LOCK";
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
    
    // Update the volume of the user-inputted audio. 
    if (audio) {
      audio.volume = volume;
    }
    
  } else if (currentState === "AUDIO EQUALIZER") {
    // In locked state, display the locked volume.
    volumeText.textContent = 'Volume Locked: ' + Math.round(gainNode.gain.value * 100);

    // Adjust pitch based on the horizontal position of a single hand.
    const hand = results.multiHandLandmarks[0]; // Use the first detected hand.
    const indexFinger = hand[8]; // Index finger tip.
    // Stop the default oscillator sound when a user audio file is loaded.
    oscillator.stop();
    // Map the horizontal position (x) to a frequency range.
    // Assuming x ranges from 0 (left) to 1 (right).
    const minFrequency = 220; // A2 note (1/4th playback speed)
    const maxFrequency = 660; // A4 note (normal frequency)
    const normalizedX = indexFinger.x; // x is already normalized between 0 and 1.
    const frequency = minFrequency + (maxFrequency - minFrequency) * normalizedX;

    // Update the oscillator frequency.
    oscillator.frequency.value = frequency;

    // Display the current frequency and volume.
    volumeIndicator.style.width = (gainNode.gain.value * 100) + '%';
    volumeText.textContent = 'Volume: ' + Math.round(gainNode.gain.value * 100) + '% | Frequency: ' + Math.round(frequency) + ' Hz';
    if (audio) {
      audio.playbackRate = frequency / 440; // Adjust playback rate based on frequency
    }
  } else if (currentState === "TOTAL LOCK") {
    // In total lock state, keep the volume and frequency unchanged.
    volumeText.textContent = 'Volume Locked at: ' + Math.round(gainNode.gain.value * 100) + '% | Frequency Locked at ' + Math.round(oscillator.frequency.value) + ' Hz';
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
