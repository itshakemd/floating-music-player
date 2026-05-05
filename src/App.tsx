import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [isAudioActive, setIsAudioActive] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Sync isPlaying with isAudioActive when system sound is detected
  useEffect(() => {
    if (isAudioActive) {
      setIsPlaying(true)
    }
  }, [isAudioActive])

  useEffect(() => {
    const initAudioDetection = async () => {
      try {
        const sources = await window.ipcRenderer.invoke('get-desktop-sources')
        // We look for the primary screen to capture system audio
        const source = sources.find((s: any) => s.name === 'Entire Screen' || s.name === 'Screen 1') || sources[0]

        if (!source) return

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: source.id
            }
          } as any,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: source.id
            }
          } as any
        })

        audioContextRef.current = new AudioContext()
        const sourceNode = audioContextRef.current.createMediaStreamSource(stream)
        analyserRef.current = audioContextRef.current.createAnalyser()
        analyserRef.current.fftSize = 256
        sourceNode.connect(analyserRef.current)

        const bufferLength = analyserRef.current.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)

        const detectAudio = () => {
          if (!analyserRef.current) return
          analyserRef.current.getByteFrequencyData(dataArray)
          
          let sum = 0
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i]
          }
          const average = sum / bufferLength
          const active = average > 5
          
          if (active !== isAudioActive) {
            setIsAudioActive(active)
            window.ipcRenderer.send('audio-status-changed', active)
          }
          
          setAudioLevel(average)
          animationFrameRef.current = requestAnimationFrame(detectAudio)
        }

        detectAudio()
      } catch (err) {
        console.error('Error detecting system audio:', err)
      }
    }

    initAudioDetection()

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
    }
  }, [])

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
    window.ipcRenderer.send('media-play-pause')
  }

  const handleMaximize = () => {
    // Optional: add maximize logic later
  }

  return (
    <div className="container">
      {/* Audio detection running in background */}
      <div className="bottom-bar">
        <button className="control-btn" onClick={handlePlayPause}>
          {isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M8 5v14l11-7z"></path>
            </svg>
          )}
        </button>
        <button className="control-btn" onClick={handleMaximize}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M21 3h-6l2.29 2.29-4.88 4.88 1.42 1.42 4.88-4.88L21 9V3zM3 21h6l-2.29-2.29 4.88-4.88-1.42-1.42-4.88 4.88L3 15v6z"></path>
          </svg>
        </button>
      </div>
    </div>
  )
}

export default App
