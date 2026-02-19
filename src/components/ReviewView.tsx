'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, Calendar as CalendarIcon, BookOpen, Smile, 
  Search, Filter, Clock, X, ChevronDown, ChevronUp,
  FileText, BarChart2, Sparkles, ChevronRight
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { zhCN } from 'date-fns/locale/zh-CN';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DiaryEntry, EMOTION_TAGS, DOMAIN_TAGS, ReportType, WeeklyReport, MonthlyReport, YearlyReport } from '@/types';
import { storage } from '@/lib/storage';
import { format, isToday, isYesterday, subDays, startOfWeek, endOfWeek, eachDayOfInterval, getMonth, getYear } from 'date-fns';
import ReportView from '@/components/ReportView';

interface ReviewViewProps {
  onSelectDateForChat?: (date: string) => void;
}

export default function ReviewView({ onSelectDateForChat }: ReviewViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 搜索和筛选
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [minScore, setMinScore] = useState<number | null>(null);
  const [maxScore, setMaxScore] = useState<number | null>(null);
  
  // 视图模式
  const [viewMode, setViewMode] = useState<'calendar' | 'timeline'>('calendar');
  
  // 报告视图
  const [showReport, setShowReport] = useState<ReportType | null>(null);
  
  // 历史报告数据
  const [reports, setReports] = useState<any[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        const allEntries = await storage.getAllDiaryEntries();
        setEntries(allEntries.sort((a, b) => b.date.localeCompare(a.date)));
        
        // 加载历史报告
        const allReports = await storage.getAllReports();
        setReports(allReports);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // 筛选后的日记
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // 关键词搜索
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchContent = entry.content.toLowerCase().includes(query);
        const matchSummary = entry.summary?.toLowerCase().includes(query);
        const matchTags = entry.classification?.emotionTags.some(t => t.toLowerCase().includes(query));
        const matchDomains = entry.classification?.domains.some(d => d.toLowerCase().includes(query));
        if (!matchContent && !matchSummary && !matchTags && !matchDomains) {
          return false;
        }
      }
      
      // 情绪标签筛选
      if (selectedEmotions.length > 0) {
        const hasEmotion = entry.classification?.emotionTags.some(e => selectedEmotions.includes(e));
        if (!hasEmotion) return false;
      }
      
      // 生活领域筛选
      if (selectedDomains.length > 0) {
        const hasDomain = entry.classification?.domains.some(d => selectedDomains.includes(d));
        if (!hasDomain) return false;
      }
      
      // 情绪分数筛选
      if (minScore !== null && (entry.classification?.emotionScore ?? 0) < minScore) {
        return false;
      }
      if (maxScore !== null && (entry.classification?.emotionScore ?? 10) > maxScore) {
        return false;
      }
      
      return true;
    });
  }, [entries, searchQuery, selectedEmotions, selectedDomains, minScore, maxScore]);

  // 获取日期的日记
  const getEntryForDate = (date: Date): DiaryEntry | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return entries.find(e => e.date === dateStr);
  };

  // 获取选中日期的日记
  const selectedEntry = selectedDate ? getEntryForDate(selectedDate) : undefined;

  // 格式化日期显示
  const formatDateLabel = (dateStr: string): string => {
    const date = new Date(dateStr);
    if (isToday(date)) return '今天';
    if (isYesterday(date)) return '昨天';
    return format(date, 'M月d日 EEEE', { locale: zhCN });
  };

  // 生成情绪趋势图数据
  const generateWeekData = () => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    return days.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const entry = entries.find(e => e.date === dateStr);
      return {
        date: dateStr,
        day: format(date, 'E', { locale: zhCN }),
        dayNum: format(date, 'd'),
        value: entry?.classification?.emotionScore ? entry.classification.emotionScore * 10 : 0,
        hasEntry: !!entry,
        entry
      };
    });
  };

  const weekData = generateWeekData();

  // 计算统计数据
  const stats = useMemo(() => {
    const withScore = entries.filter(e => e.classification?.emotionScore);
    const avgScore = withScore.length > 0
      ? withScore.reduce((sum, e) => sum + (e.classification?.emotionScore ?? 0), 0) / withScore.length
      : 0;
    
    // 情绪统计
    const emotionCounts: Record<string, number> = {};
    const domainCounts: Record<string, number> = {};
    
    entries.forEach(entry => {
      entry.classification?.emotionTags.forEach(tag => {
        emotionCounts[tag] = (emotionCounts[tag] || 0) + 1;
      });
      entry.classification?.domains.forEach(domain => {
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      });
    });
    
    return {
      totalEntries: entries.length,
      avgScore: Math.round(avgScore * 10) / 10,
      thisWeekCount: weekData.filter(d => d.hasEntry).length,
      topEmotions: Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
      topDomains: Object.entries(domainCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
    };
  }, [entries, weekData]);

  // 获取情绪颜色
  const getEmotionColor = (score: number): string => {
    if (score >= 8) return 'bg-green-500';
    if (score >= 6) return 'bg-blue-500';
    if (score >= 4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // 获取情绪背景色
  const getEmotionBgColor = (score: number): string => {
    if (score >= 8) return 'bg-green-100 text-green-800';
    if (score >= 6) return 'bg-blue-100 text-blue-800';
    if (score >= 4) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  // 清除筛选
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedEmotions([]);
    setSelectedDomains([]);
    setMinScore(null);
    setMaxScore(null);
  };

  // 切换筛选标签
  const toggleEmotion = (emotion: string) => {
    setSelectedEmotions(prev => 
      prev.includes(emotion) 
        ? prev.filter(e => e !== emotion)
        : [...prev, emotion]
    );
  };

  const toggleDomain = (domain: string) => {
    setSelectedDomains(prev =>
      prev.includes(domain)
        ? prev.filter(d => d !== domain)
        : [...prev, domain]
    );
  };

  // 按月份分组日记
  const groupedEntries = useMemo(() => {
    const groups: Record<string, DiaryEntry[]> = {};
    filteredEntries.forEach(entry => {
      const date = new Date(entry.date);
      const key = format(date, 'yyyy年M月');
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    });
    return groups;
  }, [filteredEntries]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  // 显示报告
  if (showReport) {
    return (
      <ReportView 
        type={showReport} 
        entries={entries} 
        onClose={() => setShowReport(null)} 
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 页面标题 */}
      <div className="px-4 py-4 border-b border-border bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">回顾</h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              {stats.totalEntries} 篇日记 · 平均情绪 {stats.avgScore}/10
            </p>
          </div>
          <Tabs defaultValue={viewMode} onValueChange={(value) => setViewMode(value as 'calendar' | 'timeline')}>
            <TabsList className="h-8">
              <TabsTrigger 
                value="calendar" 
                className="h-7 px-2 text-xs"
              >
                <CalendarIcon className="w-3.5 h-3.5" />
              </TabsTrigger>
              <TabsTrigger 
                value="timeline" 
                className="h-7 px-2 text-xs"
              >
                <Clock className="w-3.5 h-3.5" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {/* 搜索栏 */}
        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索日记内容、标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="icon"
            className="h-9 w-9"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>
        
        {/* 筛选面板 */}
        {showFilters && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">筛选条件</span>
              {(selectedEmotions.length > 0 || selectedDomains.length > 0 || minScore || maxScore) && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearFilters}>
                  清除全部
                </Button>
              )}
            </div>
            
            {/* 情绪标签 */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">情绪</p>
              <div className="flex flex-wrap gap-1">
                {EMOTION_TAGS.slice(0, 10).map(emotion => (
                  <Badge
                    key={emotion}
                    variant={selectedEmotions.includes(emotion) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleEmotion(emotion)}
                  >
                    {emotion}
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* 生活领域 */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">领域</p>
              <div className="flex flex-wrap gap-1">
                {DOMAIN_TAGS.map(domain => (
                  <Badge
                    key={domain}
                    variant={selectedDomains.includes(domain) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleDomain(domain)}
                  >
                    {domain}
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* 情绪分数 */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">情绪分数</p>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  placeholder="最低"
                  min={1}
                  max={10}
                  value={minScore ?? ''}
                  onChange={(e) => setMinScore(e.target.value ? Number(e.target.value) : null)}
                  className="w-20 h-8"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="number"
                  placeholder="最高"
                  min={1}
                  max={10}
                  value={maxScore ?? ''}
                  onChange={(e) => setMaxScore(e.target.value ? Number(e.target.value) : null)}
                  className="w-20 h-8"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto pb-4">
        {viewMode === 'calendar' ? (
          /* 日历视图 */
          <>
            {/* 报告入口 */}
            <Card className="mx-4 mt-4 mb-4">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-primary" />
                  AI 报告
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    className="h-auto py-3 flex-col gap-1"
                    onClick={() => setShowReport('weekly')}
                  >
                    <BarChart2 className="w-5 h-5" />
                    <span className="text-xs">周报</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-3 flex-col gap-1"
                    onClick={() => setShowReport('monthly')}
                  >
                    <TrendingUp className="w-5 h-5" />
                    <span className="text-xs">月报</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-3 flex-col gap-1"
                    onClick={() => setShowReport('yearly')}
                  >
                    <Sparkles className="w-5 h-5" />
                    <span className="text-xs">年报</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 情绪趋势 */}
            <Card className="mx-4 mt-4 mb-4">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  本周情绪趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                {weekData.some(d => d.hasEntry) ? (
                  <>
                    <div className="flex items-end justify-between h-24 gap-1">
                      {weekData.map((item) => (
                        <div key={item.date} className="flex flex-col items-center flex-1 group">
                          <div
                            className={`w-full rounded-t transition-all cursor-pointer ${
                              item.hasEntry ? getEmotionColor(item.value / 10) : 'bg-muted'
                            }`}
                            style={{ 
                              height: item.hasEntry ? `${Math.max(item.value, 10)}%` : '8%',
                              opacity: item.hasEntry ? 0.8 : 0.3
                            }}
                            onClick={() => item.entry && setSelectedDate(new Date(item.date))}
                          />
                          <span className="text-xs text-muted-foreground mt-1">
                            {item.day}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">本周记录</span>
                        <span className="font-medium">{stats.thisWeekCount} 篇</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">平均情绪</span>
                        <span className="font-medium">{stats.avgScore}/10</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    本周还没有记录
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 日历 */}
            <Card className="mx-4 mb-4">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  日历
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={zhCN}
                  className="rounded-md scale-90 origin-top"
                  modifiers={{
                    hasEntry: entries.map(e => new Date(e.date))
                  }}
                  modifiersStyles={{
                    hasEntry: { 
                      fontWeight: 'bold',
                      backgroundColor: 'hsl(var(--primary) / 0.1)',
                      borderRadius: '50%'
                    }
                  }}
                />
                
                {/* 选中日期的操作 */}
                {selectedDate && (
                  <div className="w-full mt-2 flex gap-2">
                    {selectedEntry ? (
                      <Button 
                        variant="outline" 
                        className="flex-1 text-xs"
                        onClick={() => {
                          const dateStr = format(selectedDate, 'yyyy-MM-dd');
                          onSelectDateForChat?.(dateStr);
                        }}
                      >
                        编辑日记
                      </Button>
                    ) : (
                      <Button 
                        className="flex-1 text-xs"
                        onClick={() => {
                          const dateStr = format(selectedDate, 'yyyy-MM-dd');
                          onSelectDateForChat?.(dateStr);
                        }}
                      >
                        补记这一天
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 历史报告列表 */}
            {reports.length > 0 && (
              <Card className="mx-4 mt-4">
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-primary" />
                    历史报告
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* 按年份分组 */}
                  {Array.from(new Set(reports.map(r => r.year))).sort((a, b) => b - a).map(year => (
                    <div key={year}>
                      <p className="text-xs font-medium text-muted-foreground mb-2">{year}年</p>
                      <div className="space-y-1">
                        {/* 周报 */}
                        {reports.filter(r => r.type === 'weekly' && r.year === year)
                          .sort((a, b) => (b.weekNumber || 0) - (a.weekNumber || 0))
                          .slice(0, 4)
                          .map(r => (
                            <button
                              key={r.id}
                              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 text-left"
                              onClick={() => {
                                // 直接查看报告
                                setShowReport('weekly');
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <BarChart2 className="w-4 h-4 text-primary" />
                                <span className="text-sm">第{r.weekNumber}周周报</span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </button>
                          ))}
                        {/* 月报 */}
                        {reports.filter(r => r.type === 'monthly' && r.year === year)
                          .sort((a, b) => (b.month || 0) - (a.month || 0))
                          .map(r => (
                            <button
                              key={r.id}
                              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 text-left"
                              onClick={() => {
                                setShowReport('monthly');
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-primary" />
                                <span className="text-sm">{r.month}月月报</span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </button>
                          ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* 统计卡片 */}
            {entries.length > 0 && (
              <Card className="mx-4 mb-4">
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-sm">统计概览</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {stats.topEmotions.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">常见情绪</p>
                        <div className="space-y-1">
                          {stats.topEmotions.slice(0, 3).map(([emotion, count]) => (
                            <div key={emotion} className="flex items-center justify-between text-xs">
                              <span>{emotion}</span>
                              <span className="text-muted-foreground">{count}次</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {stats.topDomains.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">关注领域</p>
                        <div className="space-y-1">
                          {stats.topDomains.slice(0, 3).map(([domain, count]) => (
                            <div key={domain} className="flex items-center justify-between text-xs">
                              <span>{domain}</span>
                              <span className="text-muted-foreground">{count}次</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 最近日记 */}
            <Card className="mx-4">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BookOpen className="w-4 h-4 text-primary" />
                  最近日记
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredEntries.length > 0 ? (
                  <div className="space-y-2">
                    {filteredEntries.slice(0, 5).map((entry) => (
                      <div 
                        key={entry.id} 
                        className="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => setSelectedDate(new Date(entry.date))}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">
                            {formatDateLabel(entry.date)}
                          </span>
                          {entry.classification && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${getEmotionBgColor(entry.classification.emotionScore)}`}>
                              {entry.classification.emotionScore}
                            </span>
                          )}
                        </div>
                        <p className="text-foreground text-sm line-clamp-2">
                          {entry.summary || entry.content}
                        </p>
                      </div>
                    ))}
                    {filteredEntries.length > 5 && (
                      <p className="text-center text-xs text-muted-foreground pt-2">
                        还有 {filteredEntries.length - 5} 篇日记
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    {entries.length === 0 ? '还没有日记' : '没有匹配的日记'}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          /* 时间线视图 */
          <div className="px-4 pt-4">
            {filteredEntries.length > 0 ? (
              Object.entries(groupedEntries).map(([month, monthEntries]) => (
                <div key={month} className="mb-6">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-background py-1">
                    {month} ({monthEntries.length}篇)
                  </h3>
                  <div className="relative pl-4 border-l-2 border-border">
                    {monthEntries.map((entry, index) => (
                      <div 
                        key={entry.id}
                        className="relative mb-4 last:mb-0"
                      >
                        {/* 时间线点 */}
                        <div className={`absolute -left-[21px] top-3 w-3 h-3 rounded-full border-2 border-background ${
                          entry.classification 
                            ? getEmotionColor(entry.classification.emotionScore)
                            : 'bg-muted'
                        }`} />
                        
                        {/* 内容卡片 */}
                        <div 
                          className="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => {
                            setSelectedDate(new Date(entry.date));
                            setViewMode('calendar');
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(entry.date), 'M月d日 EEEE', { locale: zhCN })}
                            </span>
                            {entry.classification && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getEmotionBgColor(entry.classification.emotionScore)}`}>
                                😊 {entry.classification.emotionScore}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-foreground line-clamp-3">
                            {entry.summary || entry.content}
                          </p>
                          {entry.classification && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {entry.classification.emotionTags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs py-0">
                                  {tag}
                                </Badge>
                              ))}
                              {entry.classification.domains.map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs py-0">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{entries.length === 0 ? '还没有日记' : '没有匹配的日记'}</p>
                <p className="text-sm mt-1">
                  {entries.length === 0 ? '去对话页面开始记录吧' : '尝试调整筛选条件'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
