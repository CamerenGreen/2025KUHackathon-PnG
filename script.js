// Get HTML elements
const videoElement = document.getElementById('video');
const overlay = document.getElementById('overlay');
const overlayCtx = overlay.getContext('2d');
const volumeIndicator = document.getElementById('volumeIndicator');
const volumeText = document.getElementById('volumeText');
const modeText = document.getElementById('modeText');
const visualizerCanvas = document.getElementById('audioVisualizer');
const visualizerCtx = visualizerCanvas.getContext('2d');
let analyser; // Analyser node for audio visualization

// Get the audio file input and play button elements
const audioFileInput = document.getElementById('audioFile');
const playAudioButton = document.getElementById('playAudio');

// Set canvas size
visualizerCanvas.width = 800;
visualizerCanvas.height = 60;

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


// Modify the audio setup to include visualization
function setupAudioVisualizer(audioSource) {
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512; // Size of the FFT (Fast Fourier Transform)
  audioSource.connect(analyser); // Connect the audio source to the analyser
  visualize(); // Start the visualization
} 

function visualize() {
  if (!analyser) return;
  
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  function draw() {
      requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      
      visualizerCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
      
      // Draw volume indicator background
      const volumeWidth = (gainNode.gain.value * 100) + '%';
      visualizerCtx.fillStyle = 'rgba(0, 255, 127, 0.1)';
      visualizerCtx.fillRect(0, 0, visualizerCanvas.width * gainNode.gain.value, visualizerCanvas.height);
      
      // Draw waveform
      const barWidth = (visualizerCanvas.width / bufferLength) * 2.5;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * visualizerCanvas.height;
          
          // Gradient based on frequency
          const hue = i / bufferLength * 360;
          visualizerCtx.fillStyle = `hsla(${hue}, 100%, 50%, 0.8)`;
          
          visualizerCtx.fillRect(
              x,
              visualizerCanvas.height - barHeight,
              barWidth,
              barHeight
          );
          
          x += barWidth + 1;
      }
  }
  
  draw();
}

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
    setupAudioVisualizer(audioSource); // Set up the audio visualizer
    audioElement.play(); // Play the audio file
  }
});

// Add event listener to the play button
playAudioButton.addEventListener('click', () => {
  const file = audioFileInput.files[0];
  if (file) {
    const fileURL = URL.createObjectURL(file);
    audio.src = fileURL;
    const audioSource = audioCtx.createMediaElementSource(audio); // Create a media element source from the audio element
    audioSource.connect(gainNode); // Connect the audio source to the gain node
    setupAudioVisualizer(audioSource); // Set up the audio visualizer
    audio.play(); // Play the audio file
    audio.loop = true; // Loop the audio
  } else {
    alert('Please upload an audio file first.');
  }
});

// Trigger the file input dialog
audioInput.click();

// Set an initial volume
gainNode.gain.value = 0.5;

// ----- State Variable -----
// Three states: "VOLUME CONTROL", "AUDIO EQUALIZER", "TOTAL LOCK"
let currentState = "AUDIO EQUALIZER"; // Initialize the current state in AUDIO EQUALIZER mode

// ----- Gesture Threshold -----
const pinchThreshold = 0.1; // Adjust this threshold as needed

// ----- Dynamic Mode Texts for UI -----
const modeTexts = {
  "VOLUME CONTROL": "Separate index fingers to change volume. Pinch to alter frequency and lock volume or open hands to lock both.",
  "AUDIO EQUALIZER": "Separate pinched fingers to lock volume and adjust frequency. Unpinch and raise index fingers to alter volume and lock frequency or open hands to lock both.",
  "TOTAL LOCK": "Open both palms facing the camera to lock both volume and frequency. Pinch to unlock and alter frequency or raise index fingers to alter volume.",
  "FULL RESET": "Reset to default state. Pinch hands to lock volume and frequency or open hands to lock both."
};

// Get the dynamic mode text element
const dynamicModeText = document.getElementById('dynamicModeText');

// Function to update mode text and description
function updateModeUI() {
  // Only update if we have a valid state change
  if (currentState === previousState) return;

  // Update the mode text
  modeText.textContent = "Mode: " + currentState;
  
  // Get the text element
  const textElement = document.getElementById('dynamicModeText');
  textElement.style.opacity = 0; // Start with opacity 0 for fade out effect
  
  // Wait for fade out to complete before changing text and fading in
  setTimeout(() => {
    textElement.textContent = modeTexts[currentState] || "Unknown Mode";
    textElement.style.opacity = 1; // Fade in effect
  }, 300); // Matches the CSS transition duration
}

// Initialize the UI with active class
function initializeUI() {
  modeText.textContent = "Mode: " + currentState;
  dynamicModeText.textContent = modeTexts[currentState] || "Unknown Mode";
  // Force reflow to enable transition
  void dynamicModeText.offsetWidth;
  dynamicModeText.classList.add('active');
}

// Start the working the UI
initializeUI();

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
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` // Load MediaPipe Hands API model
});
hands.setOptions({
  maxNumHands: 2, // We need two hands for volume control.
  modelComplexity: 1, 
  minDetectionConfidence: 0.7, // Minimum confidence for detection
  minTrackingConfidence: 0.7 // Minimum confidence for tracking
});

// ----- Process Hand Results -----

let previousState = null; // Initialize previous state to null

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
  
  // Check for gestures for both hands.
  const bothPinched = isPinch(hand1) && isPinch(hand2); // Both hands pinched
  const bothOpen = openPalm(hand1) && openPalm(hand2); // Both hands open
  const onlyIndexes = onlyIndex(hand1) && onlyIndex(hand2); // Only index fingers showing
  const oneOpen = openPalm(hand1) | openPalm(hand2); // Only index finger showing in hand 1


  // Determine the new state based on the gestures.
  let newState = currentState; 
  if (bothPinched) {
    newState = "AUDIO EQUALIZER";
  } else if (onlyIndexes) {
    // If only the index fingers are showing, switch to volume control mode.
    newState = "VOLUME CONTROL";
  } else if (bothOpen) {
    // If both hands are open, switch to total lock mode.
    newState = "TOTAL LOCK";
  } else if (oneOpen) {
    newState = "FULL RESET"; // Reset to default state if only one index finger is showing
  }
  
  // Only update if state actually changed
  if (newState !== currentState) {
    previousState = currentState;
    currentState = newState;
    updateModeUI();
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
    const maxFrequency = 660; // A4 note (1.5x playback speed)
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
  } else if (currentState === "FULL RESET") {
    // Reset to default state if only one index finger is showing.
    volumeText.textContent = 'Volume: ' + Math.round(gainNode.gain.value * 100) + '% | Frequency: ' + Math.round(oscillator.frequency.value) + ' Hz';
    gainNode.gain.value = 0.75; // Reset volume to default
    oscillator.frequency.value = 440; // Reset frequency to default (A4 note)
    audio.playbackRate = 1; // Reset playback rate to default
  }
  
  modeText.textContent = "Mode: " + currentState;
});

// ----- Set Up the Camera -----
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement }); // Send the video frame to MediaPipe Hands for processing
  },
  width: 800,
  height: 480,
  flipHorizontal: true // Flip the camera feed for a mirror effect
});
camera.start();
