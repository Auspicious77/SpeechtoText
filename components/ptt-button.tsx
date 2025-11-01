import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  GestureResponderEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Props = {
  onStart: () => Promise<void> | void;
  onStop: () => Promise<void> | void;
  state: 'idle' | 'recording' | 'processing';
};

export const PttButton: React.FC<Props> = ({ onStart, onStop, state }) => {
  const [isRecording, setIsRecording] = React.useState(false);
  const isProcessingRef = React.useRef(false);
  const longPressRef = React.useRef(false);

  const startRecording = React.useCallback(async () => {
    if (isProcessingRef.current || isRecording) return;
    isProcessingRef.current = true;
    try {
      await onStart();
      setIsRecording(true);
    } catch (error) {
      console.error('[PttButton] Failed to start recording:', error);
    } finally {
      isProcessingRef.current = false;
    }
  }, [isRecording, onStart]);

  const stopRecording = React.useCallback(async () => {
    if (isProcessingRef.current || !isRecording) return;
    isProcessingRef.current = true;
    try {
      await onStop();
      setIsRecording(false);
    } catch (error) {
      console.error('[PttButton] Failed to stop recording:', error);
    } finally {
      isProcessingRef.current = false;
    }
  }, [isRecording, onStop]);

  // Single tap toggles recording
  const handlePress = React.useCallback(async () => {
    if (isProcessingRef.current) return;
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Long press (hold-to-record)
  const handlePressIn = React.useCallback(async (_e: GestureResponderEvent) => {
    longPressRef.current = true;
    await startRecording();
  }, [startRecording]);

  const handlePressOut = React.useCallback(async (_e: GestureResponderEvent) => {
    if (longPressRef.current) {
      await stopRecording();
      longPressRef.current = false;
    }
  }, [stopRecording]);

  const isIdle = state === 'idle' && !isRecording;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        accessibilityLabel="Press to talk or hold to record"
        accessibilityHint="Tap to start or stop recording, or hold to record"
        activeOpacity={0.8}
        style={[styles.button, !isIdle && styles.active]}
        onPress={handlePress}
        // onPressIn={handlePressIn}
        // onPressOut={handlePressOut}
      >
        <Ionicons
          name={isIdle ? 'mic' : 'radio-button-on'}
          size={36}
          color="white"
        />
      </TouchableOpacity>

      <Text style={[styles.label, !isIdle && styles.activeLabel]}>
        {isIdle ? 'Tap or Hold to Talk' : 'Recording...'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#4A90E2',
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  active: {
    backgroundColor: '#E74C3C',
    transform: [{ scale: 1.1 }],
    shadowColor: '#E74C3C',
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  label: {
    marginTop: 12,
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    opacity: 0.9,
  },
  activeLabel: {
    color: '#E74C3C',
    fontWeight: '700',
  },
});
