# 🎙️ Voice Assistant - SpeechtoText App

A modern, feature-rich React Native voice recording application built with Expo. This app provides a seamless press-to-talk experience with real-time audio visualization, multiple scenario testing, and beautiful UI animations.

![Voice Assistant Demo](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-blue)
![React Native](https://img.shields.io/badge/React%20Native-0.74+-green)
![Expo](https://img.shields.io/badge/Expo-SDK%2051+-black)

## ✨ Features

### 🎯 Core Functionality
- **Press-to-Talk Recording**: Hold to record, release to stop - intuitive single-button interface
- **Live Audio Visualization**: Dynamic waveform animation that reacts to audio frequency and amplitude
- **Real-time Transcription**: Mock transcription service with multiple scenario support
- **Beautiful UI/UX**: Modern, polished interface with smooth animations and transitions

### 🎨 UI Components
- **Dynamic Waveform Visualizer**: Animated waveform that moves horizontally during recording
- **Scenario Toggle**: Test different scenarios (Success, Clarification, Network Error, Server Error)
- **Processing States**: Visual feedback for recording, processing, and error states
- **Transcript History**: Scrollable list of all recorded transcripts with timestamps and duration
- **Time Picker Integration**: For clarification scenarios requiring time input

### 🔧 Technical Features
- **Audio Recording**: Uses Expo AV for cross-platform audio recording
- **File Management**: Automatic cleanup of old recordings
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Permission Management**: Seamless microphone permission requests
- **Animations**: Smooth React Native Animated API for all transitions

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Expo CLI** - Install globally: `npm install -g expo-cli`
- **iOS Simulator** (Mac only) - via Xcode
- **Android Studio** - for Android emulator
- **Expo Go app** (optional) - for testing on physical devices

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd voice-assistant-app
```

### 2. Install Dependencies

```bash
# Using npm
npm install

# Or using yarn
yarn install
```

### 3. Install Required Expo Packages

```bash
npx expo install expo-av expo-file-system @react-native-community/datetimepicker
```

### 4. Install Additional Dependencies

```bash
# For iOS icons and components
npx expo install @expo/vector-icons

# For gesture handling
npx expo install react-native-gesture-handler

# For audio management
npx expo install expo-audio

# For safe area context
npx expo install react-native-safe-area-context
```

## 🏃‍♂️ Running the App

### Development Mode

#### Start the Development Server

```bash
npx expo start
```

This will open the Expo Developer Tools in your browser at `http://localhost:8081`.

### Run on iOS Simulator (Mac only)

```bash
# Option 1: From Expo Dev Tools
Press 'i' in the terminal

# Option 2: Direct command
npx expo run:ios
```

**First-time setup:**
```bash
# Build the iOS app with native modules
npx expo prebuild
cd ios && pod install && cd ..
npx expo run:ios
```

### Run on Android Emulator

```bash
# Ensure Android emulator is running first
# Then press 'a' in the terminal or run:
npx expo run:android
```

**First-time setup:**
```bash
# Build the Android app with native modules
npx expo prebuild
npx expo run:android
```

### Run on Physical Device

1. Install **Expo Go** app from:
   - [App Store (iOS)](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play (Android)](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Scan the QR code shown in the terminal with:
   - iOS: Camera app
   - Android: Expo Go app

## 📱 Using the App

### Basic Usage

1. **Grant Permissions**: On first launch, allow microphone access
2. **Press to Record**: 
   - Tap and hold the microphone button to start recording
   - Speak your message
   - Release to stop recording
3. **View Transcript**: See your transcribed message appear in the list
4. **Switch Scenarios**: Use the toggle to test different response types

### Scenario Types

#### 🟢 Success
- Records audio and returns a mock transcript
- Plays success sound after transcription
- Default behavior for testing

#### 💬 Clarification
- Simulates a scenario where the assistant needs more information
- Shows a clarification prompt: "What time should I set it for?"
- Opens time picker for user input
- Second recording completes the flow

#### 🔴 Network Error
- Simulates network connectivity issues
- Shows error message: "Network error. Please check your connection and try again."
- Allows retry

#### 🟠 Server Error
- Simulates server-side errors
- Shows error message: "Server error. Something went wrong on our end."
- Allows retry

## 🏗️ Project Structure

```
voice-assistant-app/
├── app/
│   ├── index.tsx          # Main HomeScreen component
│   └── _layout.tsx            # Root layout
├── components/
│   ├── audio-visualizer.tsx   # Waveform visualization
│   ├── ptt-button.tsx         # Press-to-talk button
│   ├── capture-overlay.tsx    # Recording overlay with cancel
│   ├── scenario-toggle.tsx    # Scenario selector
│   └── time-picker-overlay.tsx # Time selection modal
├── services/
│   ├── AudioService.ts        # Audio recording logic
│   ├── AudioManager.ts        # Success sound playback
│   └── VoiceApi.ts           # Mock transcription API
├── constants/
│   └── data.ts               # Mock data and configurations
├── assets/
│   └── audio/                # Success sound files
├── app.json                  # Expo configuration
└── package.json              # Dependencies
```

## 🔧 Configuration

### Audio Settings

Edit `services/AudioService.ts` to customize recording settings:

```typescript
// Recording quality
ios: {
  audioQuality: Audio.IOSAudioQuality.HIGH,
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 128000,
}
```

### Mock Transcripts

Edit `services/VoiceApi.ts` to add/modify mock transcripts:

```typescript
const MOCK_TRANSCRIPTS = [
  'Hey, remind me to call Alex tomorrow at 3 PM.',
  'Set an alarm for 7 AM tomorrow morning.',
  // Add your custom transcripts here
];
```

### Animation Timing

Edit `components/audio-visualizer.tsx` to adjust animation speeds:

```typescript
const WAVE_POINTS = 60;  // Number of waveform points
duration: 2000,          // Scroll animation duration (ms)
damping: 8,              // Spring animation damping
stiffness: 150,          // Spring animation stiffness
```

## 📦 Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `expo` | ~51.0.0 | Core Expo SDK |
| `expo-av` | ~14.0.0 | Audio recording & playback |
| `expo-file-system` | ~17.0.0 | File management |
| `react-native` | 0.74+ | Core React Native |
| `@react-native-community/datetimepicker` | latest | Time picker component |
| `@expo/vector-icons` | latest | Icon library |
| `react-native-gesture-handler` | latest | Gesture handling |
| `react-native-safe-area-context` | latest | Safe area management |

## 🐛 Troubleshooting

### Common Issues

#### "Audio recording failed to start"
```bash
# Solution: Reset permissions and rebuild
npx expo prebuild --clean
npx expo run:ios  # or run:android
```

#### "Module not found" errors
```bash
# Clear cache and reinstall
rm -rf node_modules
rm -rf ios/Pods
npm install
cd ios && pod install && cd ..
```

#### "Deprecated FileSystem methods"
The app uses modern FileSystem APIs. If you encounter deprecation warnings:
- Ensure you're using the latest Expo SDK: `npx expo install expo@latest`
- Update all packages: `npx expo install --fix`

#### iOS Simulator audio not working
- Use a physical device for testing audio features
- iOS Simulator has limited audio recording capabilities

#### Android permissions issues
Add to `app.json`:
```json
{
  "expo": {
    "android": {
      "permissions": [
        "android.permission.RECORD_AUDIO"
      ]
    }
  }
}
```

### Debug Mode

Enable verbose logging:
```bash
# Run with detailed logs
npx expo start --dev-client --clear

# View device logs
# iOS
npx react-native log-ios

# Android
npx react-native log-android
```

## 🧪 Testing Scenarios

### Test Success Flow
1. Set scenario to "Success"
2. Record a voice message
3. Verify transcript appears in list
4. Check success sound plays

### Test Clarification Flow
1. Set scenario to "Clarification"
2. Record initial message
3. Wait for clarification prompt
4. Select time from picker
5. Verify follow-up transcript

### Test Error Handling
1. Set scenario to "Network Error" or "Server Error"
2. Record a message
3. Verify error message displays
4. Test retry functionality

## 🎨 Customization

### Change Theme Colors

Edit the color constants throughout the components:

```typescript
// Primary blue
'#0A84FF' → your color

// Error red
'#D32F2F' → your color

// Success green
'#34C759' → your color
```

### Modify Button Styles

Edit `components/ptt-button.tsx`:

```typescript
const styles = StyleSheet.create({
  button: {
    backgroundColor: '#YOUR_COLOR',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
});
```

### Add Custom Success Sounds

1. Add `.mp3` files to `assets/audio/`
2. Update `services/AudioManager.ts`:

```typescript
const sound = new Audio.Sound();
await sound.loadAsync(require('../assets/audio/audiofile1.mp3'));
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Review [Expo Documentation](https://docs.expo.dev/)
3. Open an issue in the repository

## 🙏 Acknowledgments

- **Expo Team** - For the amazing development platform
- **React Native Community** - For continuous support and packages
- **Contributors** - For all improvements and bug fixes

## 📚 Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo AV Documentation](https://docs.expo.dev/versions/latest/sdk/av/)
- [React Native Animated API](https://reactnative.dev/docs/animated)

---

**Built with ❤️ using Expo and React Native**
