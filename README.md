# 你 Hide Your CLB

A visual Chinese pronunciation trainer that helps you nail tones, sounds, and phrases through real-time articulatory feedback.

## What is this?

**Hide Your CLB** (Caucasian Language Barrier) is an interactive pronunciation coach that shows you exactly how to position your mouth, tongue, and vocal tract to produce authentic Mandarin sounds. Built for visual learners who want to go beyond "repeat after me."

## Features

- **Sound-by-Sound Breakdown** — Master individual phonemes with visual mouth/tongue positioning
- **Tone Training** — See pitch contours and practice the 4 tones + neutral
- **Progressive Learning** — Sounds → Words → Full Phrases
- **Real-time Feedback** — Accuracy scoring powered by audio analysis
- **Visual Articulation** — SVG-based mouth, tongue, and vowel space visualizations

## Tech Stack

| Frontend | Backend |
|----------|---------|
| React 18 + TypeScript | Python FastAPI |
| Vite | Parselmouth (Praat) |
| Web Audio API | NumPy |

## Quick Start

### Frontend
```bash
npm install
npm run dev
```

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

App runs at `http://localhost:5173`

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── screens/          # App flow screens
│   │   ├── MouthVisualization.tsx
│   │   ├── TongueVisualization.tsx
│   │   └── VowelGridVisualization.tsx
│   ├── lib/                  # Audio processing & phoneme recognition
│   ├── data/                 # Level content
│   └── types/
├── backend/
│   ├── main.py              # FastAPI server
│   └── audio_analyzer.py    # Praat-based analysis
└── public/
```

## Credits

- **Audio samples** — [MandaBanana](https://www.youtube.com/@MandaBanana) on YouTube
- **Speech analysis** — [Parselmouth](https://github.com/YannickJadworski/Parselmouth) (Python interface to Praat)

## License

MIT
