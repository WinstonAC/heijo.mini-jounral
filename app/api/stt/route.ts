import { NextRequest, NextResponse } from 'next/server';

/**
 * Backend Speech-to-Text API Route
 * Supports Whisper and Google STT providers
 */

interface STTRequest {
  audio: Blob;
  language: string;
  provider?: 'whisper' | 'google';
}

// GET handler for route discovery (Next.js needs at least one export)
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed. Use POST to transcribe audio.' }, { status: 405 });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const language = formData.get('language') as string | null;
    const provider = (formData.get('provider') as 'whisper' | 'google' | null) || 'whisper';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    if (!language) {
      return NextResponse.json(
        { error: 'No language specified' },
        { status: 400 }
      );
    }

    // Validate language code format (basic check)
    if (!/^[a-z]{2}-[A-Z]{2}$/.test(language)) {
      return NextResponse.json(
        { error: 'Invalid language code format' },
        { status: 400 }
      );
    }

    let transcript: string;

    if (provider === 'whisper') {
      transcript = await transcribeWithWhisper(audioFile, language);
    } else if (provider === 'google') {
      transcript = await transcribeWithGoogle(audioFile, language);
    } else {
      return NextResponse.json(
        { error: `Unsupported provider: ${provider}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ text: transcript });
  } catch (error) {
    console.error('STT API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Transcription failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * Transcribe audio using OpenAI Whisper API
 */
async function transcribeWithWhisper(audioFile: File, language: string): Promise<string> {
  const apiKey = process.env.WHISPER_API_KEY || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Whisper API key not configured. Set WHISPER_API_KEY or OPENAI_API_KEY environment variable.');
  }

  const formData = new FormData();
  formData.append('file', audioFile);
  formData.append('model', 'whisper-1');
  formData.append('language', language.split('-')[0]); // Convert en-US to en

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Whisper API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.text || '';
}

/**
 * Transcribe audio using Google Cloud Speech-to-Text API
 */
async function transcribeWithGoogle(audioFile: File, language: string): Promise<string> {
  const apiKey = process.env.GOOGLE_STT_KEY;
  
  if (!apiKey) {
    throw new Error('Google STT API key not configured. Set GOOGLE_STT_KEY environment variable.');
  }

  // Convert audio file to base64
  const arrayBuffer = await audioFile.arrayBuffer();
  const base64Audio = Buffer.from(arrayBuffer).toString('base64');

  const requestBody = {
    config: {
      encoding: 'WEBM_OPUS', // Adjust based on actual audio format
      sampleRateHertz: 16000,
      languageCode: language,
      alternativeLanguageCodes: [],
      model: 'default',
      useEnhanced: true,
    },
    audio: {
      content: base64Audio,
    },
  };

  const response = await fetch(
    `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google STT API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  
  if (data.results && data.results.length > 0) {
    return data.results[0].alternatives[0].transcript || '';
  }
  
  return '';
}

