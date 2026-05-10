import { CalendarDays, Mail, RotateCw } from "lucide-react";
import { Card } from "../ui/Card";
import { Select } from "../ui/Select";
import { ReminderSettings } from "./ReminderSettings";
import { PrivacySettings } from "./PrivacySettings";

export function SettingsPage() {
  return (
    <section className="settings-page" aria-labelledby="settings-heading">
      <div className="page-section-heading">
        <div>
          <p className="eyebrow">Settings</p>
          <h2 id="settings-heading">Preferences and controls</h2>
          <p>Adjust reminders, source sync behavior, calendar defaults, and privacy.</p>
        </div>
      </div>

      <div className="settings-layout">
        <div className="settings-layout__main">
          <ReminderSettings />
          <PrivacySettings />
        </div>
        <aside className="settings-layout__aside" aria-label="Additional preferences">
          <Card className="settings-card">
            <Mail aria-hidden="true" size={20} />
            <div>
              <h3>Email Preferences</h3>
              <Select
                label="Email summary"
                options={[
                  { label: "Daily", value: "daily" },
                  { label: "Weekly", value: "weekly" },
                  { label: "Only urgent", value: "urgent" },
                ]}
                defaultValue="daily"
              />
            </div>
          </Card>
          <Card className="settings-card">
            <CalendarDays aria-hidden="true" size={20} />
            <div>
              <h3>Calendar Preferences</h3>
              <Select
                label="Default calendar view"
                options={[
                  { label: "Month", value: "month" },
                  { label: "Week", value: "week" },
                ]}
                defaultValue="month"
              />
            </div>
          </Card>
          <Card className="settings-card">
            <RotateCw aria-hidden="true" size={20} />
            <div>
              <h3>Source Sync Preferences</h3>
              <Select
                label="Official source sync"
                options={[
                  { label: "Every hour", value: "hourly" },
                  { label: "Twice daily", value: "twice-daily" },
                  { label: "Manual only", value: "manual" },
                ]}
                defaultValue="hourly"
              />
            </div>
          </Card>
        </aside>
      </div>
    </section>
  );
}
