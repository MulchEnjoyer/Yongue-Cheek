"""
FastAPI backend for real-time audio analysis.
Optimized for low-latency streaming.
"""
import asyncio
import json
import logging
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from audio_analyzer import get_analyzer, AnalysisResult

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CLB Audio Analysis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Optimized for low latency
SAMPLE_RATE = 16000
MIN_CHUNK_SIZE = 1024  # ~64ms - minimum for analysis
PROCESS_EVERY = 512    # Process every 32ms of new audio


def result_to_dict(result: AnalysisResult) -> dict:
    """Convert to JSON with normalized positions."""
    return {
        "f1": round(result.f1, 1),
        "f2": round(result.f2, 1),
        "f3": round(result.f3, 1),
        "pitch": round(result.pitch, 1),
        "intensity": round(result.intensity, 1),
        "isVoiced": result.is_voiced,
        "detectedVowel": result.detected_vowel,
        "confidence": round(result.confidence, 3),
        "position": {
            "x": min(1, max(0, 1 - (result.f2 - 800) / 1600)) if result.f2 > 0 else 0.5,
            "y": min(1, max(0, (result.f1 - 250) / 600)) if result.f1 > 0 else 0.5,
        }
    }


@app.get("/")
async def root():
    return {"status": "ok", "message": "CLB Audio Analysis API - Low Latency Mode"}


@app.websocket("/ws/audio")
async def websocket_audio(websocket: WebSocket):
    """
    Low-latency WebSocket for real-time audio analysis.
    Processes audio continuously as it arrives.
    """
    await websocket.accept()
    logger.info("WebSocket connected (low-latency mode)")
    
    analyzer = get_analyzer(SAMPLE_RATE)
    analyzer.reset()
    
    # Rolling buffer for continuous analysis
    audio_buffer = np.array([], dtype=np.float64)
    samples_since_last_process = 0
    
    try:
        while True:
            data = await websocket.receive()
            
            if "bytes" in data:
                # Convert Int16 PCM to float64
                audio_chunk = np.frombuffer(data["bytes"], dtype=np.int16)
                audio_float = audio_chunk.astype(np.float64) / 32768.0
                
                # Add to rolling buffer
                audio_buffer = np.concatenate([audio_buffer, audio_float])
                samples_since_last_process += len(audio_float)
                
                # Keep buffer size reasonable (last ~200ms)
                max_buffer = int(SAMPLE_RATE * 0.2)
                if len(audio_buffer) > max_buffer:
                    audio_buffer = audio_buffer[-max_buffer:]
                
                # Process frequently for responsiveness
                if samples_since_last_process >= PROCESS_EVERY and len(audio_buffer) >= MIN_CHUNK_SIZE:
                    samples_since_last_process = 0
                    
                    # Analyze the recent audio
                    chunk_to_analyze = audio_buffer[-MIN_CHUNK_SIZE:]
                    result = analyzer.analyze(chunk_to_analyze)
                    
                    await websocket.send_json(result_to_dict(result))
                    
            elif "text" in data:
                msg = json.loads(data["text"])
                if msg.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                elif msg.get("type") == "reset":
                    audio_buffer = np.array([], dtype=np.float64)
                    analyzer.reset()
                    await websocket.send_json({"type": "reset_ack"})
                    
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
