import React from 'react';
import { Card } from '../../../components/ui/Card';
import { AppFrameLogo } from '../../../components/common/AppFrameLogo';
import { AuthCallbackProgress } from './AuthCallbackProgress';
import { AuthCallbackError } from './AuthCallbackError';

export interface AuthCallbackCardProps {
  statusText: string;
  progress: number;
  error: string | null;
  onBackToLogin: () => void;
}

export const AuthCallbackCard: React.FC<AuthCallbackCardProps> = ({
  statusText,
  progress,
  error,
  onBackToLogin,
}) => {
  return (
    <Card
      variant="elevated"
      className="w-full max-w-md p-8 text-center flex flex-col items-center relative z-10 border border-primary/20 shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
    >
      <div className="mb-6">
        <AppFrameLogo size="lg" glow />
      </div>

      {error ? (
        <AuthCallbackError error={error} onBackToLogin={onBackToLogin} />
      ) : (
        <AuthCallbackProgress statusText={statusText} progress={progress} />
      )}
    </Card>
  );
};
