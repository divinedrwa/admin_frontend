'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Briefcase, Search, CheckSquare, XSquare } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { showToast } from '@/components/Toast';
import { AdminPageHeader } from '@/components/AdminPageHeader';
import { parseApiError } from '@/utils/errorHandler';

interface Villa {
  id: string;
  villaNumber: string;
  ownerName: string;
  monthlyMaintenance: number;
}

type SelectionMode = 'all' | 'include' | 'exclude';

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function CreateSpecialProjectPage() {
  const router = useRouter();
  const [villas, setVillas] = useState<Villa[]>([]);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('OTHER');
  const [defaultAmount, setDefaultAmount] = useState(0);
  const [dueDate, setDueDate] = useState('');

  // Villa selection
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('all');
  const [selectedVillaIds, setSelectedVillaIds] = useState<Set<string>>(new Set());
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});
  const [villaSearch, setVillaSearch] = useState('');

  const fetchVillas = useCallback(async () => {
    try {
      const res = await api.get('/villas');
      const list = res.data.villas ?? res.data ?? [];
      setVillas(list);
    } catch (error: unknown) {
      showToast(parseApiError(error, 'Failed to fetch villas').message, 'error');
    }
  }, []);

  useEffect(() => {
    fetchVillas();
  }, [fetchVillas]);

  const filteredVillas = useMemo(() => {
    if (!villaSearch.trim()) return villas;
    const q = villaSearch.toLowerCase();
    return villas.filter(
      (v) => v.villaNumber.toLowerCase().includes(q) || v.ownerName.toLowerCase().includes(q)
    );
  }, [villas, villaSearch]);

  const getSelectedVillas = useCallback((): Villa[] => {
    if (selectionMode === 'all') return villas;
    if (selectionMode === 'include') return villas.filter((v) => selectedVillaIds.has(v.id));
    return villas.filter((v) => !selectedVillaIds.has(v.id)); // exclude
  }, [villas, selectionMode, selectedVillaIds]);

  const toggleVilla = (id: string) => {
    setSelectedVillaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedVillaIds(new Set(villas.map((v) => v.id)));
  };

  const selectNone = () => {
    setSelectedVillaIds(new Set());
  };

  const selectedVillas = getSelectedVillas();
  const totalTarget = selectedVillas.reduce((sum, v) => sum + (customAmounts[v.id] ?? defaultAmount), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedVillas.length === 0) {
      showToast('Select at least one villa', 'error');
      return;
    }
    if (defaultAmount <= 0 && !Object.values(customAmounts).some((a) => a > 0)) {
      showToast('Set a contribution amount', 'error');
      return;
    }

    setLoading(true);
    try {
      const contributions = selectedVillas.map((v) => ({
        villaId: v.id,
        amount: customAmounts[v.id] ?? defaultAmount,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      }));

      await api.post('/special-projects', {
        title,
        description: description || undefined,
        type,
        targetAmount: totalTarget,
        contributions,
      });

      showToast('Project created', 'success');
      router.push('/special-projects');
    } catch (error: unknown) {
      showToast(parseApiError(error, 'Failed to create project').message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectorHelp =
    selectionMode === 'include'
      ? 'Check the villas you want to include in this project.'
      : 'Check the villas you want to exclude from this project.';

  return (
    <div className="space-y-6">
      <Link href="/special-projects" className="inline-flex items-center gap-1 text-sm text-fg-secondary hover:text-fg-primary">
        <ArrowLeft className="h-4 w-4" /> Back to projects
      </Link>

      <AdminPageHeader
        title="Create Special Project"
        description="Set up a new project with per-villa contribution amounts."
        icon={<Briefcase className="h-6 w-6" />}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Details */}
        <div className="rounded-xl border border-surface-border bg-surface p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-fg-primary">Project Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                placeholder="e.g. Sewage Cleaning"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              >
                {[['REPAIR', 'Repair'], ['UPGRADE', 'Upgrade'], ['PURCHASE', 'Purchase'], ['EVENT', 'Event'], ['OTHER', 'Other']].map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="Optional project description"
            />
          </div>
        </div>

        {/* Contribution Setup */}
        <div className="rounded-xl border border-surface-border bg-surface p-6 shadow-sm space-y-5">
          <h2 className="text-base font-semibold text-fg-primary">Contributions</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">Default Amount per Villa *</label>
              <input
                type="number"
                min={0}
                value={defaultAmount || ''}
                onChange={(e) => setDefaultAmount(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                placeholder="e.g. 5000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">Due Date (optional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">Villa Selection</label>
              <select
                value={selectionMode}
                onChange={(e) => { setSelectionMode(e.target.value as SelectionMode); setSelectedVillaIds(new Set()); }}
                className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              >
                <option value="all">All Villas</option>
                <option value="include">Include Specific Villas</option>
                <option value="exclude">Exclude Specific Villas</option>
              </select>
            </div>
          </div>

          {/* Villa selector for include/exclude modes */}
          {selectionMode !== 'all' && (
            <div className="rounded-xl border border-surface-border overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between bg-surface-secondary px-4 py-3 border-b border-surface-border">
                <div className="flex items-center gap-2">
                  {selectionMode === 'include' ? (
                    <CheckSquare className="h-4 w-4 text-approved-fg" />
                  ) : (
                    <XSquare className="h-4 w-4 text-denied-fg" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-fg-primary">
                      {selectionMode === 'include' ? 'Select Villas to Include' : 'Select Villas to Exclude'}
                    </p>
                    <p className="text-xs text-fg-tertiary">{selectorHelp}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={selectAll} className="text-xs font-medium text-brand-primary hover:underline">
                    All
                  </button>
                  <span className="text-fg-tertiary">|</span>
                  <button type="button" onClick={selectNone} className="text-xs font-medium text-brand-primary hover:underline">
                    None
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="px-4 py-2 border-b border-surface-border">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-tertiary" />
                  <input
                    type="text"
                    placeholder="Search villas..."
                    value={villaSearch}
                    onChange={(e) => setVillaSearch(e.target.value)}
                    className="w-full rounded-lg border border-surface-border bg-surface py-1.5 pl-8 pr-3 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              </div>

              {/* Checkbox list */}
              <div className="max-h-60 overflow-y-auto divide-y divide-surface-border">
                {filteredVillas.map((villa) => {
                  const isChecked = selectedVillaIds.has(villa.id);
                  return (
                    <label
                      key={villa.id}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                        isChecked
                          ? selectionMode === 'exclude'
                            ? 'bg-denied-bg/30'
                            : 'bg-approved-bg/30'
                          : 'hover:bg-surface-secondary'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleVilla(villa.id)}
                        className="rounded border-surface-border text-brand-primary focus:ring-brand-primary"
                      />
                      <span className="text-sm font-medium text-fg-primary w-12">{villa.villaNumber}</span>
                      <span className="text-sm text-fg-secondary flex-1">{villa.ownerName}</span>
                      {isChecked && selectionMode === 'exclude' && (
                        <span className="text-xs font-medium text-denied-fg px-1.5 py-0.5 rounded bg-denied-bg">Excluded</span>
                      )}
                    </label>
                  );
                })}
                {filteredVillas.length === 0 && (
                  <p className="px-4 py-4 text-sm text-fg-tertiary text-center">No villas match your search.</p>
                )}
              </div>

              {/* Footer summary */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-surface-secondary border-t border-surface-border text-xs text-fg-secondary">
                <span>{selectedVillaIds.size} villa{selectedVillaIds.size !== 1 ? 's' : ''} {selectionMode === 'exclude' ? 'excluded' : 'selected'}</span>
                <span className="font-medium text-fg-primary">{selectedVillas.length} villa{selectedVillas.length !== 1 ? 's' : ''} will be in the project</span>
              </div>
            </div>
          )}

          {/* Summary — selected villas with custom amounts */}
          {selectedVillas.length > 0 && (
            <div className="rounded-xl border border-surface-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-surface-secondary border-b border-surface-border">
                <p className="text-sm font-medium text-fg-primary">
                  {selectedVillas.length} villa{selectedVillas.length !== 1 ? 's' : ''} &mdash; contribution amounts
                </p>
                <p className="text-sm font-semibold text-brand-primary">
                  Total: {fmtCurrency(totalTarget)}
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-surface-border">
                {selectedVillas.map((villa) => (
                  <div key={villa.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-sm font-medium text-fg-primary w-12">{villa.villaNumber}</span>
                    <span className="text-sm text-fg-secondary flex-1 truncate">{villa.ownerName}</span>
                    <div className="relative w-32">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-fg-tertiary">&#8377;</span>
                      <input
                        type="number"
                        min={0}
                        value={(customAmounts[villa.id] ?? defaultAmount) || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setCustomAmounts((prev) => ({ ...prev, [villa.id]: val }));
                        }}
                        className="w-full rounded-lg border border-surface-border bg-surface pl-6 pr-2 py-1.5 text-sm text-right focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        placeholder={String(defaultAmount)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link
            href="/special-projects"
            className="rounded-xl border border-surface-border px-5 py-2.5 text-sm font-medium hover:bg-surface-secondary transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || !title || selectedVillas.length === 0 || totalTarget <= 0}
            className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
}
