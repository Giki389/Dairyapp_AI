// 应用设置
export interface AppSettings {
  password: string; // 加密后的密码
  biometricEnabled: boolean;
}

// AI 分类结果
export interface Classification {
  emotionTags: string[]; // 情绪标签
  domains: string[]; // 生活领域
  eventTypes: string[]; // 事件类型
  emotionScore: number; // 情绪评分 1-10
  importance: number; // 重要程度 1-5
  summary: string; // 一句话总结
}

// 日记条目
export interface DiaryEntry {
  id: string;
  date: string; // YYYY-MM-DD 格式
  content: string; // 原始内容
  summary?: string; // AI 生成的总结
  
  // AI 分类
  classification?: Classification;
  
  // 对话记录
  conversation: ChatMessage[];
  
  createdAt: string;
  updatedAt: string;
}

// 聊天消息
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// 对话状态
export interface ChatSession {
  messages: ChatMessage[];
  isProcessing: boolean;
  currentEntry?: Partial<DiaryEntry>;
}

// 导航Tab类型
export type TabType = 'chat' | 'review' | 'settings';

// 存储键名
export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  DIARY_ENTRIES: 'diary_entries',
  CHAT_MESSAGES: 'chat_messages',
} as const;

// IndexedDB 数据库名称和版本
export const DB_NAME = 'DiaryAppDB';
export const DB_VERSION = 3; // 升级版本以修复索引问题

// 情绪标签选项
export const EMOTION_TAGS = [
  '开心', '平静', '焦虑', '低落', '愤怒', '感恩', '释然', '兴奋', '疲惫', '满足',
  '紧张', '放松', '感动', '失落', '期待', '安心', '迷茫', '自信'
] as const;

// 生活领域选项
export const DOMAIN_TAGS = [
  '工作', '家庭', '健康', '学习', '社交', '娱乐', '财务', '旅行', '爱好', '日常'
] as const;

// 事件类型选项
export const EVENT_TYPES = [
  '成就', '困难', '感悟', '计划', '回忆', '决策', '日常', '突破', '挑战'
] as const;

// 报告类型
export type ReportType = 'weekly' | 'monthly' | 'yearly';

// 周报数据
export interface WeeklyReport {
  id: string;
  type: 'weekly';
  year: number;
  weekNumber: number; // 第几周
  dateRange: {
    start: string; // YYYY-MM-DD
    end: string;
  };
  
  // 统计数据
  stats: {
    totalEntries: number;
    avgEmotionScore: number;
    topEmotions: { tag: string; count: number }[];
    topDomains: { tag: string; count: number }[];
    topKeywords: { word: string; count: number }[];
  };
  
  // 内容
  highlights: string[]; // 本周亮点
  challenges: string[]; // 面临的挑战
  aiInsight: string; // AI 洞察与建议
  nextWeekPlan: string[]; // 下周计划建议
  
  createdAt: string;
}

// 月报数据
export interface MonthlyReport {
  id: string;
  type: 'monthly';
  year: number;
  month: number; // 1-12
  
  // 统计数据
  stats: {
    totalEntries: number;
    avgEmotionScore: number;
    emotionTrend: { week: number; avgScore: number }[]; // 按周统计
    topEmotions: { tag: string; count: number }[];
    topDomains: { tag: string; count: number }[];
    moodDistribution: { range: string; count: number }[]; // 情绪分布
  };
  
  // 内容
  highlights: string[];
  challenges: string[];
  growth: string[]; // 成长与进步
  aiInsight: string;
  nextMonthFocus: string[];
  
  createdAt: string;
}

// 年报数据
export interface YearlyReport {
  id: string;
  type: 'yearly';
  year: number;
  
  // 统计数据
  stats: {
    totalEntries: number;
    totalDays: number; // 记录了多少天
    avgEmotionScore: number;
    monthlyTrend: { month: number; avgScore: number }[];
    topEmotions: { tag: string; count: number }[];
    topDomains: { tag: string; count: number }[];
    milestones: string[]; // 人生里程碑
  };
  
  // 内容
  yearlyHighlights: string[]; // 年度高光时刻
  yearlyChallenges: string[]; // 年度挑战
  personalGrowth: string; // 个人成长总结
  gratitudeList: string[]; // 感恩清单
  aiInsight: string;
  nextYearWishes: string[]; // 新年愿望
  
  createdAt: string;
}

// 报告联合类型
export type Report = WeeklyReport | MonthlyReport | YearlyReport;
