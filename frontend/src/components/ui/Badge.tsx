import React from 'react';

interface BadgeProps {
  label: string;
  color?: string;
}

const colorMap: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  open: 'bg-blue-100 text-blue-700',
  draft: 'bg-slate-100 text-slate-600',
  confirmed: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  converted: 'bg-purple-100 text-purple-700',
  qualified: 'bg-cyan-100 text-cyan-700',
  contacted: 'bg-blue-100 text-blue-700',
  lost: 'bg-red-100 text-red-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  sent: 'bg-blue-100 text-blue-700',
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
  critical: 'bg-red-100 text-red-700',
  in_progress: 'bg-blue-100 text-blue-700',
  planning: 'bg-purple-100 text-purple-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-slate-100 text-slate-600',
  passed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  posted: 'bg-green-100 text-green-700',
  released: 'bg-blue-100 text-blue-700',
  todo: 'bg-slate-100 text-slate-600',
  done: 'bg-green-100 text-green-700',
};

const Badge: React.FC<BadgeProps> = ({ label, color }) => {
  const cls = color || colorMap[label?.toLowerCase()] || 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${cls}`}>
      {label}
    </span>
  );
};

export default Badge;
