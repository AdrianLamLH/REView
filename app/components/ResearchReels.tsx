'use client'

import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Reel from './Reel'
import { Loader2, AlertCircle, Search } from 'lucide-react'

export default function ResearchReels() {
  const [topic, setTopic] = useState('')
  const [reels, setReels] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentReelIndex, setCurrentReelIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/generate-reels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
      })
      
      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        console.error('Error parsing JSON:', jsonError)
        throw new Error('Invalid response from server')
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate reels')
      }

      if (!data.reels || data.reels.length === 0) {
        throw new Error('No reels were generated')
      }

      setReels(data.reels)
      setCurrentReelIndex(0)
    } catch (error) {
      console.error('Error generating reels:', error)
      setError(`An error occurred while generating reels: ${error.message}`)
    }
    setLoading(false)
  }

  const handleNextReel = () => {
    setCurrentReelIndex((prevIndex) => (prevIndex + 1) % reels.length)
  }

  const handlePreviousReel = () => {
    setCurrentReelIndex((prevIndex) => (prevIndex - 1 + reels.length) % reels.length)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="bg-white border-b border-gray-300 sticky top-0 z-10">
        <form onSubmit={handleSearch} className="max-w-screen-sm mx-auto flex items-center gap-2 p-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Search research topics"
              className="pl-10 pr-4 py-2 w-full rounded-full border-gray-300 focus:border-gray-400 focus:ring-gray-400"
            />
          </div>
          <Button 
            type="submit" 
            disabled={loading}
            className="rounded-full bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
        </form>
      </div>
      {error && (
        <Alert variant="destructive" className="mx-auto max-w-screen-sm mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex-grow relative overflow-hidden">
        {reels.length > 0 && (
          <>
            <Reel 
              key={currentReelIndex} 
              {...reels[currentReelIndex]} 
              onNext={handleNextReel}
              onPrevious={handlePreviousReel}
            />
            {/* <button
              className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full"
              onClick={handlePreviousReel}
            >
              ←
            </button>
            <button
              className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full"
              onClick={handleNextReel}
            >
              →
            </button> */}
          </>
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
      </div>
    </div>
  )
}

