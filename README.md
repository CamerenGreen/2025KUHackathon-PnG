# VisionEQ: Audio Equalizer Controlled with Object Detection  

A web-based application that allows users to control audio volume and frequency using hand gestures via computer vision.

![Visual Equalizer Demo](demo.gif) *Example of the Visual Equalizer in action will go here*

## Features

- **Hand Gesture Control**:
  - Volume adjustment by separating index fingers
  - Frequency modulation by pinching gestures
  - Multiple control modes (Volume Control, Audio Equalizer, Total Lock)

- **Audio Visualization**:
  - Real-time audio waveform visualization
  - Volume level indicator
  - Frequency spectrum display

- **Audio Input**:
  - Upload and play custom audio files
  - Built-in oscillator for testing without audio files

- **Responsive UI**:
  - Clear mode descriptions
  - Visual feedback for gestures
  - Volume and frequency indicators

## Technologies Used

- **Frontend**:
  - HTML5, CSS3, JavaScript
  - MediaPipe Hands for hand tracking
  - Web Audio API for audio processing

- **Libraries**:
  - MediaPipe Hands (for hand gesture recognition)
  - Web Audio API (for audio processing and visualization)

## Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/CamerenGreen/visual-equalizer.git
   cd visual-equalizer
   
2. **Open the application**:
  - Simply open index.html in a modern web browser (Chrome/Firefox recommended)
  - No server is required as it runs client-side

3. **Using the application**:
  - Grant camera permissions when prompted
  - Upload an audio file or use the built-in oscillator
  - Use hand gestures to control volume and frequency:
    - Separate index fingers to adjust volume
    - Pinch gestures to adjust frequency
    - Open palms to lock settings

## Future Updates
- Add preset frequency bands for equalizer mode
- Implement gesture customization
- Add support for mobile devices
- Include demo audio files




