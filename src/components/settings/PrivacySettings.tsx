import { useState } from "react";
import { Button } from "../ui/Button";
import { Checkbox } from "../ui/Checkbox";
import { Toggle } from "../ui/Toggle";

export function PrivacySettings() {
  const [browserHelper, setBrowserHelper] = useState(false);
  const [storeSnippets, setStoreSnippets] = useState(true);
  const [sourceSync, setSourceSync] = useState(true);

  return (
    <section className="settings-section" aria-labelledby="privacy-settings-heading">
      <h3 id="privacy-settings-heading">Privacy Controls</h3>
      <div className="settings-stack">
        <Toggle
          checked={browserHelper}
          description="Allow the optional helper to scan assignment pages only when started."
          label="Browser helper permission"
          onChange={setBrowserHelper}
        />
        <Toggle
          checked={sourceSync}
          description="Keep official Canvas and Brightspace imports refreshed."
          label="Scheduled source sync"
          onChange={setSourceSync}
        />
        <Checkbox
          checked={storeSnippets}
          description="Keep original syllabus snippets so review decisions remain explainable."
          label="Store source snippets"
          onChange={(event) => setStoreSnippets(event.target.checked)}
        />
        <div className="danger-zone">
          <div>
            <strong>Account deletion</strong>
            <p>Remove assignments, course metadata, syllabus snippets, and sync tokens.</p>
          </div>
          <Button variant="danger">Delete Account</Button>
        </div>
      </div>
    </section>
  );
}
