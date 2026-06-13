import type { VisualType } from "../types";

export const SUPPORTED_VISUAL_TYPES: readonly VisualType[] = [
  "none",
  "table",
  "line_graph",
  "bar_graph",
  "scatter_plot",
  "coordinate_plane",
  "function_graph",
  "triangle",
  "right_triangle",
  "rectangle",
  "circle",
  "number_line",
  "box_plot",
  "pie_chart"
];

export interface VisualSchema {
  type: VisualType;
  required: string[];
  optional: string[];
  description: string;
}

export const VISUAL_SCHEMAS: Record<VisualType, VisualSchema> = {
  none: {
    type: "none",
    required: [],
    optional: [],
    description: "No generated visual."
  },
  table: {
    type: "table",
    required: [],
    optional: ["headers", "rows", "caption"],
    description: "A compact data table. table_markdown is preferred for CSV-authored tables."
  },
  line_graph: {
    type: "line_graph",
    required: ["points"],
    optional: ["title", "xLabel", "yLabel", "xMin", "xMax", "yMin", "yMax"],
    description: "A connected x-y line graph."
  },
  bar_graph: {
    type: "bar_graph",
    required: ["bars"],
    optional: ["title", "xLabel", "yLabel"],
    description: "A categorical bar graph."
  },
  scatter_plot: {
    type: "scatter_plot",
    required: ["points"],
    optional: ["title", "xLabel", "yLabel", "xMin", "xMax", "yMin", "yMax"],
    description: "An x-y scatter plot."
  },
  coordinate_plane: {
    type: "coordinate_plane",
    required: [],
    optional: ["points", "segments", "xMin", "xMax", "yMin", "yMax"],
    description: "A coordinate grid with optional points and line segments."
  },
  function_graph: {
    type: "function_graph",
    required: [],
    optional: ["equation", "equationLabel", "points", "xMin", "xMax", "yMin", "yMax"],
    description: "A function graph rendered from an equation or sampled points."
  },
  triangle: {
    type: "triangle",
    required: [],
    optional: ["labels", "rightAngle", "caption"],
    description: "A triangle diagram."
  },
  right_triangle: {
    type: "right_triangle",
    required: [],
    optional: ["labels", "caption"],
    description: "A right triangle diagram."
  },
  rectangle: {
    type: "rectangle",
    required: [],
    optional: ["widthLabel", "heightLabel", "caption"],
    description: "A rectangle diagram."
  },
  circle: {
    type: "circle",
    required: [],
    optional: ["radiusLabel", "diameterLabel", "caption"],
    description: "A circle diagram."
  },
  number_line: {
    type: "number_line",
    required: [],
    optional: ["min", "max", "points", "segments"],
    description: "A number line with optional points and intervals."
  },
  box_plot: {
    type: "box_plot",
    required: ["min", "q1", "median", "q3", "max"],
    optional: ["title", "axisLabel"],
    description: "A five-number-summary box plot."
  },
  pie_chart: {
    type: "pie_chart",
    required: ["slices"],
    optional: ["title"],
    description: "A proportional pie chart."
  }
};

export function isSupportedVisualType(value: string): value is VisualType {
  return SUPPORTED_VISUAL_TYPES.includes(value as VisualType);
}

export function getVisualSchema(type: VisualType): VisualSchema {
  return VISUAL_SCHEMAS[type];
}
