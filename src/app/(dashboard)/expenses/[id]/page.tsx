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
      <div className="flex items-center justify-center min-h-[40vh] text-gray-600">
        Loading expense…
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <Link href="/expenses" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeft size={18} /> Back to expenses
        </Link>
        <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{error ?? "Not found"}</h1>
          <p className="text-gray-600 text-sm">Check the URL or return to the expense list.</p>
        </div>
      </div>
    );
  }

  const cat = expense.category as { name?: string; icon?: string; color?: string } | undefined;
  const paymentDate = expense.paymentDate as string;
  const tags = (expense.tags as string[]) || [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <Link href="/expenses" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3">
            <ArrowLeft size={20} />
            Back to expenses
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{(expense.title as string) || "Expense"}</h1>
          <p className="text-gray-600 mt-1 flex items-center gap-2 flex-wrap">
            <Calendar size={16} className="inline shrink-0" />
            {paymentDate ? new Date(paymentDate).toLocaleDateString() : "—"}
            {typeof expense.month === "number" && typeof expense.year === "number" && (
              <span className="text-gray-500">
                · {MONTHS[(expense.month as number) - 1]} {expense.year as number}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/expenses/edit/${id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium"
          >
            <Edit size={18} />
            Edit
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-sm font-medium"
          >
            <Trash2 size={18} />
            Delete
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Summary</h2>
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
            <span className="text-2xl font-bold text-gray-900">
              ₹{Number(expense.amount).toLocaleString()}
            </span>
            {typeof expense.netAmount === "number" && expense.netAmount !== expense.amount && (
              <span className="text-sm text-gray-600">
                Net: ₹{Number(expense.netAmount).toLocaleString()}
              </span>
            )}
          </div>
          {(expense.description as string) && (
            <p className="text-gray-700 whitespace-pre-wrap">{expense.description as string}</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Payment</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Paid to</dt>
              <dd className="font-medium text-gray-900">{(expense.paidTo as string) || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Mode</dt>
              <dd className="font-medium text-gray-900">{(expense.paymentMode as string) || "—"}</dd>
            </div>
            {(expense.paymentRef as string) && (
              <div>
                <dt className="text-gray-500">Reference</dt>
                <dd className="font-medium text-gray-900">{expense.paymentRef as string}</dd>
              </div>
            )}
            {(expense.paidToContact as string) && (
              <div>
                <dt className="text-gray-500">Contact</dt>
                <dd className="font-medium text-gray-900">{expense.paidToContact as string}</dd>
              </div>
            )}
            {(expense.receiptNumber as string) && (
              <div>
                <dt className="text-gray-500">Receipt #</dt>
                <dd className="font-medium text-gray-900">{expense.receiptNumber as string}</dd>
              </div>
            )}
            {(expense.invoiceNumber as string) && (
              <div>
                <dt className="text-gray-500">Invoice #</dt>
                <dd className="font-medium text-gray-900">{expense.invoiceNumber as string}</dd>
              </div>
            )}
          </dl>
        </div>

        {(Number(expense.gstAmount) > 0 || Number(expense.tdsAmount) > 0) && (
          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Tax</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">GST</dt>
                <dd className="font-medium">
                  ₹{Number(expense.gstAmount || 0).toLocaleString()}
                  {typeof expense.gstPercentage === "number" && expense.gstPercentage > 0 && (
                    <span className="text-gray-500"> ({Number(expense.gstPercentage)}%)</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">TDS</dt>
                <dd className="font-medium">
                  ₹{Number(expense.tdsAmount || 0).toLocaleString()}
                  {typeof expense.tdsPercentage === "number" && expense.tdsPercentage > 0 && (
                    <span className="text-gray-500"> ({Number(expense.tdsPercentage)}%)</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {(expense.notes as string) && (
          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Notes</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{expense.notes as string}</p>
          </div>
        )}

        {tags.length > 0 && (
          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <span key={t} className="px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(expense.attachments) && (expense.attachments as { id: string; fileName: string }[]).length > 0 && (
          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Attachments</h2>
            <ul className="text-sm text-blue-700 space-y-1">
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
        )}
      </div>
    </div>
  );
}
