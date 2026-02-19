'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  Lock,
  Fingerprint,
  Sparkles,
  ChevronRight,
  Moon,
  Bell,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { storage } from '@/lib/storage';
import { hashPassword, verifyPassword } from '@/lib/crypto';

interface SettingsViewProps {
  onResetPassword?: () => void;
}

export default function SettingsView({ onResetPassword }: SettingsViewProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  // 加载设置
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await storage.getSettings();
      if (settings) {
        setBiometricEnabled(settings.biometricEnabled || false);
      }
    };
    loadSettings();
  }, []);

  // 同步深色模式状态
  useEffect(() => {
    setDarkModeEnabled(resolvedTheme === 'dark');
  }, [resolvedTheme]);

  const handleDarkModeToggle = (enabled: boolean) => {
    setDarkModeEnabled(enabled);
    setTheme(enabled ? 'dark' : 'light');
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    setBiometricEnabled(enabled);
    const settings = await storage.getSettings();
    if (settings) {
      await storage.saveSettings({
        ...settings,
        biometricEnabled: enabled,
      });
    }
  };

  const handleChangePassword = async () => {
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('请填写所有字段');
      return;
    }

    if (newPassword.length !== 6 || !/^\d+$/.test(newPassword)) {
      setError('新密码必须是6位数字');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }

    const settings = await storage.getSettings();
    if (settings?.password) {
      const isValid = await verifyPassword(currentPassword, settings.password);
      if (!isValid) {
        setError('当前密码错误');
        return;
      }

      const hashedPassword = await hashPassword(newPassword);
      await storage.saveSettings({
        ...settings,
        password: hashedPassword,
      });

      setShowPasswordDialog(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      alert('密码修改成功！');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-4">
      {/* 页面标题 */}
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold text-foreground">设置</h1>
        <p className="text-muted-foreground text-sm mt-1">
          管理你的应用偏好设置
        </p>
      </div>

      {/* 安全设置 */}
      <Card className="mx-4 mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">安全</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <button
            className="flex items-center justify-between w-full py-3 hover:bg-muted/50 px-2 -mx-2 rounded-lg transition-colors"
            onClick={() => setShowPasswordDialog(true)}
          >
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">修改密码</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

          <Separator className="my-1" />

          <div className="flex items-center justify-between py-3 px-2">
            <div className="flex items-center gap-3">
              <Fingerprint className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">生物识别解锁</span>
            </div>
            <Switch
              checked={biometricEnabled}
              onCheckedChange={handleBiometricToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI 设置 */}
      <Card className="mx-4 mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">AI 助手</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <button className="flex items-center justify-between w-full py-3 hover:bg-muted/50 px-2 -mx-2 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">AI 模型设置</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

          <Separator className="my-1" />

          <div className="flex items-center justify-between py-3 px-2">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">智能建议</span>
            </div>
            <Switch
              checked={true}
              onCheckedChange={() => alert('此功能将在后续版本中推出')}
            />
          </div>
        </CardContent>
      </Card>

      {/* 外观设置 */}
      <Card className="mx-4 mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">外观</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="flex items-center justify-between py-3 px-2">
            <div className="flex items-center gap-3">
              <Moon className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">深色模式</span>
            </div>
            <Switch
              checked={darkModeEnabled}
              onCheckedChange={handleDarkModeToggle}
            />
          </div>

          <Separator className="my-1" />

          <div className="flex items-center justify-between py-3 px-2">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">提醒通知</span>
            </div>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* 关于 */}
      <Card className="mx-4">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">版本</span>
            </div>
            <span className="text-muted-foreground text-sm">1.0.0</span>
          </div>
        </CardContent>
      </Card>

      {/* 修改密码对话框 */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
            <DialogDescription>请输入当前密码和新密码</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">当前密码</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="请输入当前密码"
                maxLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">新密码</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入6位数字密码"
                maxLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">确认新密码</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
                maxLength={6}
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPasswordDialog(false)}
            >
              取消
            </Button>
            <Button onClick={handleChangePassword}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
