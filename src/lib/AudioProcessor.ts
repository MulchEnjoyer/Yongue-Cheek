import { AudioFeatures } from '../types';

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private dataArray: Float32Array | null = null;
  private isRunning = false;

  async start(): Promise<boolean> {
    try {
      this.audioContext = new AudioContext();
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      
      this.microphone.connect(this.analyser);
      this.dataArray = new Float32Array(this.analyser.fftSize);
      this.isRunning = true;
      
      return true;
    } catch (error) {
      console.error('Failed to start audio processor:', error);
      return false;
    }
  }

  stop(): void {
    this.isRunning = false;
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.stream = null;
  }

  getFeatures(): AudioFeatures {
    if (!this.analyser || !this.dataArray || !this.isRunning) {
      return {
        energy: 0,
        pitch: 0,
        formants: [0, 0, 0],
        isVoiced: false,
      };
    }

    // Get time domain data
    this.analyser.getFloatTimeDomainData(this.dataArray);

    // Calculate energy (RMS)
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i] * this.dataArray[i];
    }
    const rms = Math.sqrt(sum / this.dataArray.length);
    const energy = Math.min(1, rms * 5); // Scale to 0-1

    // Get frequency data for pitch and formants
    const frequencyData = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatFrequencyData(frequencyData);

    // Simple pitch detection using autocorrelation approximation
    const pitch = this.detectPitch(this.dataArray, this.audioContext!.sampleRate);
    
    // Estimate formants from frequency spectrum
    const formants = this.estimateFormants(frequencyData, this.audioContext!.sampleRate);

    // Voice detection based on energy and pitch
    const isVoiced = energy > 0.02 && pitch > 50 && pitch < 500;

    return {
      energy,
      pitch,
      formants,
      isVoiced,
    };
  }

  private detectPitch(data: Float32Array, sampleRate: number): number {
    // Simple zero-crossing rate based pitch detection
    let crossings = 0;
    for (let i = 1; i < data.length; i++) {
      if ((data[i - 1] < 0 && data[i] >= 0) || (data[i - 1] >= 0 && data[i] < 0)) {
        crossings++;
      }
    }
    
    // Convert crossings to frequency
    const duration = data.length / sampleRate;
    const frequency = (crossings / 2) / duration;
    
    // Clamp to reasonable speech range
    return Math.max(50, Math.min(500, frequency));
  }

  private estimateFormants(frequencyData: Float32Array, sampleRate: number): number[] {
    // Find peaks in the frequency spectrum that correspond to formants
    const binSize = sampleRate / (frequencyData.length * 2);
    const peaks: { freq: number; mag: number }[] = [];
    
    // Look for peaks in speech-relevant range (200-4000 Hz)
    const minBin = Math.floor(200 / binSize);
    const maxBin = Math.floor(4000 / binSize);
    
    for (let i = minBin + 1; i < maxBin - 1; i++) {
      if (frequencyData[i] > frequencyData[i - 1] && 
          frequencyData[i] > frequencyData[i + 1] &&
          frequencyData[i] > -60) {  // Above noise floor
        peaks.push({
          freq: i * binSize,
          mag: frequencyData[i],
        });
      }
    }
    
    // Sort by magnitude and take top 3
    peaks.sort((a, b) => b.mag - a.mag);
    const topPeaks = peaks.slice(0, 3).sort((a, b) => a.freq - b.freq);
    
    // Default formant values for neutral vowel
    const defaultFormants = [500, 1500, 2500];
    
    return [
      topPeaks[0]?.freq || defaultFormants[0],
      topPeaks[1]?.freq || defaultFormants[1],
      topPeaks[2]?.freq || defaultFormants[2],
    ];
  }

  get running(): boolean {
    return this.isRunning;
  }
}
