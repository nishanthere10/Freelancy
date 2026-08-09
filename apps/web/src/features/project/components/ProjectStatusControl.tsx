'use client';

import { useState } from 'react';
import type { ProjectStatus } from '../api';
import { useUpdateProjectStatus } from '../hooks';

interface ProjectStatusControlProps {
  workspaceId: string;
  projectId: string;
  currentStatus: ProjectStatus;
  onStatusChange?: (status: ProjectStatus) => void;
}

export function ProjectStatusControl({
  workspaceId,
  projectId,
  currentStatus,
  onStatusChange,
}: ProjectStatusControlProps) {
  const [open, setOpen] = useState(false);
  const { mutate: updateStatus, isPending } = useUpdateProjectStatus(workspaceId, projectId);

  const statusStyles: Record<ProjectStatus, string> = {
    draft: 'bg-amber-50 text-amber-700 border-amber-200',
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    completed: 'bg-blue-50 text-blue-700 border-blue-200',
    archived: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const handleSelect = (status: ProjectStatus) => {
    setOpen(false);
    if (status === currentStatus) return;
    updateStatus(status, {
      onSuccess: () => onStatusChange?.(status),
    });
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        disabled={isPending}
        className={`px-2.5 py-1 text-xs font-semibold rounded-full border capitalize transition-all flex items-center gap-1 ${
          statusStyles[currentStatus] || statusStyles.draft
        }`}
      >
        <span>{currentStatus}</span>
        <span className="text-[10px]">▼</span>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 w-36 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-20 py-1"
          onClick={(e) => e.stopPropagation()}
        >
          {(['draft', 'active', 'completed', 'archived'] as const).map((st) => (
            <button
              key={st}
              onClick={() => handleSelect(st)}
              className={`w-full text-left px-3 py-1.5 text-xs capitalize hover:bg-gray-100 flex items-center justify-between ${
                st === currentStatus ? 'font-bold text-black' : 'text-gray-700'
              }`}
            >
              <span>{st}</span>
              {st === currentStatus && <span>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
