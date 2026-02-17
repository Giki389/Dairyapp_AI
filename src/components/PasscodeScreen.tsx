'use client';

import { useState, useEffect, useCallback } from 'react';
import { Fingerprint, Delete } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/storage';
import { hashPassword, verifyPassword } from '@/lib/crypto';
import { AppSettings } from '@/types';

interface PasscodeScreenProps {
  onUnlock: () => void;
}

type Mode = 'setup' | 'confirm' | 'unlock';

export default function PasscodeScreen({ onUnlock }: PasscodeScreenProps) {
  const [mode, setMode] = useState<Mode>('unlock');
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [error, setError] = useState('');
  const [ BiometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化：检查是否已设置密码
  useEffect(() => {
    const checkPassword = async () => {
      try {
        const settings = await storage.getSettings();
        if (settings?.password) {
          setMode('unlock');
          setBiometricEnabled(settings.biometricEnabled || false);
        } else {
          setMode('setup');
        }
      } catch {
        setMode('setup');
      } finally {
        setIsLoading(false);
      }
    };
    checkPassword();
  }, []);

  // 检查生物识别是否可用
  useEffect(() => {
    if ('PublicKeyCredential' in window) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then((available) => {
          setBiometricAvailable(available);
        })
        .catch(() => {
          setBiometricAvailable(false);
        });
    }
  }, []);

  const handleNumberPress = useCallback((num: number) => {
    if (passcode.length < 6) {
      setError('');
      setPasscode(prev => prev + num);
    }
  }, [passcode]);

  const handleDelete = useCallback(() => {
    setPasscode(prev => prev.slice(0, -1));
    setError('');
  }, []);

  const handleSetupComplete = useCallback(async () => {
    if (mode === 'setup') {
      // 第一次输入完成，进入确认模式
      setConfirmPasscode(passcode);
      setPasscode('');
      setMode('confirm');
    } else if (mode === 'confirm') {
      // 确认输入完成，验证两次密码是否一致
      if (passcode === confirmPasscode) {
        const hashedPassword = await hashPassword(passcode);
        const settings: AppSettings = {
          password: hashedPassword,
          biometricEnabled: false,
        };
        await storage.saveSettings(settings);
        onUnlock();
      } else {
        setError('两次密码不一致，请重新设置');
        setPasscode('');
        setConfirmPasscode('');
        setMode('setup');
      }
    }
  }, [mode, passcode, confirmPasscode, onUnlock]);

  const handleUnlock = useCallback(async () => {
    if (mode === 'unlock') {
      const settings = await storage.getSettings();
      if (settings?.password) {
        const isValid = await verifyPassword(passcode, settings.password);
        if (isValid) {
          onUnlock();
        } else {
          setError('密码错误，请重试');
          setPasscode('');
        }
      }
    }
  }, [mode, passcode, onUnlock]);

  // 当输入6位密码后自动验证/确认
  useEffect(() => {
    if (passcode.length === 6) {
      if (mode === 'unlock') {
        handleUnlock();
      } else {
        handleSetupComplete();
      }
    }
  }, [passcode, mode, handleUnlock, handleSetupComplete]);

  // 模拟生物识别（实际使用需要原生支持）
  const handleBiometric = useCallback(async () => {
    // 在实际应用中，这里应该调用原生生物识别API
    // 由于是Web应用，这里只是模拟提示
    alert('生物识别功能需要原生App支持\n当前为Web演示版本');
  }, []);

  const getTitle = () => {
    switch (mode) {
      case 'setup':
        return '设置密码';
      case 'confirm':
        return '确认密码';
      case 'unlock':
        return '输入密码';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'setup':
        return '请输入6位数字密码';
      case 'confirm':
        return '请再次输入密码确认';
      case 'unlock':
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center px-6">
      {/* 标题区域 */}
      <div className="text-center mb-12">
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          {getTitle()}
        </h1>
        {getSubtitle() && (
          <p className="text-muted-foreground">{getSubtitle()}</p>
        )}
        {mode === 'confirm' && (
          <p className="text-sm text-muted-foreground mt-1">
            首次设置: {confirmPasscode.split('').map(() => '•').join(' ')}
          </p>
        )}
      </div>

      {/* 密码指示器 */}
      <div className="flex gap-4 mb-8">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div
            key={index}
            className={`w-4 h-4 rounded-full border-2 transition-all ${
              index < passcode.length
                ? 'bg-primary border-primary'
                : 'border-muted-foreground'
            }`}
          />
        ))}
      </div>

      {/* 错误提示 */}
      {error && (
        <p className="text-destructive text-sm mb-4 animate-pulse">{error}</p>
      )}

      {/* 数字键盘 */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <Button
            key={num}
            variant="ghost"
            className="h-16 text-2xl font-light rounded-full hover:bg-muted active:bg-muted/80"
            onClick={() => handleNumberPress(num)}
          >
            {num}
          </Button>
        ))}
        {/* 生物识别按钮（如果在解锁模式且已启用） */}
        <Button
          variant="ghost"
          className={`h-16 rounded-full ${
            mode === 'unlock' && BiometricAvailable && biometricEnabled
              ? 'hover:bg-muted'
              : 'opacity-0 pointer-events-none'
          }`}
          onClick={handleBiometric}
          disabled={mode !== 'unlock' || !BiometricAvailable || !biometricEnabled}
        >
          <Fingerprint className="w-6 h-6" />
        </Button>
        <Button
          variant="ghost"
          className="h-16 text-2xl font-light rounded-full hover:bg-muted"
          onClick={() => handleNumberPress(0)}
        >
          0
        </Button>
        <Button
          variant="ghost"
          className="h-16 rounded-full hover:bg-muted"
          onClick={handleDelete}
          disabled={passcode.length === 0}
        >
          <Delete className="w-6 h-6" />
        </Button>
      </div>

      {/* 生物识别提示（设置模式） */}
      {mode === 'unlock' && BiometricAvailable && !biometricEnabled && (
        <Button
          variant="link"
          className="mt-8 text-primary"
          onClick={handleBiometric}
        >
          使用生物识别解锁
        </Button>
      )}
    </div>
  );
}
