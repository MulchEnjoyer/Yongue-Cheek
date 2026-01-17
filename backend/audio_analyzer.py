"""
Audio analysis module using Parselmouth (Praat) for accurate formant tracking.
Optimized for real-time streaming with small audio chunks.
"""
import numpy as np
import parselmouth
from parselmouth.praat import call
from dataclasses import dataclass
from typing import Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class AnalysisResult:
    """Result of audio analysis."""
    f1: float
    f2: float
    f3: float
    pitch: float
    intensity: float
    is_voiced: bool
    detected_vowel: Optional[str] = None
    confidence: float = 0.0


# IPA vowels with their typical F1/F2 values
IPA_VOWELS = {
    'i': {'f1': 280, 'f2': 2300, 'name': 'close front'},
    'ɪ': {'f1': 400, 'f2': 2000, 'name': 'near-close front'},
    'e': {'f1': 400, 'f2': 2100, 'name': 'close-mid front'},
    'ɛ': {'f1': 550, 'f2': 1900, 'name': 'open-mid front'},
    'æ': {'f1': 700, 'f2': 1700, 'name': 'near-open front'},
    'a': {'f1': 800, 'f2': 1500, 'name': 'open front'},
    'ɨ': {'f1': 300, 'f2': 1600, 'name': 'close central'},
    'ə': {'f1': 500, 'f2': 1500, 'name': 'mid central'},
    'ɐ': {'f1': 700, 'f2': 1400, 'name': 'near-open central'},
    'u': {'f1': 300, 'f2': 900, 'name': 'close back'},
    'ʊ': {'f1': 400, 'f2': 1000, 'name': 'near-close back'},
    'o': {'f1': 450, 'f2': 900, 'name': 'close-mid back'},
    'ɔ': {'f1': 600, 'f2': 1000, 'name': 'open-mid back'},
    'ɑ': {'f1': 750, 'f2': 1100, 'name': 'open back'},
}


