import ZAI from 'z-ai-web-dev-sdk';
import { NextRequest } from 'next/server';
import { DiaryEntry, WeeklyReport, MonthlyReport, YearlyReport } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { type, entries, year, weekNumber, month } = await request.json();

    if (!type || !entries || !Array.isArray(entries)) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const zai = await ZAI.create();

    // 过滤有分类的日记
    const validEntries = entries.filter((e: DiaryEntry) => e.classification);

    if (validEntries.length === 0) {
      return Response.json({ error: '没有足够的数据生成报告' }, { status: 400 });
    }

    // 计算统计数据
    const stats = calculateStats(validEntries);

    switch (type) {
      case 'weekly':
        return Response.json(await generateWeeklyReport(zai, entries, stats, year, weekNumber));
      case 'monthly':
        return Response.json(await generateMonthlyReport(zai, entries, stats, year, month));
      case 'yearly':
        return Response.json(await generateYearlyReport(zai, entries, stats, year));
      default:
        return Response.json({ error: 'Invalid report type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Report generation error:', error);
    return Response.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

// 计算统计数据
function calculateStats(entries: DiaryEntry[]) {
  const emotionCounts: Record<string, number> = {};
  const domainCounts: Record<string, number> = {};
  const keywordCounts: Record<string, number> = {};
  
  let totalScore = 0;
  let scoreCount = 0;

  entries.forEach(entry => {
    // 情绪统计
    entry.classification?.emotionTags.forEach(tag => {
      emotionCounts[tag] = (emotionCounts[tag] || 0) + 1;
    });
    
    // 领域统计
    entry.classification?.domains.forEach(domain => {
      domainCounts[domain] = (domainCounts[domain] || 0) + 1;
    });
    
    // 分数统计
    if (entry.classification?.emotionScore) {
      totalScore += entry.classification.emotionScore;
      scoreCount++;
    }
    
    // 关键词提取（简化版：从summary中提取）
    if (entry.summary) {
      const words = entry.summary.split(/\s+|，|。|！|？|、/);
      words.forEach(word => {
        if (word.length >= 2 && word.length <= 4) {
          keywordCounts[word] = (keywordCounts[word] || 0) + 1;
        }
      });
    }
  });

  return {
    totalEntries: entries.length,
    avgEmotionScore: scoreCount > 0 ? Math.round((totalScore / scoreCount) * 10) / 10 : 0,
    topEmotions: Object.entries(emotionCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    topDomains: Object.entries(domainCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    topKeywords: Object.entries(keywordCounts)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  };
}

// 生成周报
async function generateWeeklyReport(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  entries: DiaryEntry[],
  stats: ReturnType<typeof calculateStats>,
  year: number,
  weekNumber: number
): Promise<WeeklyReport> {
  const entriesSummary = entries
    .slice(0, 7)
    .map(e => `- ${e.date}: ${e.summary || e.content.slice(0, 100)}`)
    .join('\n');

  const prompt = `你是一个日记助手。请根据用户本周的日记数据生成周报。

本周日记概要：
${entriesSummary}

统计数据：
- 日记数量：${stats.totalEntries}篇
- 平均情绪：${stats.avgEmotionScore}/10
- 主要情绪：${stats.topEmotions.map(e => `${e.tag}(${e.count}次)`).join('、')}
- 关注领域：${stats.topDomains.map(d => `${d.tag}(${d.count}次)`).join('、')}

请以JSON格式返回：
{
  "highlights": ["本周亮点1", "本周亮点2", "本周亮点3"],
  "challenges": ["挑战1", "挑战2"],
  "aiInsight": "AI洞察与建议（一段话，100字左右）",
  "nextWeekPlan": ["建议1", "建议2", "建议3"]
}

只返回JSON，不要其他文字。`;

  const completion = await zai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 800
  });

  let report;
  try {
    let content = completion.choices[0]?.message?.content || '{}';
    content = content.replace(/```json\n?|\n?```/g, '').trim();
    report = JSON.parse(content);
  } catch {
    report = {
      highlights: ['本周完成了日记记录'],
      challenges: ['继续保持记录习惯'],
      aiInsight: '本周的记录展现了你对生活的关注，继续保持！',
      nextWeekPlan: ['继续记录每天的心情']
    };
  }

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return {
    id: `weekly_${year}_${weekNumber}`,
    type: 'weekly',
    year,
    weekNumber,
    dateRange: {
      start: weekStart.toISOString().split('T')[0],
      end: weekEnd.toISOString().split('T')[0]
    },
    stats,
    highlights: report.highlights || [],
    challenges: report.challenges || [],
    aiInsight: report.aiInsight || '',
    nextWeekPlan: report.nextWeekPlan || [],
    createdAt: new Date().toISOString()
  };
}

// 生成月报
async function generateMonthlyReport(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  entries: DiaryEntry[],
  stats: ReturnType<typeof calculateStats>,
  year: number,
  month: number
): Promise<MonthlyReport> {
  const entriesSummary = entries
    .slice(0, 15)
    .map(e => `- ${e.date}: ${e.summary || e.content.slice(0, 100)}`)
    .join('\n');

  // 按周分组统计
  const weeklyScores: { week: number; avgScore: number }[] = [];
  const weekGroups: Record<number, number[]> = {};
  
  entries.forEach(entry => {
    if (entry.classification?.emotionScore) {
      const date = new Date(entry.date);
      const weekNum = Math.ceil(date.getDate() / 7);
      if (!weekGroups[weekNum]) weekGroups[weekNum] = [];
      weekGroups[weekNum].push(entry.classification.emotionScore);
    }
  });
  
  Object.entries(weekGroups).forEach(([week, scores]) => {
    weeklyScores.push({
      week: parseInt(week),
      avgScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    });
  });

  // 情绪分布
  const moodRanges = [
    { range: '低落(1-3)', count: 0 },
    { range: '平静(4-6)', count: 0 },
    { range: '良好(7-8)', count: 0 },
    { range: '愉快(9-10)', count: 0 }
  ];
  
  entries.forEach(entry => {
    const score = entry.classification?.emotionScore || 5;
    if (score <= 3) moodRanges[0].count++;
    else if (score <= 6) moodRanges[1].count++;
    else if (score <= 8) moodRanges[2].count++;
    else moodRanges[3].count++;
  });

  const prompt = `你是一个日记助手。请根据用户本月的日记数据生成月报。

本月日记概要：
${entriesSummary}

统计数据：
- 日记数量：${stats.totalEntries}篇
- 平均情绪：${stats.avgEmotionScore}/10
- 主要情绪：${stats.topEmotions.map(e => `${e.tag}(${e.count}次)`).join('、')}
- 关注领域：${stats.topDomains.map(d => `${d.tag}(${d.count}次)`).join('、')}

请以JSON格式返回：
{
  "highlights": ["本月亮点1", "本月亮点2"],
  "challenges": ["挑战1", "挑战2"],
  "growth": ["成长进步1", "成长进步2"],
  "aiInsight": "AI洞察与建议（一段话，150字左右）",
  "nextMonthFocus": ["下月重点1", "下月重点2"]
}

只返回JSON，不要其他文字。`;

  const completion = await zai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 1000
  });

  let report;
  try {
    let content = completion.choices[0]?.message?.content || '{}';
    content = content.replace(/```json\n?|\n?```/g, '').trim();
    report = JSON.parse(content);
  } catch {
    report = {
      highlights: ['本月完成了日记记录'],
      challenges: [],
      growth: ['保持记录习惯'],
      aiInsight: '本月的记录展现了你对生活的关注，继续保持！',
      nextMonthFocus: ['继续记录每天的心情']
    };
  }

  return {
    id: `monthly_${year}_${month}`,
    type: 'monthly',
    year,
    month,
    stats: {
      ...stats,
      emotionTrend: weeklyScores.sort((a, b) => a.week - b.week),
      moodDistribution: moodRanges
    },
    highlights: report.highlights || [],
    challenges: report.challenges || [],
    growth: report.growth || [],
    aiInsight: report.aiInsight || '',
    nextMonthFocus: report.nextMonthFocus || [],
    createdAt: new Date().toISOString()
  };
}

