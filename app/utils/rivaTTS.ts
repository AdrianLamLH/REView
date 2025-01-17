import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export async function generateRivaTTS(text: string, outputPath: string): Promise<string> {
  try {
    const command = `python python-clients/scripts/tts/talk.py \
      --server grpc.nvcf.nvidia.com:443 --use-ssl \
      --metadata function-id "0149dedb-2be8-4195-b9a0-e57e0e14f972" \
      --metadata authorization "Bearer ${process.env.NVIDIA_API_KEY}" \
      --text "${text}" \
      --voice "English-US.Female-1" \
      --output "${outputPath}"`;

    await execAsync(command);
    
    // Read the generated audio file and convert to base64
    const audioBuffer = await fs.readFile(outputPath);
    const audioBase64 = audioBuffer.toString('base64');
    
    // Clean up the temporary file
    await fs.unlink(outputPath);
    
    return `data:audio/wav;base64,${audioBase64}`;
  } catch (error) {
    console.error('Error generating TTS:', error);
    throw error;
  }
}