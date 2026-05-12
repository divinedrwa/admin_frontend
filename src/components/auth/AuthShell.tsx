import Image from "next/image";
import type { ReactNode } from "react";

type AuthShellFeature = {
  icon: ReactNode;
  title: string;
  description: string;
};

type AuthShellProps = {
  variant?: "society" | "super";
  panelEyebrow: string;
  panelTitle: string;
  panelDescription: string;
  panelIcon: ReactNode;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  heroFeatures: AuthShellFeature[];
  children: ReactNode;
};

export function AuthShell({
  variant = "society",
  panelEyebrow,
  panelTitle,
  panelDescription,
  panelIcon,
  heroEyebrow,
  heroTitle,
  heroDescription,
  heroFeatures,
  children,
}: AuthShellProps) {
  return (
    <main className={`auth-page ${variant === "super" ? "auth-page-super" : ""}`}>
      <div className="auth-shell">
        <section className="auth-hero" aria-hidden="true">
          <div className="auth-hero-card">
            <div className="auth-brand-lockup">
              <div className="auth-brand-mark">
                <Image src="/favicon-192.png" alt="" width={44} height={44} />
              </div>
              <div>
                <p className="auth-brand-overline">GatePass+ Access</p>
                <p className="auth-brand-name">Secure admin workspace</p>
              </div>
            </div>

            <span className="auth-hero-eyebrow">{heroEyebrow}</span>
            <h1 className="auth-hero-title">{heroTitle}</h1>
            <p className="auth-hero-copy">{heroDescription}</p>

            <div className="auth-feature-list">
              {heroFeatures.map((feature) => (
                <div key={feature.title} className="auth-feature-card">
                  <div className="auth-feature-icon">{feature.icon}</div>
                  <div>
                    <p className="auth-feature-title">{feature.title}</p>
                    <p className="auth-feature-copy">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="auth-panel">
          <div className="auth-panel-header">
            <div className="auth-panel-brand">
              <div className="auth-panel-mark">{panelIcon}</div>
              <div>
                <span className="auth-panel-eyebrow">{panelEyebrow}</span>
                <h1 className="auth-panel-title">{panelTitle}</h1>
                <p className="auth-panel-copy">{panelDescription}</p>
              </div>
            </div>
          </div>

          {children}

          <p className="auth-footer-note">© 2026 GatePass+. All rights reserved.</p>
        </section>
      </div>
    </main>
  );
}
