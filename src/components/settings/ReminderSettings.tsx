import { useState } from "react";
import { Checkbox } from "../ui/Checkbox";
import { Input } from "../ui/Input";
import { Toggle } from "../ui/Toggle";

export function ReminderSettings() {
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [calendarDigest, setCalendarDigest] = useState(false);

  return (
    <section className="settings-section" aria-labelledby="reminder-settings-heading">
      <h3 id="reminder-settings-heading">Reminder Timing</h3>
      <div className="settings-stack">
        <Toggle
          checked={emailEnabled}
          description="Send deadline reminders to the account email."
          label="Email reminders"
          onChange={setEmailEnabled}
        />
        <Toggle
          checked={pushEnabled}
          description="Show device notifications for urgent assignments."
          label="Push reminders"
          onChange={setPushEnabled}
        />
        <Checkbox
          checked={calendarDigest}
          description="Summarize the next seven days each Sunday evening."
          label="Weekly calendar digest"
          onChange={(event) => setCalendarDigest(event.target.checked)}
        />
        <div className="form-grid">
          <Input defaultValue="24" label="Default first reminder" type="number" />
          <Input defaultValue="2" label="Urgent reminder" type="number" />
        </div>
      </div>
    </section>
  );
}
