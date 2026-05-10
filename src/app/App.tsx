import { useEffect, useMemo, useState } from "react";
import { AssignmentDetail } from "../components/assignments/AssignmentDetail";
import { CalendarView } from "../components/calendar/CalendarView";
import { CourseList } from "../components/courses/CourseList";
import { CoursePage } from "../components/courses/CoursePage";
import { Dashboard } from "../components/dashboard/Dashboard";
import { AppShell } from "../components/layout/AppShell";
import { ManualAssignmentEntry } from "../components/manual/ManualAssignmentEntry";
import { ReviewQueue } from "../components/review/ReviewQueue";
import { SettingsPage } from "../components/settings/SettingsPage";
import { SourcesPage } from "../components/sources/SourcesPage";
import { SyllabusUploadFlow } from "../components/syllabus/SyllabusUploadFlow";
import { Dialog } from "../components/ui/Dialog";
import { Toast } from "../components/ui/Toast";
import { mockAssignments } from "../data/mockAssignments";
import { mockCourses } from "../data/mockCourses";
import { mockSources } from "../data/mockSources";
import type { AppView } from "./routes";
import type { Assignment, AssignmentDraft } from "../types/assignment";
import type { SourceConnection } from "../types/source";
import { findDuplicateSuggestions } from "../utils/dedupeTasks";
import { normalizeTask } from "../utils/normalizeTask";

const viewCopy: Record<AppView, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Academic Command Center",
    subtitle: "One reliable dashboard for deadlines, sources, review, and reminders.",
  },
  courses: {
    title: "Courses",
    subtitle: "Manage class-level workload, syllabus files, and source health.",
  },
  calendar: {
    title: "Calendar",
    subtitle: "Scan due-date density by week or month with course-color markers.",
  },
  review: {
    title: "Review Queue",
    subtitle: "Confirm uncertain imports before they become trusted assignments.",
  },
  sources: {
    title: "Sources",
    subtitle: "Connect official APIs first and keep fallback imports explainable.",
  },
  settings: {
    title: "Settings",
    subtitle: "Control reminders, sync behavior, privacy, and calendar defaults.",
  },
};

function getReviewCount(assignments: Assignment[]) {
  return assignments.filter(
    (assignment) =>
      assignment.confidence === "needs_review" ||
      (assignment.confidence === "probable" &&
        (assignment.source === "syllabus" || assignment.source === "browser_helper")),
  ).length;
}

