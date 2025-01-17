'use server'

import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import OpenAI from 'openai'

const openAIClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateReels(topic: string) {
  // Generate related topics
  const relatedTopicsPrompt = `Given the research topic "${topic}", generate 3 related subtopics. Return only a JSON array of strings.`
  const { text: relatedTopicsJson } = await generateText({
    model: openai('gpt-4o'),
    prompt: relatedTopicsPrompt,
  })

  const relatedTopics = JSON.parse(relatedTopicsJson)

  // Generate reels for each related topic
  const reels = await Promise.all(
    relatedTopics.map(async (relatedTopic: string) => {
      // Generate reel content
      const reelContentPrompt = `Create a short educational script about "${relatedTopic}" suitable for a 30-second video. The script should be engaging and informative.`
      const { text: reelContent } = await generateText({
        model: openai('gpt-4o'),
        prompt: reelContentPrompt,
      })

      // Generate TTS audio
      const mp3Response = await openAIClient.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: reelContent,
      })

      const audioBuffer = Buffer.from(await mp3Response.arrayBuffer())
      const audioBase64 = audioBuffer.toString('base64')
      const audioSrc = `data:audio/mp3;base64,${audioBase64}`

      // Generate images
      const imagePrompts = [
        `An image representing ${relatedTopic}`,
        `A visual explanation of ${relatedTopic}`,
        `An infographic about ${relatedTopic}`,
      ]

      const images = await Promise.all(
        imagePrompts.map(async (prompt) => {
          const response = await openAIClient.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024",
          })
          return response.data[0].url
        })
      )

      return {
        title: relatedTopic,
        content: reelContent,
        audioSrc,
        images,
      }
    })
  )

  return reels
}

