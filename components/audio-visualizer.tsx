import { audioService } from '@/services/AudioService';
import React from 'react';
import { Animated, Dimensions, Platform, StyleSheet, View } from 'react-native';

const { width } = Dimensions.get('window');
const WAVE_WIDTH = width - 80;
const WAVE_POINTS = 60;

type Props = {
  isRecording: boolean;
};

export const AudioVisualizer: React.FC<Props> = ({ isRecording }) => {
  // Waveform data points
  const waveData = React.useRef<Animated.Value[]>(
    Array.from({ length: WAVE_POINTS }, () => new Animated.Value(0))
  ).current;
  
  // Horizontal scroll animation for moving waveform
  const scrollAnim = React.useRef(new Animated.Value(0)).current;
  const scrollLoopRef = React.useRef<Animated.CompositeAnimation | null>(null);
  
  
  const [recordingTime, setRecordingTime] = React.useState(0);
  const startTimeRef = React.useRef<number | null>(null);
  
  // Buffers for audio data
  const meterBuffer = React.useRef<number[]>([]);
  const frequencyBuffer = React.useRef<number[]>([]);
  const requestRef = React.useRef<number | null>(null);
  
  // Web Audio API refs
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);
  const dataArrayRef = React.useRef<Float32Array | null>(null);

  const updateWaveform = React.useCallback(async () => {
    if (!isRecording) {
      startTimeRef.current = null;
      meterBuffer.current = [];
      frequencyBuffer.current = [];
      return;
    }

    // Update timer
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }
    setRecordingTime(Date.now() - startTimeRef.current);

    try {
      let normalizedMeter = 0;
      let frequency = 0;

      if (Platform.OS === 'web') {
        const analyser = analyserRef.current;
        const dataArray = dataArrayRef.current;
        const audioCtx = audioCtxRef.current;
        
        if (analyser && dataArray && audioCtx) {
          analyser.getFloatTimeDomainData(dataArray as any);
          const freq = autoCorrelate(dataArray, audioCtx.sampleRate) || 0;
          frequency = freq;

          // Calculate RMS for amplitude
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);
          normalizedMeter = Math.min(1, rms * 15);
        }
      } else {
        // Native: use AudioService
        const status = await audioService.getRecordingStatus();
        if (status) {
          const { metering = -160, frequency: freq = 0 } = status;
          normalizedMeter = Math.max(0, (metering + 160) / 160);
          frequency = freq;
        }
      }

      // Add to buffers
      meterBuffer.current.push(normalizedMeter);
      frequencyBuffer.current.push(frequency);
      
      // Keep only recent data
      if (meterBuffer.current.length > WAVE_POINTS) {
        meterBuffer.current.shift();
        frequencyBuffer.current.shift();
      }

      // Animate waveform points
      waveData.forEach((anim, i) => {
        const meter = meterBuffer.current[i] || 0;
        const freq = frequencyBuffer.current[i] || 0;
        
        // Combine amplitude and frequency for height
        // Higher frequency = taller waves, higher amplitude = more pronounced
        const freqFactor = Math.min(1, freq / 1000); // Normalize to 0-1
        const height = meter * (0.5 + freqFactor * 0.5); // Scale by frequency
        
        Animated.spring(anim, {
          toValue: height,
          useNativeDriver: true,
          damping: 8,
          stiffness: 150,
          mass: 0.3,
        }).start();
      });

    } catch (e) {
      console.error('Waveform update error:', e);
    }
    
    requestRef.current = requestAnimationFrame(updateWaveform);
  }, [isRecording, waveData]);

  React.useEffect(() => {
    if (isRecording) {
      // Start web audio if on web
      if (Platform.OS === 'web') {
        startWebAudio().catch(console.error);
      }
      
      // Start continuous scroll animation (store ref so we can stop it)
      scrollLoopRef.current = Animated.loop(
        Animated.timing(scrollAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      scrollLoopRef.current.start();
      
      // No color animation to avoid mixing JS-driven color with native-driven transforms
      
      requestRef.current = requestAnimationFrame(updateWaveform);
    } else {
      // Reset animations: stop scroll loop then reset value via native timing to avoid JS-driven setValue
      if (scrollLoopRef.current) {
        scrollLoopRef.current.stop();
        scrollLoopRef.current = null;
      }
      Animated.timing(scrollAnim, { toValue: 0, duration: 1, useNativeDriver: true }).start();
  // reset values
      
      waveData.forEach(anim => {
        Animated.timing(anim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start();
      });
      
      if (Platform.OS === 'web') {
        stopWebAudio();
      }
      
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    }
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      if (Platform.OS === 'web') {
        stopWebAudio();
      }
    };
  }, [isRecording, waveData, scrollAnim, updateWaveform]);

  // Web Audio setup
  const startWebAudio = async () => {
    try {
      if (audioCtxRef.current) return;
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      dataArrayRef.current = new Float32Array(analyser.fftSize);
    } catch (e) {
      console.error('Failed to start WebAudio:', e);
    }
  };

  const stopWebAudio = () => {
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      analyserRef.current = null;
      dataArrayRef.current = null;
    } catch (e) {
      console.warn('Error stopping WebAudio:', e);
    }
  };

  // Pitch detection algorithm
  const autoCorrelate = (buffer: Float32Array, sampleRate: number): number | null => {
    const SIZE = buffer.length;
    let rms = 0;
    
    for (let i = 0; i < SIZE; i++) {
      const val = buffer[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return null;

    let r1 = 0, r2 = SIZE - 1;
    const thres = 0.2;
    
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buffer[i]) < thres) {
        r1 = i;
        break;
      }
    }
    
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buffer[SIZE - i]) < thres) {
        r2 = SIZE - i;
        break;
      }
    }

    buffer = buffer.slice(r1, r2);
    const newSize = buffer.length;

    const c = new Array(newSize).fill(0);
    for (let i = 0; i < newSize; i++) {
      for (let j = 0; j < newSize - i; j++) {
        c[i] = c[i] + buffer[j] * buffer[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    
    let maxval = -1, maxpos = -1;
    for (let i = d; i < newSize; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }
    
    let T0 = maxpos;
    if (T0 === 0) return null;

    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    const freq = sampleRate / T0;
    if (!isFinite(freq) || freq <= 0 || freq > 5000) return null;
    return freq;
  };

  // Use a static color for waveform to avoid mixing native and JS drivers
  const waveColor = '#0A84FF';

  return (
    <View style={styles.container}>
      <View style={styles.waveformContainer}>
        <View style={styles.centerLine} />
        
        {waveData.map((anim, index) => {
          // Create smooth wave curve effect
          const translateX = scrollAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -10],
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.wavePoint,
                {
                  left: (index / WAVE_POINTS) * WAVE_WIDTH,
                  transform: [
                    { translateX },
                    {
                      translateY: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -60],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.waveDot,
                  {
                    backgroundColor: waveColor,
                    transform: [
                      {
                        scale: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.5, 1.5],
                        }),
                      },
                    ],
                  },
                ]}
              />
              
              {/* Mirror wave below center line */}
              <Animated.View
                style={[
                  styles.waveDot,
                  styles.mirrorDot,
                  {
                    backgroundColor: waveColor,
                    transform: [
                      {
                        scale: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.5, 1.5],
                        }),
                      },
                      {
                        translateY: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 120],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
    width: '100%',
  },
  waveformContainer: {
    width: WAVE_WIDTH,
    height: 120,
    position: 'relative',
    overflow: 'hidden',
  },
  centerLine: {
    position: 'absolute',
    top: 90,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(10, 132, 255, 0.2)',
  },
  wavePoint: {
    position: 'absolute',
    top: 60,
  },
  waveDot: {
    width: 4,
    height: 100,
    borderRadius: 2,
  },
  mirrorDot: {
    position: 'absolute',
    top: 0,
  },
});