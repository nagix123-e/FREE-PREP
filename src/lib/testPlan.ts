import type { AttemptMode, PracticeTestCourse, Question, TestModuleSpec } from "../types";

export const TEST_MODULES: TestModuleSpec[] = [
  {
    key: "RW-1-base",
    section: "RW",
    module: 1,
    route: "base",
    title: "Reading and Writing Module 1",
    minutes: 32,
    questionCount: 27
  },
  {
    key: "RW-2-hard",
    section: "RW",
    module: 2,
    route: "hard",
    title: "Reading and Writing Module 2",
    minutes: 32,
    questionCount: 27
  },
  {
    key: "MATH-1-base",
    section: "MATH",
    module: 1,
    route: "base",
    title: "Math Module 1",
    minutes: 35,
    questionCount: 22
  },
  {
    key: "MATH-2-hard",
    section: "MATH",
    module: 2,
    route: "hard",
    title: "Math Module 2",
    minutes: 35,
    questionCount: 22
  }
];

export function getModuleQuestions(questions: Question[], moduleIndex: number): Question[] {
  const spec = TEST_MODULES[moduleIndex];
  if (!spec) {
    return [];
  }

  return questions.filter(
    (question) =>
      question.section === spec.section &&
      question.module === spec.module &&
      question.route === spec.route
  );
}

export function getModuleDurationSec(moduleIndex: number): number {
  return (TEST_MODULES[moduleIndex]?.minutes ?? 0) * 60;
}

export function getModuleIndexesForCourse(course: PracticeTestCourse): number[] {
  if (course === "rw") {
    return [0, 1];
  }
  if (course === "math") {
    return [2, 3];
  }
  return TEST_MODULES.map((_, index) => index);
}

export function getModuleIndexesForAttemptMode(mode: AttemptMode): number[] {
  if (mode === "full_hard_rw_practice") {
    return getModuleIndexesForCourse("rw");
  }
  if (mode === "full_hard_math_practice") {
    return getModuleIndexesForCourse("math");
  }
  return getModuleIndexesForCourse("all");
}

export function getAttemptModeForCourse(course: PracticeTestCourse): AttemptMode {
  if (course === "rw") {
    return "full_hard_rw_practice";
  }
  if (course === "math") {
    return "full_hard_math_practice";
  }
  return "full_hard_practice";
}
