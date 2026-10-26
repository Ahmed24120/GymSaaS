'use client';

import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6" dir="rtl">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs sm:text-sm text-gray-400 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2.5 shrink-0">{action}</div>}
    </div>
  );
}
export default PageHeader;
