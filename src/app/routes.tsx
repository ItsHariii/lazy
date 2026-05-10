import {
  BookOpen,
  CalendarDays,
  Gauge,
  GraduationCap,
  Settings,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";

export type AppView =
  | "dashboard"
  | "courses"
  | "calendar"
  | "review"
  | "sources"
  | "settings";

export type RouteItem = {
  id: AppView;
  label: string;
  icon: ReactNode;
};

export const routes: RouteItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <Gauge size={18} />,
  },
  {
    id: "courses",
    label: "Courses",
    icon: <GraduationCap size={18} />,
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: <CalendarDays size={18} />,
  },
  {
    id: "review",
    label: "Review",
    icon: <ShieldCheck size={18} />,
  },
  {
    id: "sources",
    label: "Sources",
    icon: <BookOpen size={18} />,
  },
  {
    id: "settings",
    label: "Settings",
    icon: <Settings size={18} />,
  },
];
