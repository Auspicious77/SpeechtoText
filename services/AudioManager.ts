import { Audio } from 'expo-av';

class AudioManager {
  private successSounds: Audio.Sound[] = [];
  private currentIndex = 0;
  private loadPromise: Promise<void> | null = null;

  async loadSounds() {
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      try {
        // Load success sound 1
        const sound1 = new Audio.Sound();
        await sound1.loadAsync(require('../assets/audio/audiofile1.mp3'));

        // Load success sound 2
        const sound2 = new Audio.Sound();
        await sound2.loadAsync(require('../assets/audio/audiofile2.mp3'));

        this.successSounds = [sound1, sound2];
        console.log('[AudioManager] Success sounds loaded');
      } catch (e) {
        console.error('[AudioManager] Error loading sounds:', e);
        // Reset sounds on failure
        this.successSounds = [];
      } finally {
        this.loadPromise = null;
      }
    })();

    return this.loadPromise;
  }

  async playNextSuccessSound() {
    try {
      // If sounds are still loading, wait for them
      if (this.loadPromise) {
        await this.loadPromise;
      }

      const sound = this.successSounds[this.currentIndex];
      if (sound) {
        await sound.replayAsync();
        this.currentIndex = (this.currentIndex + 1) % this.successSounds.length;
      }
    } catch (e) {
      console.error('[AudioManager] Error playing success sound:', e);
    }
  }

  async cleanup() {
    try {
      for (const sound of this.successSounds) {
        await sound.unloadAsync();
      }
      this.successSounds = [];
      this.currentIndex = 0;
      this.loadPromise = null;
    } catch (e) {
      console.error('[AudioManager] Error cleaning up sounds:', e);
    }
  }
}

export const audioManager = new AudioManager();