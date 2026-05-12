import type { ReactNode } from "react";

type AdminPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  icon?: ReactNode;
  actions?: ReactNode;
};

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  icon,
  actions,
}: AdminPageHeaderProps) {
  return (
    <div className="rounded-[28px] border border-surface-border bg-surface px-6 py-6 shadow-sm sm:px-8 sm:py-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          {icon ? (
            <div className="hidden rounded-2xl bg-brand-primary-light p-3 text-brand-primary sm:flex">
              {icon}
            </div>
          ) : null}
          <div>
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-tertiary">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-fg-primary sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-fg-secondary sm:text-base">
              {description}
            </p>
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
