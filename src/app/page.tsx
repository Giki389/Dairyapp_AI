'use client';

import { useState, useCallback } from 'react';
import PasscodeScreen from '@/components/PasscodeScreen';
import BottomNav from '@/components/BottomNav';
import ChatView from '@/components/ChatView';
import ReviewView from '@/components/ReviewView';
import SettingsView from '@/components/SettingsView';
import { TabType } from '@/types';

export default function Home() {
  const [isUnlocked, setIsUnlocked] = useState(true);  // 调试模式：跳过密码
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [key, setKey] = useState(0); // 用于强制重新渲染

  const handleUnlock = useCallback(() => {
    setIsUnlocked(true);
  }, []);

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  const handleResetPassword = useCallback(() => {
    setIsUnlocked(false);
    setKey(prev => prev + 1);
  }, []);

  // 渲染当前选中的页面
  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatView />;
      case 'review':
        return <ReviewView />;
      case 'settings':
        return <SettingsView onResetPassword={handleResetPassword} />;
      default:
        return <ChatView />;
    }
  };

  // 如果未解锁，显示密码锁屏
  if (!isUnlocked) {
    return <PasscodeScreen key={key} onUnlock={handleUnlock} />;
  }

  // 已解锁，显示主应用
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 内容区域 */}
      <main className="flex-1 overflow-hidden pb-16">
        {renderContent()}
      </main>

      {/* 底部导航 */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
