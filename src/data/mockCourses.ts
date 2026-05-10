import type { Course } from "../types/course";

export const mockCourses: Course[] = [
  {
    id: "bio-2100",
    name: "Molecular Biology",
    code: "BIOL 2100",
    instructor: "Dr. Nadine Patel",
    color: "forest",
    platform: "canvas",
    syllabusFile: "BIOL2100_Spring2026.pdf",
    gradingNotes:
      "Lab reports are accepted up to 24 hours late with a 10 percent penalty.",
  },
  {
    id: "hist-3025",
    name: "Modern World History",
    code: "HIST 3025",
    instructor: "Prof. Marcus Lee",
    color: "brick",
    platform: "brightspace",
    syllabusFile: "HIST3025_Syllabus.docx",
    gradingNotes:
      "Primary source responses can be revised once before the final exam period.",
  },
  {
    id: "math-2210",
    name: "Calculus II",
    code: "MATH 2210",
    instructor: "Dr. Camille Rowan",
    color: "cobalt",
    platform: "canvas",
    gradingNotes: "WebAssign and LMS due dates should match before submission.",
  },
  {
    id: "engl-1102",
    name: "Academic Writing",
    code: "ENGL 1102",
    instructor: "Dr. Priya Menon",
    color: "plum",
    platform: "manual",
    syllabusFile: "Writing_Seminar_ImageUpload.png",
    gradingNotes: "Conference notes are not graded but affect revision planning.",
  },
  {
    id: "chem-1212",
    name: "General Chemistry II",
    code: "CHEM 1212",
    instructor: "Dr. Jordan Alvarez",
    color: "teal",
    platform: "brightspace",
    gradingNotes:
      "McGraw Hill Connect assignments count as homework only after LMS sync.",
  },
];
