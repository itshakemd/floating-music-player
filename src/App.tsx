import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [isAudioActive, setIsAudioActive] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

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

  return (
    <div className="container">
      {/* Audio detection running in background */}
    </div>
  )
}

export default App
