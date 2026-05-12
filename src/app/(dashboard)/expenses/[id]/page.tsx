"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Edit, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [expense, setExpense] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/expenses/${id}`);
        if (!res?.data) {
          setExpense(null);
          setError("Could not load this expense.");
          return;
        }
        const data = res.data;
        if (!cancelled) setExpense(data);
      } catch (err: any) {
        if (!cancelled) {
          setExpense(null);
          setError(err?.response?.status === 404 ? "Expense not found." : "Could not load this expense.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDelete() {
    if (!id || !confirm("Delete this expense permanently?")) return;
    try {
      await api.delete(`/expenses/${id}`);
      showToast("Expense deleted", "success");
      router.push("/expenses");
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to delete expense", "error");
    }
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner w-10 h-10"></div>
        <p className="loading-state-text">Loading expense...</p>
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <Link href="/expenses" className="inline-flex items-center gap-2 text-brand-primary hover:text-info-fg mb-4">
          <ArrowLeft size={18} /> Back to expenses
        </Link>
        <div className="card">
          <div className="card-body">
            <h1 className="text-xl font-semibold text-fg-primary mb-2">{error ?? "Not found"}</h1>
            <p className="text-fg-secondary text-sm">Check the URL or return to the expense list.</p>
          </div>
        </div>
      </div>
    );
  }

  const cat = expense.category as { name?: string; icon?: string; color?: string } | undefined;
  const paymentDate = expense.paymentDate as string;
  const tags = (expense.tags as string[]) || [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="page-action-bar mb-6">
        <div>
          <Link href="/expenses" className="inline-flex items-center gap-2 text-fg-secondary hover:text-fg-primary mb-3">
            <ArrowLeft size={20} />
            Back to expenses
          </Link>
          <h1 className="text-3xl font-bold text-fg-primary">{(expense.title as string) || "Expense"}</h1>
          <p className="text-fg-secondary mt-1 flex items-center gap-2 flex-wrap">
            <Calendar size={16} className="inline shrink-0" />
            {paymentDate ? new Date(paymentDate).toLocaleDateString() : "—"}
            {typeof expense.month === "number" && typeof expense.year === "number" && (
              <span className="text-fg-secondary">
                · {MONTHS[(expense.month as number) - 1]} {expense.year as number}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/expenses/edit/${id}`}
            className="btn btn-primary inline-flex items-center gap-2 text-sm font-medium"
          >
            <Edit size={18} />
            Edit
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            className="btn btn-danger inline-flex items-center gap-2 text-sm font-medium"
          >
            <Trash2 size={18} />
            Delete
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="card">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-fg-secondary uppercase tracking-wide">Summary</h2>
          </div>
          <div className="card-body">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: cat?.color ? `${cat.color}20` : "#eff6ff",
                  color: "#111827",
                }}
              >
                <span>{cat?.icon || "📋"}</span>
                {cat?.name || "Category"}
              </span>
              <span className="text-2xl font-bold text-fg-primary">
                ₹{Number(expense.amount).toLocaleString()}
              </span>
              {typeof expense.netAmount === "number" && expense.netAmount !== expense.amount && (
                <span className="text-sm text-fg-secondary">
                  Net: ₹{Number(expense.netAmount).toLocaleString()}
                </span>
              )}
            </div>
            {(expense.description as string) && (
              <p className="text-fg-primary whitespace-pre-wrap">{expense.description as string}</p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-fg-secondary uppercase tracking-wide">Payment</h2>
          </div>
          <div className="card-body">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <dt className="text-fg-secondary">Paid to</dt>
                <dd className="font-medium text-fg-primary">{(expense.paidTo as string) || "—"}</dd>
              </div>
              <div>
                <dt className="text-fg-secondary">Mode</dt>
                <dd className="font-medium text-fg-primary">{(expense.paymentMode as string) || "—"}</dd>
              </div>
              {(expense.paymentRef as string) && (
                <div>
                  <dt className="text-fg-secondary">Reference</dt>
                  <dd className="font-medium text-fg-primary">{expense.paymentRef as string}</dd>
                </div>
              )}
              {(expense.paidToContact as string) && (
                <div>
                  <dt className="text-fg-secondary">Contact</dt>
                  <dd className="font-medium text-fg-primary">{expense.paidToContact as string}</dd>
                </div>
              )}
              {(expense.receiptNumber as string) && (
                <div>
                  <dt className="text-fg-secondary">Receipt #</dt>
                  <dd className="font-medium text-fg-primary">{expense.receiptNumber as string}</dd>
                </div>
              )}
              {(expense.invoiceNumber as string) && (
                <div>
                  <dt className="text-fg-secondary">Invoice #</dt>
                  <dd className="font-medium text-fg-primary">{expense.invoiceNumber as string}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {(Number(expense.gstAmount) > 0 || Number(expense.tdsAmount) > 0) && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-fg-secondary uppercase tracking-wide">Tax</h2>
            </div>
            <div className="card-body">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-fg-secondary">GST</dt>
                  <dd className="font-medium">
                    ₹{Number(expense.gstAmount || 0).toLocaleString()}
                    {typeof expense.gstPercentage === "number" && expense.gstPercentage > 0 && (
                      <span className="text-fg-secondary"> ({Number(expense.gstPercentage)}%)</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-fg-secondary">TDS</dt>
                  <dd className="font-medium">
                    ₹{Number(expense.tdsAmount || 0).toLocaleString()}
                    {typeof expense.tdsPercentage === "number" && expense.tdsPercentage > 0 && (
                      <span className="text-fg-secondary"> ({Number(expense.tdsPercentage)}%)</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {(expense.notes as string) && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-fg-secondary uppercase tracking-wide">Notes</h2>
            </div>
            <div className="card-body">
              <p className="text-fg-primary whitespace-pre-wrap">{expense.notes as string}</p>
            </div>
          </div>
        )}

        {tags.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-fg-secondary uppercase tracking-wide">Tags</h2>
            </div>
            <div className="card-body">
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <span key={t} className="badge badge-gray">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {Array.isArray(expense.attachments) && (expense.attachments as { id: string; fileName: string }[]).length > 0 && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-fg-secondary uppercase tracking-wide">Attachments</h2>
            </div>
            <div className="card-body">
              <ul className="text-sm text-brand-primary space-y-1">
                {(expense.attachments as { id: string; fileName: string; fileUrl?: string }[]).map((a) => (
                  <li key={a.id}>
                    {a.fileUrl ? (
                      <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {a.fileName}
                      </a>
                    ) : (
                      a.fileName
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
