import { ShieldCheck } from "lucide-react";
import type { SourceConnection } from "../../types/source";
import { SourceConnectionCard } from "./SourceConnectionCard";

type SourcesPageProps = {
  sources: SourceConnection[];
  onSync: (sourceId: string) => void;
  onToggle: (sourceId: string) => void;
};

export function SourcesPage({ sources, onSync, onToggle }: SourcesPageProps) {
  return (
    <section className="sources-page" aria-labelledby="sources-heading">
      <div className="page-section-heading">
        <div>
          <p className="eyebrow">Sources</p>
          <h2 id="sources-heading">Connected and available import paths</h2>
          <p>
            Official APIs are preferred. Fallback imports are marked probable or
            needs review until the student confirms them.
          </p>
        </div>
      </div>

      <div className="source-grid">
        {sources.map((source) => (
          <SourceConnectionCard
            key={source.id}
            onSync={onSync}
            onToggle={onToggle}
            source={source}
          />
        ))}
      </div>

      <section className="browser-helper-note" aria-labelledby="browser-helper-heading">
        <ShieldCheck aria-hidden="true" size={22} />
        <div>
          <h3 id="browser-helper-heading">Browser helper privacy rules</h3>
          <p>
            The helper is opt-in and runs inside the student browser session. It
            never stores school passwords, MFA codes, cookies, password fields, or
            unrelated browsing history. It imports only task-like data, and every
            browser-helper result enters the app as Probable or Needs Review.
          </p>
        </div>
      </section>
    </section>
  );
}
