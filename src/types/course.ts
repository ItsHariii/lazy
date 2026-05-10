export type CourseAccent =
  | "forest"
  | "teal"
  | "brick"
  | "cobalt"
  | "plum"
  | "gold"
  | "graphite";

export type Course = {
  id: string;
  name: string;
  code: string;
  instructor?: string;
  color: CourseAccent;
  platform?: "canvas" | "brightspace" | "manual";
  syllabusFile?: string;
  gradingNotes?: string;
};
