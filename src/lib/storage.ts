/**
 * API 存储服务
 * 通过 REST API 调用后端 SQLite 数据库
 */

import { AppSettings, DiaryEntry, ChatMessage, WeeklyReport, MonthlyReport, YearlyReport } from '@/types';

const API_BASE = '/api/storage';

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

class StorageService {
  private async request<T>(
    method: string,
    type: string,
    params: Record<string, string> = {},
    body?: unknown
  ): Promise<T> {
    const url = new URL(API_BASE, window.location.origin);
    url.searchParams.set('type', type);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    });

    const response = await fetch(url.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async init(): Promise<void> {
    return Promise.resolve();
  }

  async getSettings(): Promise<AppSettings | null> {
    return this.request<AppSettings | null>('GET', 'settings');
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.request<{ id: string }>('POST', 'settings', {}, settings);
  }

  async hasPassword(): Promise<boolean> {
    const settings = await this.getSettings();
    return !!settings?.password;
  }

  async getAllDiaryEntries(): Promise<DiaryEntry[]> {
    return this.request<DiaryEntry[]>('GET', 'diary_entries');
  }

  async getDiaryEntryByDate(date: string): Promise<DiaryEntry | null> {
    return this.request<DiaryEntry | null>('GET', 'diary_entries', { date });
  }

  async saveDiaryEntry(entry: DiaryEntry): Promise<void> {
    await this.request<DiaryEntry>('POST', 'diary_entries', {}, entry);
  }

  async deleteDiaryEntry(id: string): Promise<void> {
    await this.request<{ success: boolean }>('DELETE', 'diary_entries', { id });
  }

  generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getTodayDateString(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  async saveChatMessages(date: string, messages: ChatMessage[]): Promise<void> {
    await this.request<ChatMessage[]>('POST', 'chat_messages', {}, { date, messages });
  }

  async getChatMessages(date: string): Promise<ChatMessage[] | null> {
    return this.request<ChatMessage[] | null>('GET', 'chat_messages', { date });
  }

  async clearChatMessages(date: string): Promise<void> {
    await this.request<{ success: boolean }>('DELETE', 'chat_messages', { date });
  }

  async getDiaryEntriesByRange(startDate: string, endDate: string): Promise<DiaryEntry[]> {
    const all = await this.getAllDiaryEntries();
    return all.filter(entry => entry.date >= startDate && entry.date <= endDate);
  }

  async getEmotionStats(days: number = 7): Promise<{ date: string; score: number }[]> {
    return this.request<{ date: string; score: number }[]>('GET', 'emotion_stats', { days: days.toString() });
  }

  async getAllReports(): Promise<ReportData[]> {
    return this.request<ReportData[]>('GET', 'reports');
  }

  async getReport(reportType: string, year: number, weekNumber?: number, month?: number): Promise<ReportData | null> {
    const params: Record<string, string> = { reportType, year: year.toString() };
    if (weekNumber) params.weekNumber = weekNumber.toString();
    if (month) params.month = month.toString();
    return this.request<ReportData | null>('GET', 'report', params);
  }

  async saveReport(reportType: string, year: number, data: WeeklyReport | MonthlyReport | YearlyReport, weekNumber?: number, month?: number): Promise<void> {
    await this.request<ReportData>('POST', 'report', {}, { reportType, year, weekNumber, month, data });
  }
}

export const storage = new StorageService();
