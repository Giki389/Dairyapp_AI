'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, Calendar, TrendingUp, Target, Lightbulb, 
  ChevronRight, Sparkles, BarChart3, Heart, Star,
  X, Download, Share2, Loader2, Save, History
} from 'lucide-react';
import { getISOWeek } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WeeklyReport, MonthlyReport, YearlyReport, DiaryEntry } from '@/types';
import { storage } from '@/lib/storage';

interface ReportData {
  id: string;
  type: string;
  year: number;
  weekNumber?: number;
  month?: number;
  data: WeeklyReport | MonthlyReport | YearlyReport;
  createdAt: string;
  updatedAt: string;
}

interface ReportViewProps {
  type: 'weekly' | 'monthly' | 'yearly';
  entries: DiaryEntry[];
  onClose: () => void;
}

export default function ReportView({ type, entries, onClose }: ReportViewProps) {
  const [report, setReport] = useState<WeeklyReport | MonthlyReport | YearlyReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyReports, setHistoryReports] = useState<ReportData[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const generateReport = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const now = new Date();
      const year = now.getFullYear();
      const weekNumber = getWeekNumber(now);
      const month = now.getMonth() + 1;

      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          entries,
          year,
          weekNumber,
          month
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '生成报告失败');
      }

      const data = await response.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成报告失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 保存报告
  const handleSaveReport = async () => {
    if (!report) return;
    
    setIsSaving(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const weekNumber = getWeekNumber(now);
      const month = now.getMonth() + 1;
      
      await storage.saveReport(type, year, report, weekNumber, month);
      
      setSavedMessage('报告已保存！');
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (err) {
      console.error('Save report error:', err);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  // 加载历史报告
  const loadHistoryReports = async () => {
    setShowHistory(true);
    try {
      const reports = await storage.getAllReports();
      const filteredReports = reports.filter(r => r.type === type);
      setHistoryReports(filteredReports);
    } catch (err) {
      console.error('Load history error:', err);
    }
  };

  // 查看历史报告
  const viewHistoryReport = (reportData: ReportData) => {
    setReport(reportData.data as WeeklyReport | MonthlyReport | YearlyReport);
    setShowHistory(false);
  };

  // 获取周数
  const getWeekNumber = (date: Date): number => {
    return getISOWeek(date);
  };

  // 获取标题
  const getTitle = () => {
    const now = new Date();
    switch (type) {
      case 'weekly':
        return `第${getWeekNumber(now)}周周报`;
      case 'monthly':
        return `${now.getMonth() + 1}月月报`;
      case 'yearly':
        return `${now.getFullYear()}年度报告`;
    }
  };

  // 获取情绪颜色
  const getEmotionColor = (score: number): string => {
    if (score >= 8) return 'text-green-600 bg-green-50';
    if (score >= 6) return 'text-blue-600 bg-blue-50';
    if (score >= 4) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  // 渲染周报
  const renderWeeklyReport = (r: WeeklyReport) => (
    <div className="space-y-4">
      {/* 统计概览 */}
      <Card>
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            本周统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2 bg-muted/50 rounded-lg">
              <p className="text-xl font-bold">{r.stats.totalEntries}</p>
              <p className="text-xs text-muted-foreground">日记篇数</p>
            </div>
            <div className="p-2 bg-muted/50 rounded-lg">
              <p className={`text-xl font-bold ${getEmotionColor(r.stats.avgEmotionScore)}`}>
                {r.stats.avgEmotionScore}
              </p>
              <p className="text-xs text-muted-foreground">平均情绪</p>
            </div>
            <div className="p-2 bg-muted/50 rounded-lg">
              <p className="text-xl font-bold">{r.stats.topEmotions.length}</p>
              <p className="text-xs text-muted-foreground">情绪种类</p>
            </div>
          </div>
          
          {/* 情绪标签 */}
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-1">主要情绪</p>
            <div className="flex flex-wrap gap-1">
              {r.stats.topEmotions.map(e => (
                <Badge key={e.tag} variant="secondary" className="text-xs">
                  {e.tag} ({e.count})
                </Badge>
              ))}
            </div>
          </div>
          
          {/* 关注领域 */}
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-1">关注领域</p>
            <div className="flex flex-wrap gap-1">
              {r.stats.topDomains.map(d => (
                <Badge key={d.tag} variant="outline" className="text-xs">
                  {d.tag} ({d.count})
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 本周亮点 */}
      {r.highlights.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              本周亮点
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {r.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-green-500 mt-0.5">✓</span>
                  {h}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 面临的挑战 */}
      {r.challenges.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-500" />
              面临的挑战
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {r.challenges.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-orange-500 mt-0.5">!</span>
                  {c}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* AI 洞察 */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            AI 洞察与建议
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{r.aiInsight}</p>
        </CardContent>
      </Card>

      {/* 下周计划 */}
      {r.nextWeekPlan.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              下周建议
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {r.nextWeekPlan.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-500 mt-0.5">→</span>
                  {p}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // 渲染月报
  const renderMonthlyReport = (r: MonthlyReport) => (
    <div className="space-y-4">
      {/* 统计概览 */}
      <Card>
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            本月统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2 bg-muted/50 rounded-lg">
              <p className="text-xl font-bold">{r.stats.totalEntries}</p>
              <p className="text-xs text-muted-foreground">日记篇数</p>
            </div>
            <div className="p-2 bg-muted/50 rounded-lg">
              <p className={`text-xl font-bold ${getEmotionColor(r.stats.avgEmotionScore)}`}>
                {r.stats.avgEmotionScore}
              </p>
              <p className="text-xs text-muted-foreground">平均情绪</p>
            </div>
            <div className="p-2 bg-muted/50 rounded-lg">
              <p className="text-xl font-bold">{r.stats.emotionTrend.length}</p>
              <p className="text-xs text-muted-foreground">记录周数</p>
            </div>
          </div>
          
          {/* 情绪趋势 */}
          {r.stats.emotionTrend.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">情绪走势</p>
              <div className="flex items-end justify-between h-16 gap-1">
                {r.stats.emotionTrend.map((w) => (
                  <div key={w.week} className="flex flex-col items-center flex-1">
                    <div
                      className={`w-full rounded-t ${getEmotionColor(w.avgScore).replace('text-', 'bg-').split(' ')[0]}`}
                      style={{ height: `${w.avgScore * 10}%` }}
                    />
                    <span className="text-xs text-muted-foreground mt-1">W{w.week}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 情绪分布 */}
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-2">情绪分布</p>
            <div className="flex gap-2">
              {r.stats.moodDistribution.map(d => (
                <div key={d.range} className="flex-1 text-center p-1.5 bg-muted/50 rounded">
                  <p className="text-sm font-medium">{d.count}</p>
                  <p className="text-xs text-muted-foreground">{d.range.split('(')[0]}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 本月亮点 */}
      {r.highlights.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              本月亮点
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {r.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-green-500 mt-0.5">✓</span>
                  {h}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 成长与进步 */}
      {r.growth.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              成长与进步
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {r.growth.map((g, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-green-500 mt-0.5">↑</span>
                  {g}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* AI 洞察 */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            AI 洞察与建议
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{r.aiInsight}</p>
        </CardContent>
      </Card>
    </div>
  );

  // 渲染年报
  const renderYearlyReport = (r: YearlyReport) => (
    <div className="space-y-4">
      {/* 年度统计 */}
      <Card>
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            年度统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2 bg-muted/50 rounded-lg">
              <p className="text-xl font-bold">{r.stats.totalEntries}</p>
              <p className="text-xs text-muted-foreground">日记篇数</p>
            </div>
            <div className="p-2 bg-muted/50 rounded-lg">
              <p className="text-xl font-bold">{r.stats.totalDays}</p>
              <p className="text-xs text-muted-foreground">记录天数</p>
            </div>
            <div className="p-2 bg-muted/50 rounded-lg">
              <p className={`text-xl font-bold ${getEmotionColor(r.stats.avgEmotionScore)}`}>
                {r.stats.avgEmotionScore}
              </p>
              <p className="text-xs text-muted-foreground">平均情绪</p>
            </div>
          </div>
          
          {/* 月度趋势 */}
          {r.stats.monthlyTrend.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">月度情绪走势</p>
              <div className="flex items-end justify-between h-20 gap-0.5">
                {r.stats.monthlyTrend.map((m) => (
                  <div key={m.month} className="flex flex-col items-center flex-1">
                    <div
                      className={`w-full rounded-t ${getEmotionColor(m.avgScore).replace('text-', 'bg-').split(' ')[0]}`}
                      style={{ height: `${m.avgScore * 10}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(m => (
                  <span key={m} className="text-xs text-muted-foreground">{m}</span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 人生里程碑 */}
      {r.stats.milestones.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              人生里程碑
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {r.stats.milestones.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-yellow-500 mt-0.5">★</span>
                  {m}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 年度高光 */}
      {r.yearlyHighlights.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              年度高光时刻
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {r.yearlyHighlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-green-500 mt-0.5">✓</span>
                  {h}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 个人成长 */}
      <Card>
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            个人成长
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{r.personalGrowth}</p>
        </CardContent>
      </Card>

      {/* 感恩清单 */}
      {r.gratitudeList.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Heart className="w-4 h-4 text-blue-500" />
              感恩清单
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {r.gratitudeList.map((g, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-500 mt-0.5">♥</span>
                  {g}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* AI 洞察 */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            AI 年度洞察
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{r.aiInsight}</p>
        </CardContent>
      </Card>

      {/* 新年愿望 */}
      {r.nextYearWishes.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              新年愿望
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {r.nextYearWishes.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-indigo-500 mt-0.5">☆</span>
                  {w}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
        <h2 className="font-semibold">{getTitle()}</h2>
        <div className="w-9" />
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto p-4">
        {!report && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground mb-4">
              {type === 'weekly' && '基于本周日记生成专属周报'}
              {type === 'monthly' && '基于本月日记生成专属月报'}
              {type === 'yearly' && '基于本年度日记生成年度回顾'}
            </p>
            <Button onClick={generateReport} disabled={entries.length === 0}>
              <Sparkles className="w-4 h-4 mr-2" />
              生成报告
            </Button>
            {entries.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">需要先写日记才能生成报告</p>
            )}
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">AI 正在生成报告...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button variant="outline" onClick={generateReport}>
              重试
            </Button>
          </div>
        )}

        {report && (
          <>
            {report.type === 'weekly' && renderWeeklyReport(report as WeeklyReport)}
            {report.type === 'monthly' && renderMonthlyReport(report as MonthlyReport)}
            {report.type === 'yearly' && renderYearlyReport(report as YearlyReport)}
            
            {/* 保存报告 */}
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={generateReport}>
                <Sparkles className="w-4 h-4 mr-2" />
                重新生成
              </Button>
              <Button size="sm" onClick={handleSaveReport} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? '保存中...' : '保存报告'}
              </Button>
              <Button variant="ghost" size="sm" onClick={loadHistoryReports}>
                <History className="w-4 h-4 mr-2" />
                历史报告
              </Button>
            </div>
            {savedMessage && (
              <p className="text-center text-green-600 text-sm mt-2">{savedMessage}</p>
            )}
          </>
        )}
      </div>

      {/* 历史报告面板 */}
      {showHistory && (
        <div className="fixed inset-0 bg-background/95 z-60 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)}>
              <ChevronRight className="w-5 h-5 rotate-180" />
            </Button>
            <h2 className="font-semibold">历史报告</h2>
            <div className="w-9" />
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {historyReports.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <History className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>暂无保存的报告</p>
              </div>
            ) : (
              <div className="space-y-2">
                {historyReports.map((r) => (
                  <Card 
                    key={r.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => viewHistoryReport(r)}
                  >
                    <CardContent className="py-3 px-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {r.type === 'weekly' && `第${r.weekNumber}周周报`}
                          {r.type === 'monthly' && `${r.month}月月报`}
                          {r.type === 'yearly' && `${r.year}年度报告`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.createdAt).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
