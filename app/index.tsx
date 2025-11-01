import { AudioVisualizer } from '@/components/audio-visualizer';
import { CaptureOverlay } from '@/components/capture-overlay';
import { PttButton } from '@/components/ptt-button';
import { ScenarioToggle } from '@/components/scenario-toggle';
import { TimePickerOverlay } from '@/components/time-picker-overlay';
import { audioManager } from '@/services/AudioManager';
import { audioService } from '@/services/AudioService';
import { ProcessVoiceInput, voiceApi } from '@/services/VoiceApi';
import React, { useEffect, useState } from 'react';
import {
  Animated,
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';

type UiState = 'idle' | 'listening' | 'processing' | 'clarification' | 'error';

type Recording = {
  transcript: string;
  uri: string;
  timestamp: number;
  durationSec?: number;
};

export default function HomeScreen() {
  const [state, setState] = useState<UiState>('idle');
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clarifyPrompt, setClarifyPrompt] = useState<string | null>(null);
  const [scenario, setScenario] = useState<'success' | 'clarify' | 'networkError' | 'serverError'>('success');
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Track whether we're using live recognition
  const liveModeRef = React.useRef(false);
  
  // Animation values
  const headerOpacity = React.useRef(new Animated.Value(1)).current;
  const listOpacity = React.useRef(new Animated.Value(1)).current;
  
  // Update the voice API scenario when it changes
  useEffect(() => {
    voiceApi.setScenario(scenario);
  }, [scenario]);
  
  // Show time picker when we get a time-related clarification prompt
  useEffect(() => {
    if (clarifyPrompt?.toLowerCase().includes('what time')) {
      setShowTimePicker(true);
    }
  }, [clarifyPrompt]);

  useEffect(() => {
    // Load success sounds and clean up old recordings
    Promise.all([
      audioManager.loadSounds(),
      audioService.cleanupOldRecordings()
    ]).catch(console.error);

    // Cleanup sounds on unmount
    return () => {
      audioManager.cleanup().catch(console.error);
      voiceApi.destroy().catch(console.error);
    };
  }, []);

  // Fade out header and list when recording
  useEffect(() => {
    if (state === 'listening') {
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 0.3,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(listOpacity, {
          toValue: 0.3,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(listOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [state, headerOpacity, listOpacity]);

  const handleStart = async () => {
    console.log('[PTT] ========== HANDLE START ==========');
    setErrorMessage(null);
    
    const ok = await audioService.ensurePermission();
    if (!ok) {
      const msg = 'Microphone permission is required. Please enable it and try again.';
      console.log('[PTT] Permission denied:', msg);
      setErrorMessage(msg);
      setState('error');
      return;
    }

    try {
      // Check if live recognizer is available
      const liveAvailable = await voiceApi.isAvailable();
      console.log('[PTT] Live recognition available:', liveAvailable);
      
      // Use live recognition if available and we're in success scenario
      const useLive = liveAvailable && scenario === 'success';
      liveModeRef.current = useLive;

      setState('listening');
      
      if (useLive) {
        console.log('[PTT] Starting LIVE recognition...');
        await voiceApi.startLiveRecognition();
        console.log('[PTT] Live recognition started');
      } else {
        console.log('[PTT] Starting FILE recording...');
        await audioService.startRecording();
        console.log('[PTT] File recording started');
      }
    } catch (e) {
      const msg = (e as Error).message || 'Could not start recording.';
      console.error('[PTT] Start failed:', e);
      setErrorMessage(msg);
      setState('error');
      liveModeRef.current = false;
    }
  };

  const handleCancel = async () => {
    console.log('[PTT] Cancelling...');
    try {
      if (liveModeRef.current) {
        await voiceApi.stopLiveRecognition();
        liveModeRef.current = false;
      } else {
        await audioService.cancelRecording();
      }
      setState('idle');
      console.log('[PTT] Cancelled');
    } catch (e) {
      console.error('[PTT] Cancel failed:', e);
      setState('idle');
      liveModeRef.current = false;
    }
  };

  // Process the recording and return the API result without mutating UI state.
  const processRecording = async (uri: string, mimeType: string, durationMs?: number) => {
    console.log('[PTT] Processing recording (api call):', { uri, mimeType });

    const input: ProcessVoiceInput = {
      audioUri: uri,
      mimeType,
      clientTs: new Date().toISOString(),
      context: state === 'clarification' ? { previousPrompt: clarifyPrompt } : undefined
    };

    const res = await voiceApi.processVoice(input);
    console.log('[PTT] Process result (raw):', res);
    return { res, durationMs } as { res: any; durationMs?: number };
  };

  const handleStop = async () => {
    console.log('[PTT] ========== HANDLE STOP ==========');
    console.log('[PTT] Live mode:', liveModeRef.current);
    
    try {
      // If we started a live recognition session, stop it and use its transcript
      if (liveModeRef.current) {
        console.log('[PTT] Stopping LIVE recognition...');
        setState('processing');
        const transcript = await voiceApi.stopLiveRecognition();
        console.log('[PTT] Live transcript:', transcript);

        // Add the transcript directly
        setRecordings(prev => [{ 
          transcript: transcript || '(no speech detected)', 
          uri: '', 
          timestamp: Date.now() 
        }, ...prev]);
        
        setClarifyPrompt(null);
        
        if (scenario === 'success' && transcript) {
          await audioManager.playNextSuccessSound().catch(console.error);
        }
        
        setState('idle');
        liveModeRef.current = false;
        return;
      }

      // File-based recording mode
      console.log('[PTT] Stopping FILE recording...');
      const { uri, mimeType, duration } = await audioService.stopRecording();
      console.log('[PTT] Recording saved:', { uri, mimeType });

      // Show processing state while we call the API. We'll ensure the UI shows
      // a 'Processing...' indicator for at least 2 seconds before adding the transcript.
      setState('processing');

      try {
        const callPromise = processRecording(uri, mimeType, duration);
        const delayPromise = new Promise((r) => setTimeout(r, 2000));
        const [{ res }, _] = await Promise.all([callPromise, delayPromise]);

        if (res.kind === 'ok') {
          const durationSec = typeof duration === 'number' ? Math.round(duration / 1000) : undefined;
          const newRecording = {
            transcript: res.transcript,
            uri,
            timestamp: Date.now(),
            durationSec
          };
          setRecordings(prev => [newRecording, ...prev]);
          setClarifyPrompt(null);
          if (scenario === 'success') {
            await audioManager.playNextSuccessSound().catch(console.error);
          }
          setState('idle');
        } else if (res.kind === 'clarification') {
          setClarifyPrompt(res.prompt);
          setState('clarification');
        }
      } catch (err: any) {
        console.error('[PTT] Processing failed after stop:', err);
        const msg = err?.message ?? 'Couldn\'t process that. Please try again.';
        setErrorMessage(msg);
        setState('error');
      }
    } catch (e) {
      console.error('[PTT] ========== HANDLE STOP FAILED ==========');
      console.error('[PTT] Error:', e);
      
      const errorMsg = (e as Error).message || 'Could not process recording. Please try again.';
      setErrorMessage(errorMsg);
      setState('error');
      liveModeRef.current = false;
    }
  };

  // Helper to format timestamp
  const getOrdinal = (n: number) => {
    const v = n % 100;
    if (v >= 11 && v <= 13) return 'th';
    switch (n % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12;
    return `${month} ${day}${getOrdinal(day)}, ${year} • ${hours}:${minutes}${period}`;
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.container}>
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <Text style={styles.title}>Voice Assistant</Text>
          <Text style={styles.subtitle}>Press and hold to speak</Text>
          <View style={styles.toggleContainer}>
            <ScenarioToggle value={scenario} onChange={(s) => setScenario(s)} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.body, { opacity: listOpacity }]}>
          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.error}>{errorMessage}</Text>
            </View>
          ) : null}
          
          {clarifyPrompt ? (
            <View style={styles.clarifyContainer}>
              <Text style={styles.clarifyIcon}>💬</Text>
              <Text style={styles.clarify}>{clarifyPrompt}</Text>
            </View>
          ) : null}

          <FlatList
            data={recordings}
            keyExtractor={(item) => String(item.timestamp)}
            renderItem={({ item, index }) => {
              const scaleAnim = new Animated.Value(index === 0 ? 0.9 : 1);
              if (index === 0) {
                Animated.spring(scaleAnim, {
                  toValue: 1,
                  friction: 8,
                  useNativeDriver: true,
                }).start();
              }
              
              return (
                <Animated.View 
                  style={[
                    styles.transcriptItem,
                    { transform: [{ scale: scaleAnim }] }
                  ]}
                >
                  <View style={styles.transcriptHeader}>
                    <View style={styles.transcriptDot} />
                    <Text style={styles.timestamp}>
                      {formatTimestamp(item.timestamp)}
                      {item.durationSec ? ` • ${item.durationSec}s` : ''}
                    </Text>
                  </View>
                  <Text style={styles.transcript}>{item.transcript}</Text>
                </Animated.View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🎙️</Text>
                <Text style={styles.empty}>No recordings yet</Text>
                <Text style={styles.emptySubtext}>Start speaking to see your transcripts here</Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>

        <View 
        // style={styles.footer}
        >
          <AudioVisualizer isRecording={state === 'listening'} />
          <PttButton 
            onStart={handleStart} 
            onStop={handleStop} 
            state = {state}

          />
        </View>

        {state === 'listening' ? <CaptureOverlay onCancel={handleCancel} /> : null}
        
        <TimePickerOverlay
          visible={showTimePicker}
          onClose={() => setShowTimePicker(false)}
          onSelectTime={async (date) => {
            const hours = date.getHours();
            const minutes = date.getMinutes();
            const period = hours >= 12 ? 'PM' : 'AM';
            const formattedHours = hours % 12 || 12;
            const formattedMinutes = minutes.toString().padStart(2, '0');
            const timeString = `${formattedHours}:${formattedMinutes} ${period}`;

            const input: ProcessVoiceInput = {
              audioUri: '',
              mimeType: 'text/plain',
              clientTs: new Date().toISOString(),
              context: {
                previousPrompt: clarifyPrompt,
                selectedTime: timeString
              }
            };

            setShowTimePicker(false);
            setState('processing');

            try {
              const callPromise = processRecording(input.audioUri, input.mimeType);
              const delayPromise = new Promise((r) => setTimeout(r, 2000));
              const [{ res }] = await Promise.all([callPromise, delayPromise]);

              if (res.kind === 'ok') {
                const newRecording = {
                  transcript: res.transcript,
                  uri: '',
                  timestamp: Date.now(),
                };
                setRecordings(prev => [newRecording, ...prev]);
                setClarifyPrompt(null);
                if (scenario === 'success') {
                  await audioManager.playNextSuccessSound().catch(console.error);
                }
                setState('idle');
              } else if (res.kind === 'clarification') {
                setClarifyPrompt(res.prompt);
                setState('clarification');
              }
            } catch (err: any) {
              console.error('[PTT] TimePicker processing failed:', err);
              const msg = err?.message ?? 'Couldn\'t process that. Please try again.';
              setErrorMessage(msg);
              setState('error');
            }
          }}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8e8e93',
    fontWeight: '500',
    marginBottom: 16,
  },
  toggleContainer: {
    alignSelf: 'flex-start',
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(211, 47, 47, 0.08)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.2)',
  },
  errorIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  error: {
    flex: 1,
    color: '#D32F2F',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  clarifyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.2)',
  },
  clarifyIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  clarify: {
    flex: 1,
    color: '#0A84FF',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  transcriptItem: {
    backgroundColor: '#f8f9fa',
    padding: 18,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#0A84FF',
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  transcriptDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0A84FF',
    marginRight: 8,
  },
  transcript: {
    fontSize: 17,
    color: '#1c1c1e',
    lineHeight: 24,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 12,
    color: '#8e8e93',
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  empty: {
    color: '#8e8e93',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#c7c7cc',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
});