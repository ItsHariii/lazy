import { createClient, type Session, type User } from "@supabase/supabase-js";

type SourceId =
  | "canvas"
  | "brightspace"
  | "syllabus"
  | "manual"
  | "mcgraw_hill"
  | "browser_helper";

type AssignmentStatus =
  | "not_started"
  | "in_progress"
  | "overdue"
  | "completed"
  | "archived";

type Confidence = "confirmed" | "probable" | "needs_review";

type CourseRow = {
  id: string;
  user_id: string;
  source: SourceId;
  external_id: string;
  code: string;
  title: string;
  instructor: string | null;
  color: string;
  term: string | null;
  syllabus_file: string | null;
};

type AssignmentRow = {
  id: string;
  user_id: string;
  course_id: string | null;
  source: SourceId;
  external_id: string | null;
  source_fingerprint: string;
  title: string;
  due_at: string;
  status: AssignmentStatus;
  confidence: Confidence;
  confidence_reason: string | null;
  source_url: string | null;
  notes: string | null;
  syllabus_text_match: string | null;
  completed_at: string | null;
  archived_at: string | null;
};

type SourceConnectionRow = {
  source: SourceId;
  status: "ok" | "off" | "warn" | "error" | "syncing";
  last_synced_at: string | null;
  items_count: number;
  error_message: string | null;
};

export type AppCourse = {
  id: string;
  code: string;
  title: string;
  instructor?: string;
  color: string;
  term?: string;
  syllabusFile?: string;
  source?: SourceId;
  externalId?: string;
};

export type AppAssignment = {
  id: string;
  title: string;
  courseId: string;
  dueAt: string;
  source: SourceId;
  status: AssignmentStatus;
  confidence: Confidence;
  confidenceReason?: string;
  sourceUrl?: string;
  syllabusTextMatch?: string;
  notes?: string;
  externalId?: string;
  sourceFingerprint?: string;
  completedAt?: string;
  archivedAt?: string;
};

export type AppSource = {
  id: SourceId;
  status: "ok" | "off" | "warn" | "error" | "syncing";
  lastSync: string;
  items: number;
  error: string | null;
};

