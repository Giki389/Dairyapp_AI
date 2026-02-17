'use client';

import { MessageCircle, BarChart3, Settings } from 'lucide-react';
import { TabType } from '@/types';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: { id: TabType; label: string; icon: typeof MessageCircle }[] = [
  { id: 'chat', label: '对话', icon: MessageCircle },
  { id: 'review', label: '回顾', icon: BarChart3 },
  { id: 'settings', label: '设置', icon: Settings },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              'flex flex-col items-center justify-center w-20 h-full transition-colors',
              activeTab === id
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-6 h-6 mb-1" />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
