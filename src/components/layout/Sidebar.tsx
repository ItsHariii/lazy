import { routes, type AppView } from "../../app/routes";

type SidebarProps = {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  reviewCount: number;
};

export function Sidebar({ activeView, onNavigate, reviewCount }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <nav className="sidebar__nav">
        {routes.map((route) => (
          <button
            aria-current={activeView === route.id ? "page" : undefined}
            className="sidebar__link"
            key={route.id}
            onClick={() => onNavigate(route.id)}
            type="button"
          >
            <span className="sidebar__icon" aria-hidden="true">
              {route.icon}
            </span>
            <span>{route.label}</span>
            {route.id === "review" && reviewCount > 0 ? (
              <span className="sidebar__count" aria-label={`${reviewCount} review items`}>
                {reviewCount}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="sidebar__footer" aria-label="Review queue policy">
        <span>Review gate</span>
        <strong>{reviewCount} pending</strong>
        <p>Uncertain syllabus and browser-helper imports stay out of trusted work.</p>
      </div>
    </aside>
  );
}