export type WorkspaceData = {
  courses: AppCourse[];
  assignments: AppAssignment[];
  sources: AppSource[];
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

const SOURCE_LABELS: Record<SourceId, string> = {
  canvas: "Canvas",
  brightspace: "iCollege · Brightspace",
  syllabus: "Syllabus Uploads",
  manual: "Manual Entries",
  mcgraw_hill: "McGraw Hill",
  browser_helper: "Browser Helper",
};

function requireClient() {
  if (!supabase) {
    throw new Error("Supabase env vars are missing. Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  return supabase;
}

export async function getSession(): Promise<Session | null> {
  const client = requireClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthStateChange(
  callback: (session: Session | null) => void,
) {
  const client = requireClient();
  return client.auth.onAuthStateChange((_event, session) => callback(session));
}

export async function signInWithPassword(email: string, password: string) {
  const client = requireClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signUpWithPassword(email: string, password: string) {
  const client = requireClient();
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  const client = requireClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function loadWorkspace(userId: string): Promise<WorkspaceData> {
  const client = requireClient();
  await seedSources();

  const [coursesRes, assignmentsRes, sourcesRes] = await Promise.all([
    client
      .from("courses")
      .select("*")
      .eq("user_id", userId)
      .order("code", { ascending: true }),
    client
      .from("assignments")
      .select("*")
      .eq("user_id", userId)
      .order("due_at", { ascending: true }),
    client
      .from("source_connections")
      .select("source,status,last_synced_at,items_count,error_message")
      .eq("user_id", userId),
  ]);

  if (coursesRes.error) throw coursesRes.error;
  if (assignmentsRes.error) throw assignmentsRes.error;
  if (sourcesRes.error) throw sourcesRes.error;

  return {
    courses: (coursesRes.data as CourseRow[]).map(courseFromRow),
    assignments: (assignmentsRes.data as AssignmentRow[]).map(assignmentFromRow),
    sources: (sourcesRes.data as SourceConnectionRow[]).map(sourceFromRow),
  };
}

export async function saveImportedData(
  userId: string,
  courses: AppCourse[],
  assignments: AppAssignment[],
): Promise<WorkspaceData> {
  const client = requireClient();
  const courseRows = courses.map((course) => courseToRow(userId, course));
  const upsertedCourses = courseRows.length
    ? await client
        .from("courses")
        .upsert(courseRows, { onConflict: "user_id,source,external_id" })
        .select("*")
    : { data: [] as CourseRow[], error: null };

  if (upsertedCourses.error) throw upsertedCourses.error;

  const existingCoursesRes = await client
    .from("courses")
    .select("*")
    .eq("user_id", userId);
  if (existingCoursesRes.error) throw existingCoursesRes.error;

  const courseRowsByExternal = new Map<string, CourseRow>();
  for (const row of existingCoursesRes.data as CourseRow[]) {
    courseRowsByExternal.set(courseLookupKey(row.source, row.external_id), row);
    courseRowsByExternal.set(row.id, row);
  }

  await upsertAssignmentsPreservingDone(
    userId,
    assignments.map((assignment) => assignmentToRow(userId, assignment, courseRowsByExternal)),
  );

  return loadWorkspace(userId);
}

export async function createManualAssignment(
  userId: string,
  draft: {
    title: string;
    courseId?: string;
    courseCode?: string;
    courseTitle?: string;
    dueAt: string;
    notes?: string;
  },
): Promise<WorkspaceData> {
  const client = requireClient();
  let courseId = draft.courseId;

  if (!courseId && draft.courseCode) {
    const slug = slugify(draft.courseCode);
    const source = "manual";
    const externalId = `manual-${slug}`;
    const row = {
      user_id: userId,
      source,
      external_id: externalId,
      code: draft.courseCode,
      title: draft.courseTitle || draft.courseCode,
      color: pickColor(externalId),
    };
    const { data, error } = await client
      .from("courses")
      .upsert(row, { onConflict: "user_id,source,external_id" })
      .select("*")
      .single();
    if (error) throw error;
    courseId = (data as CourseRow).id;
  }

  if (!courseId) {
    const firstCourse = await client
      .from("courses")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (firstCourse.error) throw firstCourse.error;
    courseId = firstCourse.data?.id;
  }

  const externalId = `manual-${Date.now()}`;
  const row = {
    user_id: userId,
    course_id: courseId || null,
    source: "manual",
    external_id: externalId,
    source_fingerprint: `manual:${externalId}`,
    title: draft.title,
    due_at: draft.dueAt,
    status: "not_started",
    confidence: "confirmed",
    confidence_reason: "Manually entered.",
    notes: draft.notes || null,
  };

  const { error } = await client.from("assignments").insert(row);
  if (error) throw error;
  await touchSource(userId, "manual", "ok", 1);
  return loadWorkspace(userId);
}

export async function setAssignmentStatus(
  assignmentId: string,
  status: AssignmentStatus,
): Promise<AppAssignment> {
  const client = requireClient();
  const { data, error } = await client.rpc("mark_assignment_status", {
    p_assignment_id: assignmentId,
    p_status: status,
  });
  if (error) throw error;
  return assignmentFromRow(data as AssignmentRow);
}

export async function updateAssignmentConfidence(
  assignmentId: string,
  confidence: Confidence,
): Promise<AppAssignment> {
  const client = requireClient();
  const { data, error } = await client
    .from("assignments")
    .update({ confidence })
    .eq("id", assignmentId)
    .select("*")
    .single();
  if (error) throw error;
  return assignmentFromRow(data as AssignmentRow);
}

export async function deleteAssignment(assignmentId: string) {
  const client = requireClient();
  const { error } = await client.from("assignments").delete().eq("id", assignmentId);
  if (error) throw error;
}

export async function updateSourceFromSync(
  userId: string,
  source: SourceId,
  status: "ok" | "off" | "warn" | "error",
  items: number,
  errorMessage?: string | null,
) {
  await touchSource(userId, source, status, items, errorMessage);
}

export async function recordSyncRun(
  userId: string,
  source: SourceId,
  status: "ok" | "warn" | "error",
  importedCount: number,
  errorMessage?: string | null,
) {
  const client = requireClient();
  const { error } = await client.from("sync_runs").insert({
    user_id: userId,
    source,
    status,
    imported_count: importedCount,
    error_message: errorMessage || null,
    finished_at: new Date().toISOString(),
  });
  if (error) throw error;
}

async function seedSources() {
  const client = requireClient();
  const { error } = await client.rpc("seed_source_connections");
  if (error) throw error;
}

async function touchSource(
  userId: string,
  source: SourceId,
  status: "ok" | "off" | "warn" | "error" | "syncing",
  itemDelta: number,
  errorMessage?: string | null,
) {
  const client = requireClient();
  const existing = await client
    .from("source_connections")
    .select("items_count")
    .eq("user_id", userId)
    .eq("source", source)
    .maybeSingle();
  if (existing.error) throw existing.error;

  const items = Math.max(0, (existing.data?.items_count || 0) + itemDelta);
  const { error } = await client.from("source_connections").upsert(
    {
      user_id: userId,
      source,
      status,
      last_synced_at: new Date().toISOString(),
      items_count: items,
      error_message: errorMessage || null,
    },
    { onConflict: "user_id,source" },
  );
  if (error) throw error;
}

async function upsertAssignmentsPreservingDone(
  userId: string,
  rows: Array<Record<string, unknown>>,
) {
  if (rows.length === 0) return;
  const client = requireClient();
  const fingerprints = rows.map((row) => String(row.source_fingerprint));
  const existing = await client
    .from("assignments")
    .select("*")
    .eq("user_id", userId)
    .in("source_fingerprint", fingerprints);
  if (existing.error) throw existing.error;

  const existingByFingerprint = new Map(
    (existing.data as AssignmentRow[]).map((row) => [row.source_fingerprint, row]),
  );

  const inserts = rows.filter(
    (row) => !existingByFingerprint.has(String(row.source_fingerprint)),
  );
  const updates = rows.filter((row) => {
    const match = existingByFingerprint.get(String(row.source_fingerprint));
    return match && match.status !== "completed" && match.status !== "archived";
  });

  if (inserts.length > 0) {
    const { error } = await client.from("assignments").insert(inserts);
    if (error) throw error;
  }

  for (const row of updates) {
    const match = existingByFingerprint.get(String(row.source_fingerprint));
    if (!match) continue;
    const { error } = await client
      .from("assignments")
      .update({
        course_id: row.course_id,
        external_id: row.external_id,
        title: row.title,
        due_at: row.due_at,
        status: row.status,
        confidence: row.confidence,
        confidence_reason: row.confidence_reason,
        source_url: row.source_url,
        notes: row.notes,
        syllabus_text_match: row.syllabus_text_match,
      })
      .eq("id", match.id);
    if (error) throw error;
  }
}

function courseToRow(userId: string, course: AppCourse) {
  const source = sourceFromCourse(course);
  return {
    user_id: userId,
    source,
    external_id: course.externalId || course.id,
    code: course.code,
    title: course.title,
    instructor: course.instructor || null,
    color: course.color || pickColor(course.code || course.title || course.id),
    term: course.term || null,
    syllabus_file: course.syllabusFile || null,
  };
}

function assignmentToRow(
  userId: string,
  assignment: AppAssignment,
  courseRowsByExternal: Map<string, CourseRow>,
) {
  const source = assignment.source;
  const courseRow =
    courseRowsByExternal.get(assignment.courseId) ||
    courseRowsByExternal.get(courseLookupKey(source, assignment.courseId)) ||
    null;
  return {
    user_id: userId,
    course_id: courseRow?.id || null,
    source,
    external_id: assignment.externalId || assignment.id,
    source_fingerprint: assignment.sourceFingerprint || sourceFingerprint(assignment),
    title: assignment.title,
    due_at: assignment.dueAt,
    status: assignment.status || "not_started",
    confidence: assignment.confidence || "confirmed",
    confidence_reason: assignment.confidenceReason || null,
    source_url: assignment.sourceUrl || null,
    notes: assignment.notes || null,
    syllabus_text_match: assignment.syllabusTextMatch || null,
  };
}

function courseFromRow(row: CourseRow): AppCourse {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    instructor: row.instructor || undefined,
    color: row.color,
    term: row.term || undefined,
    syllabusFile: row.syllabus_file || undefined,
    source: row.source,
    externalId: row.external_id,
  };
}

function assignmentFromRow(row: AssignmentRow): AppAssignment {
  return {
    id: row.id,
    title: row.title,
    courseId: row.course_id || "",
    dueAt: row.due_at,
    source: row.source,
    status: row.status,
    confidence: row.confidence,
    confidenceReason: row.confidence_reason || undefined,
    sourceUrl: row.source_url || undefined,
    syllabusTextMatch: row.syllabus_text_match || undefined,
    notes: row.notes || undefined,
    externalId: row.external_id || undefined,
    sourceFingerprint: row.source_fingerprint,
    completedAt: row.completed_at || undefined,
    archivedAt: row.archived_at || undefined,
  };
}

function sourceFromRow(row: SourceConnectionRow): AppSource {
  return {
    id: row.source,
    status: row.status,
    lastSync: row.last_synced_at ? timeAgo(row.last_synced_at) : "Not connected",
    items: row.items_count,
    error: row.error_message,
  };
}

function sourceFromCourse(course: AppCourse): SourceId {
  if (course.source) return course.source;
  if (course.id.startsWith("canvas-")) return "canvas";
  if (course.id.startsWith("icollege-")) return "brightspace";
  if (course.id.startsWith("syllabus-")) return "syllabus";
  return "manual";
}

function sourceFingerprint(assignment: AppAssignment) {
  if (assignment.externalId) return `${assignment.source}:${assignment.externalId}`;
  if (assignment.id && !assignment.id.includes("-a")) return `${assignment.source}:${assignment.id}`;
  const title = assignment.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${assignment.source}:${assignment.courseId}:${title}:${new Date(assignment.dueAt).toISOString()}`;
}

function courseLookupKey(source: SourceId, externalId: string) {
  return `${source}:${externalId}`;
}

function pickColor(seed: string) {
  const colors = ["cobalt", "brick", "forest", "teal", "plum", "gold", "graphite"];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "course";
}

function timeAgo(iso: string) {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 30) return "just now";
  if (seconds < 90) return "a minute ago";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 7200) return "an hour ago";
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return new Date(iso).toLocaleString();
}

export function mergeSources(defaultSources: any[], dbSources: AppSource[]) {
  const byId = new Map(dbSources.map((source) => [source.id, source]));
  return defaultSources.map((source) => {
    const dbSource = byId.get(source.id);
    if (!dbSource) return source;
    return {
      ...source,
      status: dbSource.status,
      lastSync: dbSource.lastSync,
      items: dbSource.items,
      error: dbSource.error,
    };
  });
}

export function setGlobalWorkspace(
  globals: any,
  courses: AppCourse[],
  assignments: AppAssignment[],
  sources?: AppSource[],
) {
  globals.COURSES.length = 0;
  globals.COURSES.push(...courses);
  globals.ASSIGNMENTS.length = 0;
  globals.ASSIGNMENTS.push(...assignments);
  if (sources) {
    const merged = mergeSources(globals.SOURCES, sources);
    globals.SOURCES.length = 0;
    globals.SOURCES.push(...merged);
  }
}

export type { Session, User };
