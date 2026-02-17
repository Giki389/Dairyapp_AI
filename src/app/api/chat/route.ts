import ZAI from 'z-ai-web-dev-sdk';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: 'Messages array is required' }, { status: 400 });
    }

    // 初始化 AI SDK
    let zai;
    try {
      zai = await ZAI.create();
    } catch (initError) {
      console.error('Failed to initialize ZAI:', initError);
      return Response.json({ 
        error: 'AI 服务初始化失败，请检查 .z-ai-config 配置文件',
        details: initError instanceof Error ? initError.message : 'Unknown error'
      }, { status: 500 });
    }

    // 调用 AI
    let completion;
    try {
      completion = await zai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `你是一个温暖、专业的日记助手。用户会和你分享他们的日常、感受、想法。

你的任务：
1. 友善地与用户对话，了解他们的一天
2. 帮助用户整理思绪，表达内心感受
3. 适时追问，帮助用户深化思考
4. 当用户表示想说的话说完了，主动提议整理成日记

对话风格：
- 温暖、支持、理解
- 不要过于冗长，回复简洁有温度
- 适时使用emoji增加亲和力
- 如果用户分享困难，给予安慰和支持
- 如果用户分享成就，给予肯定和祝贺

当用户说类似"今天就这些了"、"说完了"、"可以整理了"等表示结束的话时，回复：
"好的，让我帮你整理今天的日记..." 然后总结用户今天分享的内容。`
          },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
          }))
        ],
        temperature: 0.8,
        max_tokens: 1000
      });
    } catch (chatError) {
      console.error('Chat completion error:', chatError);
      const errorMessage = chatError instanceof Error ? chatError.message : 'Unknown error';
      const errorDetails = chatError instanceof Error ? chatError.stack : '';
      
      return Response.json({ 
        error: errorMessage,
        details: errorDetails
      }, { status: 500 });
    }

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return Response.json({ 
        error: 'AI 返回内容为空' 
      }, { status: 500 });
    }

    return Response.json({ content });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json(
      { error: 'Failed to process chat request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
