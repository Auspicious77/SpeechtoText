import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

const RECORDING_MIME = 'audio/m4a';

export class AudioService {
  private recording: Audio.Recording | null = null;
  private initPromise: Promise<void> | null = null;

  private async initAudioMode() {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      try {
        await Audio.setIsEnabledAsync(true);
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          // Use boolean flags for broad compatibility across SDKs
          shouldDuckAndroid: true,
        });
      } catch (e) {
        console.warn('[AudioService] initAudioMode error:', e);
      } finally {
        this.initPromise = null;
      }
    })();
    return this.initPromise;
  }

  async ensurePermission(): Promise<boolean> {
    try {
      const res = await Audio.requestPermissionsAsync();
      return (res && (res.granted ?? res.status === 'granted')) ?? false;
    } catch (e) {
      console.warn('[AudioService] ensurePermission error:', e);
      return false;
    }
  }

  async startRecording(): Promise<void> {
    if (this.recording) {
      // If a recording is already present, cancel it first
      await this.cancelRecording();
    }

    await this.initAudioMode();

    const has = await this.ensurePermission();
    if (!has) throw new Error('Microphone permission not granted');

    const rec = new Audio.Recording();
    try {
      // Prepare with conservative options compatible across SDKs
      await rec.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: 2, // MPEG_4
          audioEncoder: 3, // AAC
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: 0, // MPEG4AAC
          audioQuality: 0,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        web: {
          mimeType: 'audio/webm'
        }
      });
      await rec.startAsync();
      this.recording = rec;
    } catch (e) {
      // Clean up partial recording object
      try {
        // @ts-ignore
        if (rec && typeof rec.stopAndUnloadAsync === 'function') {
          // attempt to stop/unload if possible
          await (rec as any).stopAndUnloadAsync();
        }
      } catch (err) {
        // swallow
      }
      this.recording = null;
      throw e;
    }
  }

  private async safeStopAndUnload(rec: Audio.Recording | null) {
    if (!rec) return;
    try {
      const status = await rec.getStatusAsync().catch(() => null);
      if (status && status.isRecording) {
        await rec.stopAndUnloadAsync();
        return;
      }
      // Try unload if exposed
      // @ts-ignore
      if (typeof (rec as any).unloadAsync === 'function') {
        // @ts-ignore
        await (rec as any).unloadAsync();
      }
    } catch (e) {
      // swallow
    }
  }

  async stopRecording(): Promise<{ uri: string; mimeType: string; duration?: number }> {
    if (!this.recording) throw new Error('No active recording');

    const rec = this.recording;
    try {
      // Read status first
      const status = await rec.getStatusAsync().catch(() => ({} as any));
      const duration = (status && (status.durationMillis ?? status.duration)) ?? undefined;

      // Stop/unload defensively
      try {
        await rec.stopAndUnloadAsync();
      } catch (e) {
        await this.safeStopAndUnload(rec);
      }

      // Retrieve URI and verify file
      const uri = rec.getURI();
      this.recording = null;

      if (!uri) throw new Error('Recording file missing');

      // small delay to ensure FS sync on some platforms
      await new Promise((r) => setTimeout(r, 80));

      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists || (info.size ?? 0) === 0) {
        throw new Error('Recorded file is missing or empty');
      }

      return { uri, mimeType: RECORDING_MIME, duration };
    } catch (e) {
      this.recording = null;
      throw e;
    }
  }

  async cancelRecording(): Promise<void> {
    if (!this.recording) return;
    const rec = this.recording;
    try {
      await this.safeStopAndUnload(rec);
    } catch (e) {
      // swallow
    }
    // try to delete temp file if exists
    try {
      const uri = rec.getURI();
      if (uri) {
        const info = await FileSystem.getInfoAsync(uri);
        if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    } catch (_) {
      // ignore
    }
    this.recording = null;
  }

  async cleanupOldRecordings(maxAgeMs = 24 * 60 * 60 * 1000) {
    try {
      const dir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || null;
      if (!dir) return;
      const entries = await FileSystem.readDirectoryAsync(dir);
      const now = Date.now();
      await Promise.all(entries.map(async (name) => {
        try {
          const path = dir + name;
          if (!name.toLowerCase().match(/\.m4a|\.caf|\.wav|\.mp3|\.webm/)) return;
          const info = await FileSystem.getInfoAsync(path);
          if (!info.exists) return;
          const mod = (info.modificationTime ?? Date.now());
          if (now - mod > maxAgeMs) {
            await FileSystem.deleteAsync(path, { idempotent: true });
          }
        } catch (e) {
          // ignore per-file
        }
      }));
    } catch (e) {
      // ignore
    }
  }

  async getRecordingStatus() {
    if (!this.recording) return null;
    try {
      const status = await this.recording.getStatusAsync();
      const metering = (status && (status.metering ?? -160)) as number | undefined;
      const normalized = metering ? (metering + 160) / 160 : 0;
      return { metering, frequency: normalized * 2000 };
    } catch (e) {
      return null;
    }
  }
}

export const audioService = new AudioService();