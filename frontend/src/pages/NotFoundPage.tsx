import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <main id="main-content" className="console" tabIndex={-1}>
      <section className="panel">
        <div className="section-head">
          <h1>404 / System Error</h1>
          <span className="mono">Page not found</span>
        </div>
        <p className="mono" role="alert">
          The requested route does not exist in this console. The page may have been moved or deleted.
        </p>
        <div className="hero-actions" style={{ marginTop: 24 }}>
          <Link to="/" className="btn">
            <span aria-hidden="true">&larr;</span> Return Home
          </Link>
          <Link to="/projects" className="btn">
            <span aria-hidden="true">&larr;</span> All Repositories
          </Link>
        </div>
      </section>
    </main>
  );
}