class AudioAnalyzer:
    """
    Real-time audio analyzer using Parselmouth with smoothing.
    Includes adaptive noise floor estimation for noisy environments.
    """
    
    def __init__(self, sample_rate: int = 16000):
        self.sample_rate = sample_rate
        
        # Optimized for real-time: shorter windows
        self.max_formants = 5
        self.max_formant_freq = 5500
        self.window_length = 0.015  # 15ms window for faster response
        self.pre_emphasis = 50
        
        self.pitch_floor = 75
        self.pitch_ceiling = 500
        
        # Adaptive noise handling - will be calibrated
        self.noise_floor_rms = 0.01  # Initial estimate, will be calibrated
        self.noise_floor_intensity = 30  # Initial estimate, will be calibrated
        self.is_calibrated = False
        self.calibration_samples = []
        self.calibration_duration = 1.0  # 1 second of calibration
        self.calibration_samples_needed = int(sample_rate * self.calibration_duration)
        
        # Thresholds relative to noise floor (adaptive)
        self.rms_threshold_multiplier = 2.5  # Must be 2.5x above noise floor
        self.intensity_threshold_offset = 10  # Must be 10dB above noise floor
        self.min_rms_threshold = 0.03  # Absolute minimum even in quiet rooms
        self.min_intensity_threshold = 40  # Absolute minimum
        
        # Smoothing for stable output
        self.smoothing = 0.3  # 0 = no smoothing, 1 = full smoothing
        self._last_f1 = 0
        self._last_f2 = 0
        self._last_f3 = 0
        self._last_pitch = 0
        
    def calibrate_noise_floor(self, audio_data: np.ndarray) -> bool:
        """
        Calibrate noise floor from ambient audio (should be called when user is silent).
        Returns True when calibration is complete.
        """
        if len(audio_data) < 256:
            return False
        
        if audio_data.dtype != np.float64:
            audio_data = audio_data.astype(np.float64)
        
        # Calculate RMS for this sample
        rms = np.sqrt(np.mean(audio_data ** 2))
        
        # Store calibration samples
        self.calibration_samples.append(rms)
        
        # Keep only recent samples (last 1 second)
        max_samples = int(self.sample_rate * self.calibration_duration / 512)  # Assuming ~512 sample chunks
        if len(self.calibration_samples) > max_samples:
            self.calibration_samples = self.calibration_samples[-max_samples:]
        
        # Need at least 0.5 seconds of data to calibrate
        if len(self.calibration_samples) >= max_samples // 2:
            # Use 90th percentile to avoid outliers (like brief sounds)
            sorted_samples = sorted(self.calibration_samples)
            percentile_idx = int(len(sorted_samples) * 0.9)
            self.noise_floor_rms = sorted_samples[percentile_idx]
            
            # Also estimate intensity from a sample
            try:
                sound = parselmouth.Sound(audio_data, sampling_frequency=self.sample_rate)
                intensity = self._get_intensity(sound)
                # Use a conservative estimate (lower than measured)
                self.noise_floor_intensity = max(20, intensity - 5)
            except:
                pass
            
            self.is_calibrated = True
            logger.info(f"Noise floor calibrated: RMS={self.noise_floor_rms:.4f}, Intensity={self.noise_floor_intensity:.1f}dB")
            return True
        
        return False
    
    def analyze(self, audio_data: np.ndarray) -> AnalysisResult:
        """Analyze audio with smoothing for real-time display."""
        try:
            if len(audio_data) < 256:  # Too short to analyze
                return self._silent_result()
            
            if audio_data.dtype != np.float64:
                audio_data = audio_data.astype(np.float64)
            
            # Apply simple high-pass filter to reduce low-frequency noise (below 80Hz)
            # This helps in noisy environments by filtering out rumble, HVAC, etc.
            audio_data = self._high_pass_filter(audio_data, cutoff=80.0)
            
            # Quick energy check first (fast)
            rms = np.sqrt(np.mean(audio_data ** 2))
            
            # Adaptive threshold based on noise floor
            if self.is_calibrated:
                rms_threshold = max(
                    self.min_rms_threshold,
                    self.noise_floor_rms * self.rms_threshold_multiplier
                )
            else:
                # Use conservative threshold before calibration
                rms_threshold = 0.04
            
            if rms < rms_threshold:
                return self._silent_result()
            
            sound = parselmouth.Sound(audio_data, sampling_frequency=self.sample_rate)
            
            intensity = self._get_intensity(sound)
            
            # Adaptive intensity threshold
            if self.is_calibrated:
                intensity_threshold = max(
                    self.min_intensity_threshold,
                    self.noise_floor_intensity + self.intensity_threshold_offset
                )
            else:
                intensity_threshold = 45
            
            # Also check RMS is significantly above noise floor
            rms_above_noise = rms > rms_threshold
            is_voiced = intensity > intensity_threshold and rms_above_noise
            
            if not is_voiced:
                # Decay smoothly to zero
                self._last_f1 *= 0.8
                self._last_f2 *= 0.8
                return AnalysisResult(
                    f1=self._last_f1, f2=self._last_f2, f3=0, pitch=0,
                    intensity=intensity, is_voiced=False
                )
            
            # Extract formants
            f1, f2, f3 = self._get_formants(sound)
            pitch = self._get_pitch(sound)
            
            # Apply smoothing
            if self._last_f1 > 0:
                f1 = self._smooth(f1, self._last_f1)
                f2 = self._smooth(f2, self._last_f2)
                f3 = self._smooth(f3, self._last_f3)
                pitch = self._smooth(pitch, self._last_pitch)
            
            self._last_f1 = f1
            self._last_f2 = f2
            self._last_f3 = f3
            self._last_pitch = pitch
            
            vowel, confidence = self._detect_vowel(f1, f2)
            
            return AnalysisResult(
                f1=f1, f2=f2, f3=f3, pitch=pitch,
                intensity=intensity, is_voiced=True,
                detected_vowel=vowel, confidence=confidence
            )
            
        except Exception as e:
            logger.warning(f"Analysis error: {e}")
            return self._silent_result()
    
    def _smooth(self, new_val: float, old_val: float) -> float:
        """Exponential smoothing."""
        if new_val == 0:
            return old_val * 0.5
        return old_val * self.smoothing + new_val * (1 - self.smoothing)
    
    def _silent_result(self) -> AnalysisResult:
        return AnalysisResult(f1=0, f2=0, f3=0, pitch=0, intensity=0, is_voiced=False)
    
    def _get_formants(self, sound: parselmouth.Sound) -> tuple[float, float, float]:
        """Extract formants using Burg algorithm."""
        try:
            formant = call(
                sound, "To Formant (burg)",
                0.0, self.max_formants, self.max_formant_freq,
                self.window_length, self.pre_emphasis
            )
            
            mid_time = sound.duration / 2
            
            f1 = call(formant, "Get value at time", 1, mid_time, "Hertz", "Linear")
            f2 = call(formant, "Get value at time", 2, mid_time, "Hertz", "Linear")
            f3 = call(formant, "Get value at time", 3, mid_time, "Hertz", "Linear")
            
            return (
                f1 if not np.isnan(f1) else 0,
                f2 if not np.isnan(f2) else 0,
                f3 if not np.isnan(f3) else 0
            )
        except:
            return 0, 0, 0
    
    def _get_pitch(self, sound: parselmouth.Sound) -> float:
        """Extract pitch."""
        try:
            pitch = call(sound, "To Pitch", 0.0, self.pitch_floor, self.pitch_ceiling)
            f0 = call(pitch, "Get value at time", sound.duration / 2, "Hertz", "Linear")
            return f0 if not np.isnan(f0) else 0
        except:
            return 0
    
    def _get_intensity(self, sound: parselmouth.Sound) -> float:
        """Get intensity in dB."""
        try:
            intensity = call(sound, "To Intensity", 100, 0.0)
            return call(intensity, "Get mean", 0, 0, "dB") or 0
        except:
            return 0
    
    def _high_pass_filter(self, audio_data: np.ndarray, cutoff: float = 80.0) -> np.ndarray:
        """
        Simple high-pass filter using a first-order IIR filter.
        Removes low-frequency noise (rumble, HVAC, etc.) that can interfere with speech analysis.
        """
        if len(audio_data) < 2:
            return audio_data
        
        # Calculate filter coefficient for first-order high-pass
        # Using a simple RC high-pass filter approximation
        dt = 1.0 / self.sample_rate
        rc = 1.0 / (2.0 * np.pi * cutoff)
        alpha = rc / (rc + dt)
        
        # Apply filter (simple one-pole high-pass)
        filtered = np.zeros_like(audio_data)
        filtered[0] = audio_data[0]
        for i in range(1, len(audio_data)):
            filtered[i] = alpha * (filtered[i-1] + audio_data[i] - audio_data[i-1])
        
        return filtered
    
    def _detect_vowel(self, f1: float, f2: float) -> tuple[Optional[str], float]:
        """Detect nearest IPA vowel."""
        if f1 == 0 or f2 == 0:
            return None, 0
        
        min_distance = float('inf')
        nearest = None
        
        for vowel, values in IPA_VOWELS.items():
            f1_diff = (f1 - values['f1']) * 1.2
            f2_diff = (f2 - values['f2']) * 0.8
            distance = np.sqrt(f1_diff**2 + f2_diff**2)
            
            if distance < min_distance:
                min_distance = distance
                nearest = vowel
        
        confidence = max(0, 1 - (min_distance / 400))
        return nearest, confidence
    
    def reset(self):
        """Reset smoothing state and calibration."""
        self._last_f1 = 0
        self._last_f2 = 0
        self._last_f3 = 0
        self._last_pitch = 0
        self.is_calibrated = False
        self.calibration_samples = []
        self.noise_floor_rms = 0.01
        self.noise_floor_intensity = 30


_analyzer = None

def get_analyzer(sample_rate: int = 16000) -> AudioAnalyzer:
    global _analyzer
    if _analyzer is None or _analyzer.sample_rate != sample_rate:
        _analyzer = AudioAnalyzer(sample_rate)
    return _analyzer
