/**
 * Low-latency audio service for real-time formant analysis.
 * Streams small audio chunks continuously to backend.
 */

export interface AnalysisResult {
  f1: number;
  f2: number;
  f3: number;
  pitch: number;
  intensity: number;
  isVoiced: boolean;
  detectedVowel: string | null;
  confidence: number;
  position: {
    x: number;
    y: number;
  };
}

export interface CalibrationStatus {
  type: 'calibrating' | 'calibrated';
  message: string;
  noiseFloor?: {
    rms: number;
    intensity: number;
  };
}

type AnalysisCallback = (result: AnalysisResult) => void;
type CalibrationCallback = (status: CalibrationStatus) => void;

export class AudioService {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private socket: WebSocket | null = null;
  private isRunning = false;
  private callback: AnalysisCallback | null = null;
  private calibrationCallback: CalibrationCallback | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private backendUrl: string;
  
  // For ScriptProcessor fallback
  private processor: ScriptProcessorNode | null = null;
  
  constructor(backendUrl = 'ws://localhost:8001/ws/audio') {
    this.backendUrl = backendUrl;
  }

  async start(
    onAnalysis: AnalysisCallback,
    onCalibration?: CalibrationCallback
  ): Promise<boolean> {
    this.callback = onAnalysis;
    this.calibrationCallback = onCalibration || null;
    
    try {
      // Connect WebSocket first
      await this.connectWebSocket();
      
      // Get microphone with optimal settings for real-time
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
        }
      });
      
      // Create audio context at 16kHz
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Try AudioWorklet first (better performance), fall back to ScriptProcessor
      try {
        await this.setupAudioWorklet(source);
      } catch (e) {
        console.log('AudioWorklet not available, using ScriptProcessor');
        this.setupScriptProcessor(source);
      }
      
      this.isRunning = true;
      console.log('AudioService started (low-latency mode)');
      return true;
      
    } catch (error) {
      console.error('Failed to start AudioService:', error);
      this.stop();
      return false;
    }
  }

  private async setupAudioWorklet(source: MediaStreamAudioSourceNode) {
    // Create inline worklet processor
    const workletCode = `
      class AudioStreamProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this.buffer = new Float32Array(0);
          this.sendInterval = 512; // Send every 512 samples (~32ms)
          this.sampleCount = 0;
        }
        
        process(inputs, outputs, parameters) {
          const input = inputs[0];
          if (input && input[0]) {
            const samples = input[0];
            
            // Accumulate samples
            const newBuffer = new Float32Array(this.buffer.length + samples.length);
            newBuffer.set(this.buffer);
            newBuffer.set(samples, this.buffer.length);
            this.buffer = newBuffer;
            this.sampleCount += samples.length;
            
            // Send periodically
            if (this.sampleCount >= this.sendInterval) {
              this.port.postMessage({
                type: 'audio',
                samples: this.buffer
              });
              this.buffer = new Float32Array(0);
              this.sampleCount = 0;
            }
          }
          return true;
        }
      }
      registerProcessor('audio-stream-processor', AudioStreamProcessor);
    `;
    
    const blob = new Blob([workletCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    
    await this.audioContext!.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    
    this.workletNode = new AudioWorkletNode(this.audioContext!, 'audio-stream-processor');
    
    this.workletNode.port.onmessage = (event) => {
      if (event.data.type === 'audio' && this.socket?.readyState === WebSocket.OPEN) {
        const int16Data = this.float32ToInt16(event.data.samples);
        this.socket.send(int16Data.buffer);
      }
    };
    
    source.connect(this.workletNode);
    this.workletNode.connect(this.audioContext!.destination);
  }

  private setupScriptProcessor(source: MediaStreamAudioSourceNode) {
    // Smaller buffer for lower latency (512 samples = 32ms at 16kHz)
    this.processor = this.audioContext!.createScriptProcessor(512, 1, 1);
    
    let sampleBuffer = new Float32Array(0);
    const sendThreshold = 512; // Send every 512 samples
    
    this.processor.onaudioprocess = (event) => {
      if (!this.isRunning || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
        return;
      }
      
      const inputData = event.inputBuffer.getChannelData(0);
      
      // Accumulate samples
      const newBuffer = new Float32Array(sampleBuffer.length + inputData.length);
      newBuffer.set(sampleBuffer);
      newBuffer.set(inputData, sampleBuffer.length);
      sampleBuffer = newBuffer;
      
      // Send when we have enough
      if (sampleBuffer.length >= sendThreshold) {
        const int16Data = this.float32ToInt16(sampleBuffer);
        this.socket.send(int16Data.buffer);
        sampleBuffer = new Float32Array(0);
      }
    };
    
    source.connect(this.processor);
    this.processor.connect(this.audioContext!.destination);
  }

  stop(): void {
    this.isRunning = false;
    
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.callback = null;
    this.calibrationCallback = null;
  }
  
  recalibrate(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'recalibrate' }));
    }
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.backendUrl);
        this.socket.binaryType = 'arraybuffer';
        
        const timeout = setTimeout(() => {
          if (this.socket?.readyState !== WebSocket.OPEN) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 3000);
        
        this.socket.onopen = () => {
          clearTimeout(timeout);
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };
        
        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Handle calibration messages
            if (data.type === 'calibrating' || data.type === 'calibrated') {
              if (this.calibrationCallback) {
                this.calibrationCallback(data as CalibrationStatus);
              }
              return;
            }
            
            // Handle analysis results
            const result = data as AnalysisResult;
            if (this.callback && result.f1 !== undefined) {
              this.callback(result);
            }
          } catch (e) {
            // Ignore parse errors
          }
        };
        
        this.socket.onerror = () => {
          clearTimeout(timeout);
        };
        
        this.socket.onclose = () => {
          if (this.isRunning && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => this.connectWebSocket().catch(() => {}), 500);
          }
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }

  private float32ToInt16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  }

  static async checkBackend(url = 'http://localhost:8001'): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1000);
      const response = await fetch(url, { 
        method: 'GET',
        signal: controller.signal 
      });
      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }

  get running(): boolean {
    return this.isRunning;
  }
}