// 生成年报
async function generateYearlyReport(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  entries: DiaryEntry[],
  stats: ReturnType<typeof calculateStats>,
  year: number
): Promise<YearlyReport> {
  const entriesSummary = entries
    .slice(0, 30)
    .map(e => `- ${e.date}: ${e.summary || e.content.slice(0, 100)}`)
    .join('\n');

  // 按月统计
  const monthlyScores: { month: number; avgScore: number }[] = [];
  const monthGroups: Record<number, number[]> = {};
  
  entries.forEach(entry => {
    if (entry.classification?.emotionScore) {
      const month = new Date(entry.date).getMonth() + 1;
      if (!monthGroups[month]) monthGroups[month] = [];
      monthGroups[month].push(entry.classification.emotionScore);
    }
  });
  
  Object.entries(monthGroups).forEach(([month, scores]) => {
    monthlyScores.push({
      month: parseInt(month),
      avgScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    });
  });

  // 统计记录天数
  const uniqueDays = new Set(entries.map(e => e.date)).size;

  // 提取里程碑（重要程度高的日记）
  const milestones = entries
    .filter(e => (e.classification?.importance || 0) >= 4)
    .slice(0, 5)
    .map(e => e.summary || e.content.slice(0, 50));

  const prompt = `你是一个日记助手。请根据用户本年度的日记数据生成年报。

本年度日记概要（部分）：
${entriesSummary}

统计数据：
- 日记数量：${stats.totalEntries}篇
- 记录天数：${uniqueDays}天
- 平均情绪：${stats.avgEmotionScore}/10
- 主要情绪：${stats.topEmotions.map(e => `${e.tag}(${e.count}次)`).join('、')}
- 关注领域：${stats.topDomains.map(d => `${d.tag}(${d.count}次)`).join('、')}

请以JSON格式返回：
{
  "yearlyHighlights": ["年度高光时刻1", "年度高光时刻2", "年度高光时刻3"],
  "yearlyChallenges": ["年度挑战1", "年度挑战2"],
  "personalGrowth": "个人成长总结（一段话，200字左右）",
  "gratitudeList": ["感恩的人或事1", "感恩的人或事2", "感恩的人或事3"],
  "aiInsight": "AI年度洞察（一段话，150字左右）",
  "nextYearWishes": ["新年愿望1", "新年愿望2", "新年愿望3"]
}

只返回JSON，不要其他文字。`;

  const completion = await zai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 1200
  });

  let report;
  try {
    let content = completion.choices[0]?.message?.content || '{}';
    content = content.replace(/```json\n?|\n?```/g, '').trim();
    report = JSON.parse(content);
  } catch {
    report = {
      yearlyHighlights: ['完成了本年度的日记记录'],
      yearlyChallenges: [],
      personalGrowth: '这一年你坚持记录，见证了生活的点滴。',
      gratitudeList: ['感谢自己的坚持'],
      aiInsight: '感谢这一年的陪伴，愿你继续记录美好。',
      nextYearWishes: ['继续保持记录习惯']
    };
  }

  return {
    id: `yearly_${year}`,
    type: 'yearly',
    year,
    stats: {
      totalEntries: stats.totalEntries,
      totalDays: uniqueDays,
      avgEmotionScore: stats.avgEmotionScore,
      monthlyTrend: monthlyScores.sort((a, b) => a.month - b.month),
      topEmotions: stats.topEmotions,
      topDomains: stats.topDomains,
      milestones
    },
    yearlyHighlights: report.yearlyHighlights || [],
    yearlyChallenges: report.yearlyChallenges || [],
    personalGrowth: report.personalGrowth || '',
    gratitudeList: report.gratitudeList || [],
    aiInsight: report.aiInsight || '',
    nextYearWishes: report.nextYearWishes || [],
    createdAt: new Date().toISOString()
  };
}
