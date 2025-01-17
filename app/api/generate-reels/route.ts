import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

import { getImagePromptsFromScript } from '@/app/utils/scriptAnalyzer'

// async function getImagesByKeywords(topic: string): Promise<string[]> {
//   // Using Unsplash's random image API with the topic as the query
//   return [
//     `https://source.unsplash.com/1024x1024/?${encodeURIComponent(topic)}`,
//     `https://source.unsplash.com/1024x1024/?${encodeURIComponent(topic)}&sig=1`,
//     `https://source.unsplash.com/1024x1024/?${encodeURIComponent(topic)}&sig=2`,
//   ];
// }

// NVIDIA client for text generation
const nvidiaClient = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY,
})

// OpenAI client for TTS
const openAIClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { topic } = await req.json()

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    // Generate related topics using NVIDIA
    const completion = await nvidiaClient.chat.completions.create({
      model: "writer/palmyra-creative-122b",
      messages: [
        {
          role: "system",
          content: "You are a direct response system. Only output the exact requested content with no additional text, formatting, or explanations."
        },
        {
          role: "user",
          content: `Given the research topic "${topic}", generate 3 related subtopics. Return ONLY a JSON array of strings with no markdown formatting, backticks, or additional text. For example: ["topic 1", "topic 2", "topic 3"]`
        }
      ],
      temperature: 0.5,
      top_p: 1,
      max_tokens: 1024,
    })
    
    const relatedTopicsJson = completion.choices[0].message.content

    let relatedTopics
    try {
      // Clean the response by removing any markdown formatting
      const cleanJson = relatedTopicsJson
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim()
      relatedTopics = JSON.parse(cleanJson)
      
      if (!Array.isArray(relatedTopics)) {
        throw new Error('Response is not an array')
      }
    } catch (error) {
      console.error('Error parsing related topics:', error)
      console.error('Raw response:', relatedTopicsJson)
      return NextResponse.json({ error: 'Failed to parse related topics' }, { status: 500 })
    }

    // Generate reels for each related topic
    const reels = await Promise.all(
      relatedTopics.map(async (relatedTopic: string) => {
        try {
          // Generate reel content using NVIDIA
          const completion = await nvidiaClient.chat.completions.create({
            model: "writer/palmyra-creative-122b",
            messages: [
              {
                role: "system",
                content: "You are a direct response system. Only output the exact requested content with no additional text, formatting, or explanations."
              },
              {
                role: "user",
                content: `Tell me in a short educational response about "${relatedTopic}" suitable for a 30-second video. The speech should be engaging and informative.`
              }
            ],
            temperature: 0.7,
            top_p: 1,
            max_tokens: 1024,
          })
          
          const reelContent = completion.choices[0].message.content

          // Generate TTS audio using OpenAI
          const mp3Response = await openAIClient.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: reelContent,
          })

          const audioBuffer = Buffer.from(await mp3Response.arrayBuffer())
          const audioBase64 = audioBuffer.toString('base64')
          const audioSrc = `data:audio/mp3;base64,${audioBase64}`

          // Get images
          const imagePrompts = await getImagePromptsFromScript(reelContent)

          // Generate images using DALL-E
          const images = await Promise.all(
            imagePrompts.map(async (prompt) => {
              const response = await openAIClient.images.generate({
                model: "dall-e-3",
                prompt,
                n: 1,
                size: "1024x1024",
                quality: "standard",
                style: "natural"
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
        } catch (error) {
          console.error(`Error generating reel for topic "${relatedTopic}":`, error)
          return null
        }
      })
    )

    const validReels = reels.filter(reel => reel !== null)

    if (validReels.length === 0) {
      return NextResponse.json({ error: 'Failed to generate any valid reels' }, { status: 500 })
    }

    return NextResponse.json({ reels: validReels })
  } catch (error) {
    console.error('Error in generate-reels API route:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}