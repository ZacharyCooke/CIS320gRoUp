import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { Footer } from "./Footer";

export function AuthLayout({ children, contentStyle }: { children: ReactNode; contentStyle?: CSSProperties }) {
  return (
    <div className="form-page-wrapper">
      <Link to="/" className="brand-logo" aria-label="PetRecovery home">
        <span className="brand-mark">PR</span>
        <span>PetRecovery</span>
      </Link>
      <section className="form-page" style={contentStyle}>
        {children}
      </section>
      <Footer />
    </div>
  );
}
