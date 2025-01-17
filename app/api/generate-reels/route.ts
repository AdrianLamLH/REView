import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

const openAIClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Add this function at the top of the file
async function getImagesByKeywords(topic: string): Promise<string[]> {
  // For now, return placeholder images
  // In a real implementation, you would integrate with an image search API
  return [
    `https://source.unsplash.com/random?${encodeURIComponent(topic)}`,
    `https://source.unsplash.com/random?${encodeURIComponent(topic)}&sig=1`,
    `https://source.unsplash.com/random?${encodeURIComponent(topic)}&sig=2`,
  ];
}



export async function POST(req: NextRequest) {
  try {
    const { topic } = await req.json()

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    // Generate related topics
    // Generate related topics
    const relatedTopicsPrompt = `Given the research topic "${topic}", generate 3 related subtopics. Return ONLY a JSON array of strings with no markdown formatting, backticks, or additional text. For example: ["topic 1", "topic 2", "topic 3"]`
    const { text: relatedTopicsJson } = await generateText({
      model: openai('gpt-4'),  // Note: changed from gpt-4o to gpt-4
      prompt: relatedTopicsPrompt,
    })

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

          // // Generate images
          // const imagePrompts = [
          //   `An image representing ${relatedTopic}`,
          //   `A visual explanation of ${relatedTopic}`,
          //   `An infographic about ${relatedTopic}`,
          // ]

          // const images = await Promise.all(
          //   imagePrompts.map(async (prompt) => {
          //     const response = await openAIClient.images.generate({
          //       model: "dall-e-3",
          //       prompt: prompt,
          //       n: 1,
          //       size: "1024x1024",
          //     })
          //     return response.data[0].url
          //   })
          // )
          // Replace the image generation section (lines 66-83) with:
          const images = await getImagesByKeywords(relatedTopic);

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

