import { FileImage, FileText, Upload } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { AssignmentDraft } from "../../types/assignment";
import type { Course } from "../../types/course";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input, TextArea } from "../ui/Input";
import { Select } from "../ui/Select";
import { Tabs } from "../ui/Tabs";

type UploadMode = "pdf" | "docx" | "image" | "paste";

type SyllabusUploadFlowProps = {
  courses: Course[];
  onCancel: () => void;
  onSubmit: (draft: AssignmentDraft) => void;
};

export function SyllabusUploadFlow({
  courses,
  onCancel,
  onSubmit,
}: SyllabusUploadFlowProps) {
  const [mode, setMode] = useState<UploadMode>("paste");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [title, setTitle] = useState("Extracted syllabus assignment");
  const [dueAt, setDueAt] = useState("2026-05-17T23:59");
  const [snippet, setSnippet] = useState(
    "Week 15: Final response portfolio due Sunday by midnight.",
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      title,
      courseId,
      dueAt,
      source: "syllabus",
      confidence: "needs_review",
      status: "not_started",
      syllabusTextMatch: snippet,
      confidenceReason:
        "Syllabus text was parsed from an uploaded source and needs student confirmation.",
      notes: `Imported through ${mode.toUpperCase()} syllabus review flow.`,
    });
  }

  return (
    <form className="stacked-form" onSubmit={handleSubmit}>
      <Tabs
        activeId={mode}
        items={[
          { id: "paste", label: "Paste Text", icon: <FileText size={15} /> },
          { id: "pdf", label: "PDF", icon: <Upload size={15} /> },
          { id: "docx", label: "DOCX", icon: <FileText size={15} /> },
          { id: "image", label: "Image", icon: <FileImage size={15} /> },
        ]}
        label="Syllabus import method"
        onChange={setMode}
      />

      <div className="upload-placeholder">
        <Badge tone="review">Review Required</Badge>
        <p>
          Prototype parsing is mocked. The extracted task below is normalized,
          deduplicated, and sent to the review queue before appearing as trusted work.
        </p>
      </div>

      <div className="form-grid">
        <Select
          label="Detected course"
          onChange={(event) => setCourseId(event.target.value)}
          options={courses.map((course) => ({
            label: `${course.code} - ${course.name}`,
            value: course.id,
          }))}
          value={courseId}
        />
        <Input
          label="Extracted due date"
          onChange={(event) => setDueAt(event.target.value)}
          required
          type="datetime-local"
          value={dueAt}
        />
      </div>

      <Input
        label="Extracted title"
        onChange={(event) => setTitle(event.target.value)}
        required
        value={title}
      />
      <TextArea
        helperText="Keep original text so the review queue can explain why the task exists."
        label="Original text snippet"
        onChange={(event) => setSnippet(event.target.value)}
        rows={4}
        value={snippet}
      />

      <div className="dialog-actions">
        <Button onClick={onCancel} variant="ghost">
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Send to Review
        </Button>
      </div>
    </form>
  );
}
