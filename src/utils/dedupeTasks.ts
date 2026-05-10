import type { Assignment, DuplicateSuggestion } from "../types/assignment";

function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(report|assignment|homework|hw|problem|set|due)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSimilarity(first: string, second: string) {
  const firstTokens = new Set(normalizeTitle(first).split(" ").filter(Boolean));
  const secondTokens = new Set(normalizeTitle(second).split(" ").filter(Boolean));

  if (firstTokens.size === 0 || secondTokens.size === 0) {
    return 0;
  }

  const shared = [...firstTokens].filter((token) => secondTokens.has(token));
  const total = new Set([...firstTokens, ...secondTokens]);
  return shared.length / total.size;
}

function hoursBetween(first: string, second: string) {
  return Math.abs(new Date(first).getTime() - new Date(second).getTime()) / 3_600_000;
}

export function duplicateScore(first: Assignment, second: Assignment) {
  let score = 0;
  const reasons: string[] = [];

  const titleScore = tokenSimilarity(first.title, second.title);
  if (titleScore > 0.55) {
    score += titleScore * 45;
    reasons.push("similar title");
  }

  if (first.courseId === second.courseId) {
    score += 25;
    reasons.push("same course");
  }

  const dueDifference = hoursBetween(first.dueAt, second.dueAt);
  if (dueDifference <= 3) {
    score += 20;
    reasons.push("due within three hours");
  } else if (dueDifference <= 24) {
    score += 12;
    reasons.push("due on nearby date");
  }

  if (first.sourceUrl && first.sourceUrl === second.sourceUrl) {
    score += 30;
    reasons.push("same source URL");
  }

  if (first.lmsId && first.lmsId === second.lmsId) {
    score += 35;
    reasons.push("matching LMS metadata");
  }

  if (
    first.syllabusTextMatch &&
    second.syllabusTextMatch &&
    tokenSimilarity(first.syllabusTextMatch, second.syllabusTextMatch) > 0.5
  ) {
    score += 15;
    reasons.push("matching syllabus text");
  }

  return { score: Math.min(Math.round(score), 100), reasons };
}

export function findDuplicateSuggestions(assignments: Assignment[]) {
  const suggestions: DuplicateSuggestion[] = [];

  for (let index = 0; index < assignments.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < assignments.length; nextIndex += 1) {
      const first = assignments[index];
      const second = assignments[nextIndex];
      const result = duplicateScore(first, second);

      if (result.score >= 58 || first.duplicateOf === second.id || second.duplicateOf === first.id) {
        suggestions.push({
          id: `dupe-${first.id}-${second.id}`,
          assignmentId: first.id,
          duplicateAssignmentId: second.id,
          score: result.score,
          reasons: result.reasons,
        });
      }
    }
  }

  return suggestions.sort((first, second) => second.score - first.score);
}
