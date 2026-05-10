import { useState, type FormEvent } from "react";
import type { AssignmentDraft } from "../../types/assignment";
import type { Course } from "../../types/course";
import { Button } from "../ui/Button";
import { Input, TextArea } from "../ui/Input";
import { Select } from "../ui/Select";

type ManualAssignmentEntryProps = {
  courses: Course[];
  onCancel: () => void;
  onSubmit: (draft: AssignmentDraft) => void;
};

export function ManualAssignmentEntry({
  courses,
  onCancel,
  onSubmit,
}: ManualAssignmentEntryProps) {
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [dueAt, setDueAt] = useState("2026-05-16T17:00");
  const [notes, setNotes] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      title,
      courseId,
      dueAt,
      source: "manual",
      status: "not_started",
      confidence: "confirmed",
      notes,
      confidenceReason: "Student-created manual task.",
    });
  }

  return (
    <form className="stacked-form" onSubmit={handleSubmit}>
      <Input
        label="Assignment title"
        onChange={(event) => setTitle(event.target.value)}
        required
        value={title}
      />
      <div className="form-grid">
        <Select
          label="Course"
          onChange={(event) => setCourseId(event.target.value)}
          options={courses.map((course) => ({
            label: `${course.code} - ${course.name}`,
            value: course.id,
          }))}
          value={courseId}
        />
        <Input
          label="Due date and time"
          onChange={(event) => setDueAt(event.target.value)}
          required
          type="datetime-local"
          value={dueAt}
        />
      </div>
      <TextArea
        label="Notes"
        onChange={(event) => setNotes(event.target.value)}
        rows={4}
        value={notes}
      />
      <div className="dialog-actions">
        <Button onClick={onCancel} variant="ghost">
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Add Assignment
        </Button>
      </div>
    </form>
  );
}
