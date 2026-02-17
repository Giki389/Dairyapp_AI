import ZAI from 'z-ai-web-dev-sdk';
import { NextRequest } from 'next/server';

interface ClassificationResult {
  emotionTags: string[];
  domains: string[];
  eventTypes: string[];
  emotionScore: number;
  importance: number;
  summary: string;
}

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content || typeof content !== 'string') {
      return Response.json({ error: 'Content string is required' }, { status: 400 });
    }

    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `你是一个情感分析专家。请分析用户日记内容，返回JSON格式的分类结果。

返回格式（必须是有效的JSON）：
{
  "emotionTags": ["情绪标签数组，从以下选项中选择1-3个"],
  "domains": ["生活领域数组，从以下选项中选择1-3个"],
  "eventTypes": ["事件类型数组，从以下选项中选择1-2个"],
  "emotionScore": 数字1-10表示整体情绪（1最差，10最好）,
  "importance": 数字1-5表示事件重要程度（1日常琐事，5人生大事）,
  "summary": "一句话总结今天日记的核心内容"
}

情绪标签选项：开心、平静、焦虑、低落、愤怒、感恩、释然、兴奋、疲惫、满足、紧张、放松、感动、失落、期待、安心、迷茫、自信
生活领域选项：工作、家庭、健康、学习、社交、娱乐、财务、旅行、爱好、日常
事件类型选项：成就、困难、感悟、计划、回忆、决策、日常、突破、挑战

只返回JSON，不要任何其他文字或markdown格式。`
        },
        {
          role: 'user',
          content: `请分析以下日记内容：\n\n${content}`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const responseContent = completion.choices[0]?.message?.content || '{}';
    
    // 尝试解析JSON
    let result: ClassificationResult;
    try {
      // 清理可能的markdown代码块标记
      let cleanedContent = responseContent.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.slice(7);
      }
      if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.slice(3);
      }
      if (cleanedContent.endsWith('```')) {
        cleanedContent = cleanedContent.slice(0, -3);
      }
      cleanedContent = cleanedContent.trim();
      
      result = JSON.parse(cleanedContent);
    } catch {
      // 如果解析失败，返回默认值
      result = {
        emotionTags: ['平静'],
        domains: ['日常'],
        eventTypes: ['日常'],
        emotionScore: 5,
        importance: 2,
        summary: '今天的一天'
      };
    }

    // 确保所有字段都有默认值
    const classification: ClassificationResult = {
      emotionTags: result.emotionTags || ['平静'],
      domains: result.domains || ['日常'],
      eventTypes: result.eventTypes || ['日常'],
      emotionScore: Math.min(10, Math.max(1, result.emotionScore || 5)),
      importance: Math.min(5, Math.max(1, result.importance || 2)),
      summary: result.summary || '今天的一天'
    };

    return Response.json(classification);
  } catch (error) {
    console.error('Classify API error:', error);
    return Response.json(
      { error: 'Failed to classify content' },
      { status: 500 }
    );
  }
}
