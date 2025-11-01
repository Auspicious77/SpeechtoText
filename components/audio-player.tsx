import { Audio } from 'expo-av';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  uri: string;
  transcript?: string;
};

export const AudioPlayer: React.FC<Props> = ({ uri, transcript }) => {
  const [sound, setSound] = React.useState<Audio.Sound>();
  const [isPlaying, setIsPlaying] = React.useState(false);

  React.useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const playSound = async () => {
    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
      return;
    }

    try {
      const { sound: newSound } = await Audio.Sound.createAsync({ uri });
      setSound(newSound);
      
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status && 'isPlaying' in status) {
          setIsPlaying(status.isPlaying || false);
        }
        if (status && 'didJustFinish' in status && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
      
      await newSound.playAsync();
      setIsPlaying(true);
    } catch (e) {
      console.error('Failed to play audio:', e);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.playButton, isPlaying && styles.playing]}
        onPress={playSound}>
        <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶️'}</Text>
      </TouchableOpacity>
      {transcript ? (
        <Text style={styles.transcript} numberOfLines={2}>
          {transcript}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginVertical: 4,
    gap: 12,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0A84FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playing: {
    backgroundColor: '#006ACC',
  },
  playIcon: {
    fontSize: 18,
  },
  transcript: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
});