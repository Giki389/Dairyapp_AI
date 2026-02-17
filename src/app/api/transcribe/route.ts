import ZAI from 'z-ai-web-dev-sdk';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audio = formData.get('audio') as Blob | null;

    if (!audio) {
      return Response.json({ error: 'Audio blob is required' }, { status: 400 });
    }

    // 将 Blob 转换为 ArrayBuffer，然后转为 base64
    const arrayBuffer = await audio.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // 使用 btoa 将二进制数据转为 base64
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    const base64Audio = btoa(binaryString);

    const zai = await ZAI.create();

    // 调用 ASR 进行语音转文字
    const result = await zai.audio.asr.create({
      file_base64: base64Audio,
    });

    const text = result.text || '';

    return Response.json({ text });
  } catch (error) {
    console.error('Transcribe API error:', error);
    return Response.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
