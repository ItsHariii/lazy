import type { CourseAccent } from "../../types/course";

type CourseSwatchProps = {
  color: CourseAccent;
  label: string;
};

export function CourseSwatch({ color, label }: CourseSwatchProps) {
  return (
    <span
      aria-label={`${label} course color`}
      className={`course-swatch course-swatch--${color}`}
      role="img"
    />
  );
}
