import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Props = {
  onCancel: () => void;
};

export const CaptureOverlay: React.FC<Props> = ({ onCancel }) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;

  const [seconds, setSeconds] = React.useState(0);
  const intervalRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    // entrance
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
    ]).start();

    // start timer
    intervalRef.current = (setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000) as unknown) as number;

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current as any);
    };
  }, [fadeAnim, scaleAnim]);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const timeString = `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }] }>
      <View style={styles.content}>
        <View style={styles.left}>
          <View style={styles.micCircle} />
          <Text style={styles.time}>{timeString}</Text>
        </View>

        <TouchableOpacity onPress={onCancel} style={styles.cancel} activeOpacity={0.8}>
          <Ionicons name="close" size={15} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 20,
    backgroundColor: '#1b2437ff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  micCircle: {
    width: 17,
    height: 17,
    borderRadius: 17,
    // borderRadius: 17,
    backgroundColor: 'blue',
    marginRight: 10,
  },
  time: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  cancel: {
    width: 17,
    height: 17,
    borderRadius: 19,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
});