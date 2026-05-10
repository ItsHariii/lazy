import { FileUp, ListPlus, Search } from "lucide-react";
import { Button } from "../ui/Button";

type HeaderProps = {
  title: string;
  subtitle: string;
  onAddAssignment: () => void;
  onUploadSyllabus: () => void;
};

export function Header({
  title,
  subtitle,
  onAddAssignment,
  onUploadSyllabus,
}: HeaderProps) {
  return (
    <header className="header" aria-label="Lazy dashboard masthead">
      <div className="header__brand-row">
        <div className="header__brand">
          <span className="header__mark" aria-hidden="true">
            L
          </span>
          <div>
            <strong>Lazy</strong>
            <em>a quieter way to keep up.</em>
          </div>
        </div>
        <div className="header__view-copy">
          <span>{title}</span>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="header__edition-strip" aria-label="Edition status">
        <span>VOL. III · NO. 18</span>
        <span>SPRING TERM · WEEK 12</span>
        <span className="is-healthy">ALL SOURCES NOMINAL</span>
        <span>SYNCED 2 MIN AGO</span>
      </div>

      <div className="header__body">
        <div className="date-lockup" aria-label="Sunday, May 10, 2026">
          <span>Sunday</span>
          <strong>May 10</strong>
          <em>2026</em>
        </div>
        <div className="header__title-block">
          <p>
            <strong>Edition for Jordan Kim.</strong> 1 task due today, 5 more by
            Sunday. Filed from six sources, sorted by what matters next.
          </p>
          <div className="header__actions">
            <label className="search-field" htmlFor="global-search">
              <Search aria-hidden="true" size={17} />
              <span className="sr-only">Search assignments and courses</span>
              <input
                id="global-search"
                placeholder="Search assignments..."
                type="search"
              />
              <kbd>⌘K</kbd>
            </label>
            <Button icon={<FileUp size={17} />} onClick={onUploadSyllabus}>
              Upload Syllabus
            </Button>
            <Button icon={<ListPlus size={17} />} onClick={onAddAssignment} variant="primary">
              New Assignment
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
