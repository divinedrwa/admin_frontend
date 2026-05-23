'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { showToast } from '@/components/Toast';
import { AdminPageHeader } from '@/components/AdminPageHeader';
import { parseApiError } from '@/utils/errorHandler';

interface SpecialProject {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  targetAmount: number;
  totalCollected: number;
  totalExpenses: number;
  createdAt: string;
  createdBy?: { id: string; name: string };
  _count?: { contributions: number; expenses: number };
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-approved-bg text-approved-fg',
  COMPLETED: 'bg-info-bg text-info-fg',
  CANCELLED: 'bg-denied-bg text-denied-fg',
};

const TYPE_LABELS: Record<string, string> = {
  REPAIR: 'Repair',
  UPGRADE: 'Upgrade',
  PURCHASE: 'Purchase',
  EVENT: 'Event',
  OTHER: 'Other',
};

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function SpecialProjectsPage() {
  const [projects, setProjects] = useState<SpecialProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);
      params.append('limit', '50');

      const response = await api.get(`/special-projects?${params.toString()}`);
      setProjects(response.data.projects ?? []);
      setTotal(response.data.total ?? 0);
    } catch (error: unknown) {
      showToast(parseApiError(error, 'Failed to fetch projects').message, 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Finance"
        title="Special Projects"
        description="Create and manage one-time society projects with per-villa contribution tracking."
        icon={<Briefcase className="h-6 w-6" />}
        actions={
          <Link
            href="/special-projects/new"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-tertiary" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-surface-border bg-surface py-2.5 pl-10 pr-4 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-surface-border bg-surface px-4 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Project Cards */}
      {loading ? (
        <div className="text-center py-12 text-fg-secondary">Loading...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 text-fg-secondary">
          {searchTerm || statusFilter ? 'No projects match your filters.' : 'No special projects yet. Create your first one!'}
        </div>
      ) : (
        <>
          <p className="text-sm text-fg-secondary">{total} project{total !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((project) => {
              const progress = project.targetAmount > 0
                ? Math.round((project.totalCollected / project.targetAmount) * 100)
                : 0;

              return (
                <Link
                  key={project.id}
                  href={`/special-projects/${project.id}`}
                  className="rounded-xl border border-surface-border bg-surface p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-fg-primary truncate">{project.title}</h3>
                      {project.description && (
                        <p className="mt-1 text-sm text-fg-secondary line-clamp-2">{project.description}</p>
                      )}
                    </div>
                    <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[project.status] ?? 'bg-surface-secondary text-fg-secondary'}`}>
                      {project.status}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs text-fg-tertiary">
                    <span className="px-2 py-0.5 rounded-md bg-surface-secondary">{TYPE_LABELS[project.type] ?? project.type}</span>
                    {project._count && (
                      <span>{project._count.contributions} villas</span>
                    )}
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-fg-secondary">Collected</span>
                      <span className="font-semibold text-fg-primary">{fmtCurrency(project.totalCollected)} / {fmtCurrency(project.targetAmount)}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-surface-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-primary transition-all"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-fg-tertiary">
                      <span>{progress}% collected</span>
                      <span>Spent: {fmtCurrency(project.totalExpenses)}</span>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-fg-tertiary">
                    Created {new Date(project.createdAt).toLocaleDateString('en-IN')}
                    {project.createdBy && ` by ${project.createdBy.name}`}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
