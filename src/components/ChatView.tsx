'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Save, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ChatMessage, Classification, DiaryEntry } from '@/types';
import { storage } from '@/lib/storage';

export default function ChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [classification, setClassification] = useState<Classification | null>(null);
  const [showSaveCard, setShowSaveCard] = useState(false);
  const [todayEntry, setTodayEntry] = useState<DiaryEntry | null>(null);
  const [currentDate, setCurrentDate] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const today = storage.getTodayDateString();

  // 设置当前日期（客户端）
  useEffect(() => {
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const now = new Date();
    setCurrentDate(`${now.getMonth() + 1}月${now.getDate()}日 ${weekDays[now.getDay()]}`);
  }, []);

  // 加载今天的对话历史
  useEffect(() => {
    const loadTodayChat = async () => {
      const savedMessages = await storage.getChatMessages(today);
      if (savedMessages && savedMessages.length > 0) {
        setMessages(savedMessages);
      } else {
        // 添加欢迎消息
        const hour = new Date().getHours();
        let greeting = hour < 6 ? '夜深了，还没休息吗？' 
                    : hour < 12 ? '早上好！'
                    : hour < 14 ? '中午好！'
                    : hour < 18 ? '下午好！' 
                    : '晚上好！';
        
        const welcomeMessage: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: `${greeting} 🌟\n\n想记录点什么吗？可以直接和我说，也可以点麦克风语音输入~`,
          timestamp: new Date().toISOString()
        };
        setMessages([welcomeMessage]);
      }
      
      // 检查今天是否已有日记
      const entry = await storage.getDiaryEntryByDate(today);
      if (entry) {
        setTodayEntry(entry);
      }
    };
    loadTodayChat();
  }, [today]);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) })
      });

      const data = await response.json();
      
      // 检查响应
      if (!response.ok || !data.content) {
        throw new Error(data.error || data.details || '请求失败');
      }
      
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: data.content,
        timestamp: new Date().toISOString()
      };

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);
      
      await storage.saveChatMessages(today, updatedMessages);

      // 检查是否可以整理日记了
      if (data.content.includes('整理今天的日记') || data.content.includes('帮你整理')) {
        setShowSaveCard(true);
        await classifyConversation(updatedMessages);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: `抱歉，遇到了一些问题：${error instanceof Error ? error.message : '请稍后再试'}~`,
        timestamp: new Date().toISOString()
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 分类对话内容
  const classifyConversation = async (msgs: ChatMessage[]) => {
    try {
      const userMessages = msgs
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join('\n');

      if (!userMessages) return;

      const response = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMessages })
      });

      if (response.ok) {
        const result: Classification = await response.json();
        setClassification(result);
      } else {
        // 分类失败时使用默认值
        setClassification({
          emotionTags: ['平静'],
          domains: ['日常'],
          eventTypes: ['日常'],
          emotionScore: 5,
          importance: 2,
          summary: '今天的日记'
        });
      }
    } catch (error) {
      console.error('Classify error:', error);
      // 设置默认分类
      setClassification({
        emotionTags: ['平静'],
        domains: ['日常'],
        eventTypes: ['日常'],
        emotionScore: 5,
        importance: 2,
        summary: '今天的日记'
      });
    }
  };

  // 保存日记
  const handleSaveDiary = async () => {
    const userMessages = messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n');

    const entry: DiaryEntry = {
      id: todayEntry?.id || `diary_${today}`,
      date: today,
      content: userMessages,
      summary: classification?.summary || '今天的日记',
      classification: classification || undefined,
      conversation: messages,
      createdAt: todayEntry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await storage.saveDiaryEntry(entry);
      setTodayEntry(entry);
      setShowSaveCard(false);
      
      const successMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: '✅ 日记已保存！\n\n你可以在"回顾"页面查看今天的记录。明天见~ 🌙',
        timestamp: new Date().toISOString()
      };
      
      const updatedMessages = [...messages, successMessage];
      setMessages(updatedMessages);
      await storage.saveChatMessages(today, updatedMessages);
    } catch (error) {
      console.error('Save diary error:', error);
      alert('保存失败，请重试');
    }
  };

  // 语音录制
  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // 检测支持的 MIME 类型
        let mimeType = 'audio/webm';
        const types = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/ogg;codecs=opus',
          'audio/ogg',
          'audio/mp4',
          'audio/wav'
        ];
        
        for (const type of types) {
          if (MediaRecorder.isTypeSupported(type)) {
            mimeType = type;
            break;
          }
        }
        
        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach(track => track.stop());
          if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            await transcribeAudio(audioBlob, mimeType);
          }
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Microphone error:', error);
        alert('无法访问麦克风，请检查权限设置');
      }
    }
  };

  // 语音转文字
  const transcribeAudio = async (audioBlob: Blob, mimeType: string) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.' + mimeType.split('/')[1]);

      const response = await fetch('/api/transcribe', { method: 'POST', body: formData });
      const data = await response.json();
      
      if (data.text) {
        setInput(prev => prev ? `${prev} ${data.text}` : data.text);
      }
    } catch (error) {
      console.error('Transcribe error:', error);
      alert('语音识别失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 快捷提示点击
  const handleQuickPrompt = (prompt: string) => setInput(prompt);

  // 获取情绪颜色
  const getEmotionColor = (score: number): string => {
    if (score >= 8) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 6) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (score >= 4) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <div className="flex flex-col h-full">
      {/* 日期头部 */}
      <div className="px-4 py-3 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{currentDate || '加载中...'}</p>
            {todayEntry && <p className="text-xs text-muted-foreground mt-0.5">✅ 今天已记录</p>}
          </div>
          {messages.length > 2 && !showSaveCard && (
            <Button variant="outline" size="sm" onClick={() => { setShowSaveCard(true); classifyConversation(messages); }}>
              <Save className="w-4 h-4 mr-1" />整理日记
            </Button>
          )}
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-3">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        {/* 保存卡片 */}
        {showSaveCard && classification && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="font-medium text-sm">今日日记整理</span>
              </div>
              <p className="text-sm text-muted-foreground">{classification.summary}</p>
              {classification.emotionTags && classification.emotionTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {classification.emotionTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              )}
              {classification.domains && classification.domains.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {classification.domains.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              )}
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getEmotionColor(classification.emotionScore)}`}>
                😊 情绪评分: {classification.emotionScore}/10
              </div>
              <Button className="w-full" onClick={handleSaveDiary} disabled={isLoading}>
                <Save className="w-4 h-4 mr-2" />保存日记
              </Button>
            </CardContent>
          </Card>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 快捷提示 */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 space-y-2">
          <button onClick={() => handleQuickPrompt('今天心情怎么样？想记录一下...')} className="w-full p-3 bg-muted/50 rounded-xl text-left hover:bg-muted transition-colors">
            <p className="text-foreground text-sm">今天心情怎么样？</p>
            <p className="text-muted-foreground text-xs mt-0.5">记录当下的感受</p>
          </button>
          <button onClick={() => handleQuickPrompt('今天发生了什么？让我想想...')} className="w-full p-3 bg-muted/50 rounded-xl text-left hover:bg-muted transition-colors">
            <p className="text-foreground text-sm">今天发生了什么？</p>
            <p className="text-muted-foreground text-xs mt-0.5">写下今天的故事</p>
          </button>
        </div>
      )}

      {/* 输入区域 */}
      <div className="border-t border-border bg-background p-3 safe-area-bottom">
        <div className="flex gap-2 items-end max-w-lg mx-auto">
          <Button size="icon" variant={isRecording ? "destructive" : "outline"} onClick={toggleRecording} className="shrink-0 h-10 w-10">
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={isRecording ? "正在录音..." : "写下你想说的..."}
            className="min-h-[40px] max-h-32 resize-none flex-1"
            rows={1}
            disabled={isRecording || isLoading}
          />
          <Button size="icon" onClick={handleSend} disabled={!input.trim() || isLoading} className="shrink-0 h-10 w-10">
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