export function App() {
  const [activeView, setActiveView] = useState<AppView>("dashboard");
  const [assignments, setAssignments] = useState<Assignment[]>(mockAssignments);
  const [sources, setSources] = useState<SourceConnection[]>(mockSources);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [syllabusDialogOpen, setSyllabusDialogOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const duplicateSuggestions = useMemo(
    () => findDuplicateSuggestions(assignments),
    [assignments],
  );
  const selectedAssignment = assignments.find(
    (assignment) => assignment.id === selectedAssignmentId,
  );
  const selectedCourse = mockCourses.find((course) => course.id === selectedCourseId);
  const reviewCount = getReviewCount(assignments);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  function handleNavigate(view: AppView) {
    setActiveView(view);
    if (view !== "courses") {
      setSelectedCourseId(null);
    }
  }

  function handleComplete(assignmentId: string) {
    setAssignments((current) =>
      current.map((assignment) =>
        assignment.id === assignmentId
          ? {
              ...assignment,
              status:
                assignment.status === "completed" ? "not_started" : "completed",
              updatedAt: new Date().toISOString(),
            }
          : assignment,
      ),
    );
    setToast("Assignment status updated");
  }

  function handleUpdateAssignment(nextAssignment: Assignment) {
    setAssignments((current) =>
      current.map((assignment) =>
        assignment.id === nextAssignment.id ? nextAssignment : assignment,
      ),
    );
    setSelectedAssignmentId(null);
    setToast("Assignment details saved");
  }

  function handleApproveReview(assignmentId: string) {
    setAssignments((current) =>
      current.map((assignment) =>
        assignment.id === assignmentId
          ? {
              ...assignment,
              confidence: "confirmed",
              confidenceReason:
                "Student reviewed and approved this imported assignment.",
              updatedAt: new Date().toISOString(),
            }
          : assignment,
      ),
    );
    setToast("Review item approved");
  }

  function handleRejectReview(assignmentId: string) {
    setAssignments((current) =>
      current.filter((assignment) => assignment.id !== assignmentId),
    );
    if (selectedAssignmentId === assignmentId) {
      setSelectedAssignmentId(null);
    }
    setToast("Review item rejected");
  }

  function handleMergeDuplicate(assignmentId: string, duplicateAssignmentId: string) {
    const duplicate = assignments.find(
      (assignment) => assignment.id === duplicateAssignmentId,
    );
    setAssignments((current) =>
      current.map((assignment) =>
        assignment.id === assignmentId
          ? {
              ...assignment,
              duplicateOf: duplicateAssignmentId,
              confidence: "confirmed",
              confidenceReason: `Student merged this item with ${duplicate?.title ?? "a matching assignment"}.`,
              updatedAt: new Date().toISOString(),
            }
          : assignment,
      ),
    );
    setToast("Duplicate merge recorded");
  }

  function handleOpenSource(assignment: Assignment) {
    if (!assignment.sourceUrl) {
      setToast("This assignment has no external source link");
      return;
    }
    window.open(assignment.sourceUrl, "_blank", "noopener,noreferrer");
  }

  function handleManualSubmit(draft: AssignmentDraft) {
    setAssignments((current) => [...current, normalizeTask(draft)]);
    setManualDialogOpen(false);
    setToast("Manual assignment added");
  }

  function handleSyllabusSubmit(draft: AssignmentDraft) {
    setAssignments((current) => [...current, normalizeTask(draft)]);
    setSyllabusDialogOpen(false);
    setActiveView("review");
    setToast("Syllabus item sent to review");
  }

  function handleSourceSync(sourceId: string) {
    setSources((current) =>
      current.map((source) =>
        source.id === sourceId
          ? {
              ...source,
              status: "syncing",
            }
          : source,
      ),
    );

    window.setTimeout(() => {
      setSources((current) =>
        current.map((source) =>
          source.id === sourceId
            ? {
                ...source,
                status: "connected",
                lastSyncedAt: new Date().toISOString(),
                errorMessage: undefined,
              }
            : source,
        ),
      );
      setToast("Source sync completed");
    }, 900);
  }

  function handleSourceToggle(sourceId: string) {
    setSources((current) =>
      current.map((source) =>
        source.id === sourceId
          ? {
              ...source,
              status: source.status === "disabled" ? "connected" : "disabled",
            }
          : source,
      ),
    );
    setToast("Source preference updated");
  }

  function renderScreen() {
    if (activeView === "dashboard") {
      return (
        <Dashboard
          assignments={assignments}
          courses={mockCourses}
          duplicateSuggestions={duplicateSuggestions}
          onComplete={handleComplete}
          onEdit={setSelectedAssignmentId}
          onOpenSource={handleOpenSource}
        />
      );
    }

    if (activeView === "courses") {
      if (selectedCourse) {
        return (
          <CoursePage
            assignments={assignments}
            course={selectedCourse}
            duplicateSuggestions={duplicateSuggestions}
            onBack={() => setSelectedCourseId(null)}
            onComplete={handleComplete}
            onEdit={setSelectedAssignmentId}
            onOpenSource={handleOpenSource}
            sources={sources}
          />
        );
      }

      return (
        <CourseList
          assignments={assignments}
          courses={mockCourses}
          onOpenCourse={setSelectedCourseId}
          sources={sources}
        />
      );
    }

    if (activeView === "calendar") {
      return (
        <CalendarView
          assignments={assignments}
          courses={mockCourses}
          onOpenAssignment={setSelectedAssignmentId}
        />
      );
    }

    if (activeView === "review") {
      return (
        <ReviewQueue
          assignments={assignments}
          courses={mockCourses}
          duplicateSuggestions={duplicateSuggestions}
          onApprove={handleApproveReview}
          onEdit={setSelectedAssignmentId}
          onMerge={handleMergeDuplicate}
          onOpenSource={handleOpenSource}
          onReject={handleRejectReview}
          onUploadSyllabus={() => setSyllabusDialogOpen(true)}
        />
      );
    }

    if (activeView === "sources") {
      return (
        <SourcesPage
          onSync={handleSourceSync}
          onToggle={handleSourceToggle}
          sources={sources}
        />
      );
    }

    return <SettingsPage />;
  }

  const headerCopy = viewCopy[activeView];

  return (
    <>
      <AppShell
        activeView={activeView}
        assignments={assignments}
        courses={mockCourses}
        onAddAssignment={() => setManualDialogOpen(true)}
        onNavigate={handleNavigate}
        onUploadSyllabus={() => setSyllabusDialogOpen(true)}
        reviewCount={reviewCount}
        sources={sources}
        subtitle={headerCopy.subtitle}
        title={headerCopy.title}
      >
        {renderScreen()}
      </AppShell>

      <Dialog
        description="Create a trusted task that is not linked to an external source."
        onClose={() => setManualDialogOpen(false)}
        open={manualDialogOpen}
        title="Manual Assignment Entry"
      >
        <ManualAssignmentEntry
          courses={mockCourses}
          onCancel={() => setManualDialogOpen(false)}
          onSubmit={handleManualSubmit}
        />
      </Dialog>

      <Dialog
        description="Mock a syllabus import, then send the normalized result into review."
        onClose={() => setSyllabusDialogOpen(false)}
        open={syllabusDialogOpen}
        title="Syllabus Upload Review Flow"
      >
        <SyllabusUploadFlow
          courses={mockCourses}
          onCancel={() => setSyllabusDialogOpen(false)}
          onSubmit={handleSyllabusSubmit}
        />
      </Dialog>

      <Dialog
        description="Inspect trust, reminders, source history, duplicate matches, and manual edits."
        onClose={() => setSelectedAssignmentId(null)}
        open={Boolean(selectedAssignment)}
        title="Assignment Detail"
      >
        {selectedAssignment ? (
          <AssignmentDetail
            allAssignments={assignments}
            assignment={selectedAssignment}
            course={mockCourses.find((course) => course.id === selectedAssignment.courseId)}
            duplicateSuggestions={duplicateSuggestions}
            onClose={() => setSelectedAssignmentId(null)}
            onMergeDuplicate={handleMergeDuplicate}
            onUpdate={handleUpdateAssignment}
          />
        ) : null}
      </Dialog>

      {toast ? <Toast message={toast} /> : null}
    </>
  );
}
