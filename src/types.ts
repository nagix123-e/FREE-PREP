export type Section = "RW" | "MATH";
export type ModuleNumber = 1 | 2;
export type Route = "base" | "hard";
export type QuestionType = "multiple_choice" | "student_response";
export type VisualType =
  | "none"
  | "table"
  | "line_graph"
  | "bar_graph"
  | "scatter_plot"
  | "coordinate_plane"
  | "function_graph"
  | "triangle"
  | "right_triangle"
  | "rectangle"
  | "circle"
  | "number_line"
  | "box_plot"
  | "pie_chart";
export type SetStatus = "valid" | "warning";
export type PackageType = "full_test" | "rw_section" | "math_section";
export type AttemptStatus = "in_progress" | "module_review" | "section_break" | "completed" | "paused";
export type AttemptMode =
  | "full_hard_practice"
  | "full_hard_rw_practice"
  | "full_hard_math_practice"
  | "mistake_practice"
  | "domain_practice"
  | "review_list_practice";

export const REQUIRED_HEADERS = [
  "test_id",
  "exam_version",
  "generation_batch_id",
  "target_score_band",
  "question_id",
  "section",
  "module",
  "route",
  "question_number",
  "content_domain",
  "skill_group",
  "skill_code",
  "skill_label",
  "question_topic",
  "difficulty",
  "scoring_weight",
  "question_type",
  "passage",
  "question",
  "explanation",
  "time_estimate_sec",
  "visual_type",
  "visual_json",
  "table_markdown",
  "equation_latex",
  "student_response_type",
  "primary_skill",
  "secondary_skill",
  "tags"
] as const;

export type RequiredHeader = (typeof REQUIRED_HEADERS)[number];

export interface RawCsvQuestion {
  test_id: string;
  exam_version: string;
  generation_batch_id: string;
  target_score_band: string;
  question_id: string;
  section: string;
  module: string;
  route: string;
  question_number: string;
  domain?: string;
  skill?: string;
  difficulty: string;
  scoring_weight: string;
  question_type: string;
  passage: string;
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string;
  correct_choice_index: string;
  explanation: string;
  time_estimate_sec: string;
  visual_type: string;
  visual_json: string;
  table_markdown: string;
  equation_latex: string;
  student_response_type: string;
  correct_numeric_answer: string;
  answer_tolerance: string;
  primary_skill: string;
  secondary_skill: string;
  tags: string;
  content_domain: string;
  skill_group: string;
  skill_code: string;
  skill_label: string;
  question_topic: string;
  graph_json?: string;
  diagram_json?: string;
  image_definition?: string;
  legacy_visual_data?: string;
  visual_payload_v1?: string;
}

export interface Question {
  id?: number;
  questionSetId?: number;
  testId: string;
  examVersion: string;
  generationBatchId: string;
  targetScoreBand: string;
  questionId: string;
  section: Section;
  module: ModuleNumber;
  route: Route;
  questionNumber: number;
  domain: string;
  skill: string;
  difficulty: string;
  questionType: QuestionType;
  passage: string;
  question: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  correctAnswer: string;
  correctChoiceIndex: number | null;
  explanation: string;
  timeEstimateSec: number | null;
  visualType: VisualType;
  visualJson: string;
  tableMarkdown: string;
  imagePath: string;
  equationLatex: string;
  answerTolerance: string;
  studentResponseType: string;
  correctNumericAnswer: string;
  primarySkill: string;
  secondarySkill: string;
  tags: string;
  contentDomain: string;
  skillGroup: string;
  skillCode: string;
  skillLabel: string;
  questionTopic: string;
  scoringWeight: number;
}

export interface QuestionSet {
  id: number;
  name: string;
  description: string;
  importedAt: string;
  totalQuestions: number;
  status: SetStatus;
  packageType: PackageType;
  sourceFilename: string;
  rowCount: number;
  sectionCounts: Record<Section, number>;
}

export interface Attempt {
  id: number;
  questionSetId: number;
  mode: AttemptMode;
  status: AttemptStatus;
  startedAt: string;
  completedAt: string | null;
  currentSection: Section | null;
  currentModule: ModuleNumber | null;
  currentQuestionIndex: number;
  remainingTimeSec: number | null;
  practiceScore: number | null;
  rwScore: number | null;
  mathScore: number | null;
}

