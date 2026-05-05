import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [isAudioActive, setIsAudioActive] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
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
    setIsExpanded(!isExpanded)
    window.ipcRenderer.send('toggle-window-size')
  }

  const handleVolumeUp = () => {
    window.ipcRenderer.send('volume-up')
  }

  const handleVolumeDown = () => {
    window.ipcRenderer.send('volume-down')
  }

  return (
    <div className="container">
      {/* Audio detection running in background */}
      {isExpanded && (
        <div className="top-bar">
          <button className="control-btn" onClick={handleVolumeDown}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"></path>
            </svg>
          </button>
          <button className="control-btn" onClick={handleVolumeUp}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path>
            </svg>
          </button>
        </div>
      )}
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
          {isExpanded ? (
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"></path>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M21 3h-6l2.29 2.29-4.88 4.88 1.42 1.42 4.88-4.88L21 9V3zM3 21h6l-2.29-2.29 4.88-4.88-1.42-1.42-4.88 4.88L3 15v6z"></path>
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

export default App
