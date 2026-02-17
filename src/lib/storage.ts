/**
 * IndexedDB 存储服务
 * 用于本地存储日记数据、设置等
 */

import { AppSettings, DiaryEntry, ChatMessage, DB_NAME, DB_VERSION } from '@/types';

interface DBSchema {
  settings: AppSettings;
  diary_entries: DiaryEntry;
  chat_messages: ChatMessage;
}

class StorageService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  /**
   * 初始化数据库
   */
  async init(): Promise<IDBDatabase> {
    // 如果已经有初始化的Promise，返回它
    if (this.initPromise) {
      return this.initPromise;
    }

    // 如果数据库已经初始化，直接返回
    if (this.db) {
      return this.db;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建设置存储（只有一个记录）
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }

        // 创建日记条目存储
        if (!db.objectStoreNames.contains('diary_entries')) {
          const diaryStore = db.createObjectStore('diary_entries', { keyPath: 'id' });
          diaryStore.createIndex('date', 'date', { unique: false });
          // 移除嵌套索引，因为 emotionScore 在 classification 对象中
          // 可以在应用层进行过滤和排序
        }

        // 创建聊天消息存储
        if (!db.objectStoreNames.contains('chat_messages')) {
          const chatStore = db.createObjectStore('chat_messages', { keyPath: 'id' });
          chatStore.createIndex('date', 'date', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * 获取事务和对象存储
   */
  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.init();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // ==================== 设置相关 ====================

  /**
   * 获取应用设置
   */
  async getSettings(): Promise<AppSettings | null> {
    const store = await this.getStore('settings', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.get('app_settings');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to get settings'));
    });
  }

  /**
   * 保存应用设置
   */
  async saveSettings(settings: AppSettings): Promise<void> {
    const store = await this.getStore('settings', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put({ id: 'app_settings', ...settings });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save settings'));
    });
  }

  /**
   * 检查是否已设置密码
   */
  async hasPassword(): Promise<boolean> {
    const settings = await this.getSettings();
    return !!settings?.password;
  }

  // ==================== 日记相关 ====================

  /**
   * 获取所有日记条目
   */
  async getAllDiaryEntries(): Promise<DiaryEntry[]> {
    const store = await this.getStore('diary_entries', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to get diary entries'));
    });
  }

  /**
   * 根据日期获取日记条目
   */
  async getDiaryEntryByDate(date: string): Promise<DiaryEntry | null> {
    const store = await this.getStore('diary_entries', 'readonly');
    const index = store.index('date');
    return new Promise((resolve, reject) => {
      const request = index.get(date);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to get diary entry'));
    });
  }

  /**
   * 保存日记条目
   */
  async saveDiaryEntry(entry: DiaryEntry): Promise<void> {
    const store = await this.getStore('diary_entries', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save diary entry'));
    });
  }

  /**
   * 删除日记条目
   */
  async deleteDiaryEntry(id: string): Promise<void> {
    const store = await this.getStore('diary_entries', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete diary entry'));
    });
  }

  // ==================== 工具方法 ====================

  /**
   * 生成唯一ID
   */
  generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取今天的日期字符串 (YYYY-MM-DD)
   */
  getTodayDateString(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  // ==================== 聊天消息相关 ====================

  /**
   * 保存聊天消息
   */
  async saveChatMessages(date: string, messages: ChatMessage[]): Promise<void> {
    const store = await this.getStore('chat_messages', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put({ id: `chat_${date}`, date, messages });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save chat messages'));
    });
  }

  /**
   * 获取某天的聊天消息
   */
  async getChatMessages(date: string): Promise<ChatMessage[] | null> {
    const store = await this.getStore('chat_messages', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(`chat_${date}`);
      request.onsuccess = () => resolve(request.result?.messages || null);
      request.onerror = () => reject(new Error('Failed to get chat messages'));
    });
  }

  /**
   * 清除某天的聊天消息
   */
  async clearChatMessages(date: string): Promise<void> {
    const store = await this.getStore('chat_messages', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(`chat_${date}`);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to clear chat messages'));
    });
  }

  // ==================== 统计相关 ====================

  /**
   * 获取某时间范围内的日记
   */
  async getDiaryEntriesByRange(startDate: string, endDate: string): Promise<DiaryEntry[]> {
    const all = await this.getAllDiaryEntries();
    return all.filter(entry => entry.date >= startDate && entry.date <= endDate);
  }

  /**
   * 获取情绪统计数据
   */
  async getEmotionStats(days: number = 7): Promise<{ date: string; score: number }[]> {
    const all = await this.getAllDiaryEntries();
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const startDateStr = startDate.toISOString().split('T')[0];

    return all
      .filter(entry => entry.date >= startDateStr && entry.classification)
      .map(entry => ({
        date: entry.date,
        score: entry.classification!.emotionScore
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}

// 导出单例实例
export const storage = new StorageService();
