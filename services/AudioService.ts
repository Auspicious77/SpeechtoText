// AudioService.ts
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

const RECORDING_MIME = 'audio/m4a';

export class AudioService {
  private recording: Audio.Recording | null = null;
  private initPromise: Promise<void> | null = null;
  private recordingStartTs: number | null = null; // manual start time fallback

  private async initAudioMode(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      try {
        await Audio.setIsEnabledAsync(true);
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
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
      // Expo AV's permissions API returns different shapes across SDKs; guard defensively.
      // This is the recommended call for ask-on-first-use behavior.
      // For newer SDKs, Audio.requestPermissionsAsync() exists.
      const res: any = await (Audio as any).requestPermissionsAsync?.() ?? (Audio as any).getPermissionsAsync?.();
      return !!(res && (res.granted ?? res.status === 'granted'));
    } catch (e) {
      console.warn('[AudioService] ensurePermission error:', e);
      return false;
    }
  }

  async startRecording(): Promise<void> {
    // If there's an existing recording object, cancel/cleanup it first.
    if (this.recording) {
      await this.cancelRecording().catch(() => {});
    }

    await this.initAudioMode();

    const has = await this.ensurePermission();
    if (!has) throw new Error('Microphone permission not granted');

    const rec = new Audio.Recording();
    try {
      // Prepare to record (these options are compatible across platforms)
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
          // web uses mimeType
          mimeType: 'audio/webm',
        },
      });

      await rec.startAsync();
      this.recording = rec;
      this.recordingStartTs = Date.now();
      console.log('[AudioService] recording started');
    } catch (err) {
      // Ensure we clean up partial recording
      try {
        // stop/unload if possible
        // @ts-ignore
        if (rec && typeof rec.stopAndUnloadAsync === 'function') {
          await (rec as any).stopAndUnloadAsync();
        }
      } catch (_) {}
      this.recording = null;
      this.recordingStartTs = null;
      throw err;
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
      // fallback: try unload if available
      // @ts-ignore
      if (typeof (rec as any).unloadAsync === 'function') {
        // @ts-ignore
        await (rec as any).unloadAsync();
      }
    } catch (e) {
      // swallow
    }
  }

  /**
   * stopRecording
   * returns { uri, mimeType, duration } with duration in milliseconds
   */
  async stopRecording(): Promise<{ uri: string; mimeType: string; duration: number }> {
    if (!this.recording) throw new Error('No active recording');

    const rec = this.recording;
    this.recording = null; // clear immediately so subsequent calls are safe

    try {
      // Stop and unload the recording (this finalizes the file)
      // stopAndUnloadAsync exists on Audio.Recording
      // on some platforms it may throw; we catch below if needed.
      try {
        await rec.stopAndUnloadAsync();
      } catch (stopErr) {
        // attempt safe unload/stop
        await this.safeStopAndUnload(rec);
      }

      const uri = rec.getURI();
      if (!uri) throw new Error('Recording file missing');

      // Give the filesystem a short moment to flush data
      await new Promise((r) => setTimeout(r, 150));

      // Use FileSystem.statAsync (Expo) to get file info (replace deprecated getInfoAsync)
      // statAsync returns { size, modificationTime, uri, exists } on modern SDKs
      let info: any = null;
      try {
        info = await FileSystem.statAsync(uri);
      } catch (e) {
        // statAsync might fail on some platforms; log and continue
        console.warn('[AudioService] statAsync failed:', e);
      }

      // Verify file exists and has size when info is available
      if (info && (info.exists === false || (typeof info.size === 'number' && info.size <= 0))) {
        throw new Error('Recorded file is missing or empty');
      }

      // Try to get duration from the recording status (some SDKs set durationMillis)
      const status = await rec.getStatusAsync().catch(() => ({} as any));
      let duration = (status && (status.durationMillis ?? status.duration)) ?? undefined;

      // If duration is not provided, fall back to manual estimate using start timestamp
      if (typeof duration !== 'number' || isNaN(duration)) {
        if (this.recordingStartTs) {
          duration = Date.now() - this.recordingStartTs;
        } else {
          duration = 1000; // fallback 1s
        }
      }

      // Ensure duration is a number
      duration = Math.max(0, Number(duration));

      console.log('[AudioService] saved recording', { uri, duration, info });
      return { uri, mimeType: RECORDING_MIME, duration };
    } catch (e) {
      console.error('[AudioService] stopRecording failed:', e);
      // ensure we attempt to clean up this recording
      try {
        await this.safeStopAndUnload(rec);
      } catch (_) {}
      throw e;
    } finally {
      // reset manual start ts
      this.recordingStartTs = null;
    }
  }

  async cancelRecording(): Promise<void> {
    if (!this.recording) return;
    const rec = this.recording;
    this.recording = null;
    this.recordingStartTs = null;

    try {
      await this.safeStopAndUnload(rec);
    } catch (_) {}

    // try to delete temp file if exists
    try {
      const uri = rec.getURI();
      if (uri) {
        // use statAsync to check existence
        const info = await FileSystem.statAsync(uri).catch(() => null);
        if (info && info.exists) {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        }
      }
    } catch (_) {
      // ignore
    }
  }

  async cleanupOldRecordings(maxAgeMs = 24 * 60 * 60 * 1000) {
    try {
      const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!dir) return;

      const entries = await FileSystem.readDirectoryAsync(dir);
      const now = Date.now();

      await Promise.all(
        entries.map(async (name) => {
          try {
            if (!name.match(/\.(m4a|caf|wav|mp3|webm)$/i)) return;
            const path = dir + name;
            const s = await FileSystem.statAsync(path).catch(() => null);
            if (!s) return;
            const mod = s.modificationTime ?? 0;
            // modificationTime sometimes in seconds; try to detect scale
            const modMs = mod > 0 && mod < 1e12 ? mod * 1000 : mod;
            if (now - modMs > maxAgeMs) {
              await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
            }
          } catch (_) {
            // ignore per-file
          }
        })
      );
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
