'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Pause, RotateCw, Volume2, VolumeX } from 'lucide-react'

interface ReelProps {
  title: string
  content: string
  images: string[]
  audioSrc: string
  onNext?: () => void
  onPrevious?: () => void
}

export default function Reel({ title, content, images, audioSrc, onNext, onPrevious }: ReelProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height

    // If clicked in the top half, go to previous
    if (y < height / 2) {
      onPrevious?.()
    } 
    // If clicked in the bottom half, go to next
    else {
      onNext?.()
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isPlaying && images && images.length > 0) {
      interval = setInterval(() => {
        setCurrentImageIndex((prevIndex) =>
          prevIndex === images.length - 1 ? 0 : prevIndex + 1
        )
      }, 5000)
    }

    return () => clearInterval(interval)
  }, [isPlaying, images])

  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent click from triggering navigation
    if (isPlaying) {
      audioRef.current?.pause()
    } else {
      audioRef.current?.play()
    }
    setIsPlaying(!isPlaying)
  }

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent click from triggering navigation
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
    }
    setIsMuted(!isMuted)
  }

  const restartReel = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent click from triggering navigation
    setCurrentImageIndex(0)
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play()
    }
    setIsPlaying(true)
  }

  const displayContent = content.replace(/\[\d+:\d+ - \d+:\d+\]/g, '').trim()
  const displayTitle = title.replace(/\[\d+:\d+ - \d+:\d+\]/g, '').trim()

  if (!title || !content || !images || images.length === 0 || !audioSrc) {
    return (
      <Card className="w-full h-full max-w-sm mx-auto overflow-hidden">
        <CardContent className="p-4 h-full flex items-center justify-center">
          <p>Error: Incomplete reel data</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full h-full max-w-sm mx-auto overflow-hidden cursor-pointer">
      <CardContent className="p-0 h-full relative" onClick={handleClick}>
        <div className="absolute inset-0 bg-gray-200">
          <img
            src={images[currentImageIndex] || "/placeholder.svg"}
            alt={`Slide ${currentImageIndex + 1}`}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-b from-black/50 to-black/50">
          <h2 className="text-white text-xl font-semibold">{displayTitle}</h2>
          <div className="flex justify-between items-end">
            <div className="flex flex-col gap-2">
              <Button size="icon" variant="ghost" onClick={togglePlayPause}>
                {isPlaying ? <Pause className="h-6 w-6 text-white" /> : <Play className="h-6 w-6 text-white" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={restartReel}>
                <RotateCw className="h-6 w-6 text-white" />
              </Button>
            </div>
            <Button size="icon" variant="ghost" onClick={toggleMute}>
              {isMuted ? <VolumeX className="h-6 w-6 text-white" /> : <Volume2 className="h-6 w-6 text-white" />}
            </Button>
          </div>
        </div>
        <audio
          ref={audioRef}
          src={audioSrc}
          onEnded={() => setIsPlaying(false)}
          muted={isMuted}
        />
      </CardContent>
    </Card>
  )
}