export interface ReviewListItem {
  id: number;
  questionId: number;
  questionSetId: number;
  createdAt: string;
  note: string;
  priority: number;
  question?: Question;
}

export interface AppSettings {
  language: "en" | "ja";
  theme: "light" | "dark" | "system";
  timerDefaultVisible: boolean;
  defaultPracticeLength: number;
  fullscreenTestMode: boolean;
}

export interface HighlightRecord {
  id?: number;
  attemptId: number;
  questionId: number;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  color: "yellow" | "blue" | "pink";
  createdAt: string;
}

export interface NoteRecord {
  id?: number;
  attemptId: number;
  questionId: number;
  note: string;
  updatedAt: string;
}

export interface DashboardSummary {
  totalTestsTaken: number;
  averagePracticeScore: number;
  bestPracticeScore: number;
  averageRwScore: number;
  averageMathScore: number;
  totalQuestionsAnswered: number;
  totalStudyTimeSec: number;
  reviewListCount: number;
  recentScores: AttemptSummary[];
  weakAreas: BreakdownRow[];
  strongAreas: BreakdownRow[];
  visualPerformance: BreakdownRow[];
}

export interface ResponseRecord {
  id?: number;
  attemptId: number;
  questionId: number;
  selectedAnswer: string;
  isCorrect: boolean | null;
  marked: boolean;
  eliminatedChoices: string[];
  timeSpentSec: number;
}

export interface AttemptSummary extends Attempt {
  questionSetName: string;
  accuracy: number;
  durationSec: number;
  archived?: boolean;
}

export interface GradedQuestion {
  question: Question;
  response: ResponseRecord | null;
  selectedAnswer: string;
  isCorrect: boolean;
  isAnswered: boolean;
  weight: number;
}

export interface BreakdownRow {
  label: string;
  correct: number;
  total: number;
  weightedCorrect: number;
  weightedTotal: number;
  accuracy: number;
  genreScore: number;
  averageTimeSec: number;
  strength: "Strong" | "Needs Review" | "Weak" | "Not Enough Data";
}

export interface ScoreResult {
  attemptId: number;
  attemptMode: AttemptMode;
  attemptStatus: AttemptStatus;
  totalScore: number | null;
  rwScore: number | null;
  mathScore: number | null;
  correct: number;
  incorrect: number;
  unanswered: number;
  marked: number;
  accuracy: number;
  timeSpentSec: number;
  gradedQuestions: GradedQuestion[];
  moduleBreakdown: BreakdownRow[];
  domainBreakdown: BreakdownRow[];
  skillBreakdown: BreakdownRow[];
  topicBreakdown: BreakdownRow[];
  visualBreakdown: BreakdownRow[];
}

export interface TestModuleSpec {
  key: string;
  section: Section;
  module: ModuleNumber;
  route: Route;
  title: string;
  minutes: number;
  questionCount: number;
}

export type PracticeTestCourse = "all" | "rw" | "math";

export interface ValidationIssue {
  level: "error" | "warning";
  row?: number;
  message: string;
}

export interface ValidationSummary {
  valid: boolean;
  questions: Question[];
  issues: ValidationIssue[];
  counts: Record<string, number>;
  visualTypeCounts: Record<string, number>;
  contentDomainCounts: Record<string, number>;
  skillGroupCounts: Record<string, number>;
  packageType: PackageType | null;
  rowCount: number;
  sectionCounts: Record<Section, number>;
}

export type RouteKey =
  | "home"
  | "import"
  | "sets"
  | "preview"
  | "setup"
  | "test"
  | "moduleReview"
  | "sectionBreak"
  | "result"
  | "reviewAnswers"
  | "history"
  | "achievements"
  | "dashboard"
  | "mistakePractice"
  | "domainPractice"
  | "reviewList"
  | "reviewListPractice"
  | "statistics"
  | "practiceRunner"
  | "testOverview"
  | "rulesAndTools"
  | "deviceCheck"
  | "settings";
