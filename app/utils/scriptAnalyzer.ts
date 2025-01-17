import OpenAI from 'openai'

const openAIClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function getImagePromptsFromScript(script: string): Promise<string[]> {
  // Split the script into roughly equal chunks (3 chunks for 3 images)
  const words = script.split(' ')
  const chunkSize = Math.ceil(words.length / 3)
  const chunks = []
  
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(' '))
  }

  // Generate image prompts for each chunk
  const imagePrompts = await Promise.all(
    chunks.map(async (chunk) => {
      const completion = await openAIClient.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a visual prompt engineer. Create a detailed, vivid DALL-E prompt that captures the main theme or concept from the given text."
          },
          {
            role: "user",
            content: `Generate a DALL-E prompt that captures the main theme of this text: "${chunk}". The prompt should be detailed and specific, focusing on creating an educational and visually appealing image.`
          }
        ],
        temperature: 0.7,
        max_tokens: 150,
      })

      return completion.choices[0].message.content
    })
  )

  return imagePrompts
}