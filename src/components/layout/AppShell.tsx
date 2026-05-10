import type { ReactNode } from "react";
import type { AppView } from "../../app/routes";
import type { Assignment } from "../../types/assignment";
import type { Course } from "../../types/course";
import type { SourceConnection } from "../../types/source";
import { Header } from "./Header";
import { RightRail } from "./RightRail";
import { Sidebar } from "./Sidebar";

type AppShellProps = {
  activeView: AppView;
  title: string;
  subtitle: string;
  assignments: Assignment[];
  courses: Course[];
  sources: SourceConnection[];
  reviewCount: number;
  children: ReactNode;
  onNavigate: (view: AppView) => void;
  onAddAssignment: () => void;
  onUploadSyllabus: () => void;
};

export function AppShell({
  activeView,
  title,
  subtitle,
  assignments,
  courses,
  sources,
  reviewCount,
  children,
  onNavigate,
  onAddAssignment,
  onUploadSyllabus,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="app-frame">
        <Header
          onAddAssignment={onAddAssignment}
          onUploadSyllabus={onUploadSyllabus}
          subtitle={subtitle}
          title={title}
        />
        <Sidebar activeView={activeView} onNavigate={onNavigate} reviewCount={reviewCount} />
        <div className="app-shell__content">
          <main className="main-content" id="main-content" tabIndex={-1}>
            {children}
          </main>
          <RightRail
            assignments={assignments}
            courses={courses}
            onNavigateReview={() => onNavigate("review")}
            onNavigateSources={() => onNavigate("sources")}
            reviewCount={reviewCount}
            sources={sources}
          />
        </div>
      </div>
    </div>
  );
}
