import React from 'react';
import { AppFrameLogo } from '../../../components/common/AppFrameLogo';

interface AuthCardHeaderProps {
  title: string;
  subtitle: string;
}

export const AuthCardHeader: React.FC<AuthCardHeaderProps> = ({
  title,
  subtitle,
}) => {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-space-sm">
        <AppFrameLogo size="xl" showText={false} glow />
      </div>

      <div className="flex items-center gap-1 font-headline-md text-headline-md tracking-tight mb-space-xs">
        <span className="text-neutral-900 dark:text-on-surface font-bold">App</span>
        <span className="text-primary font-bold">Frame</span>
      </div>

      <h1 className="font-title-md text-title-md text-neutral-900 dark:text-[#F8F9FA] font-semibold tracking-normal">
        {title}
      </h1>
      <p className="font-body-sm text-body-sm text-neutral-600 dark:text-[#949DAF] mt-1 max-w-[320px]">
        {subtitle}
      </p>
    </div>
  );
};
