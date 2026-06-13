import type { VisualType } from "../types";

export type RendererName =
  | "TableRenderer"
  | "LineGraphRenderer"
  | "BarGraphRenderer"
  | "ScatterPlotRenderer"
  | "CoordinatePlaneRenderer"
  | "FunctionGraphRenderer"
  | "TriangleRenderer"
  | "CircleRenderer"
  | "NumberLineRenderer"
  | "BoxPlotRenderer"
  | "PieChartRenderer"
  | "None";

export function getRendererName(visualType: VisualType): RendererName {
  switch (visualType) {
    case "table":
      return "TableRenderer";
    case "line_graph":
      return "LineGraphRenderer";
    case "bar_graph":
      return "BarGraphRenderer";
    case "scatter_plot":
      return "ScatterPlotRenderer";
    case "coordinate_plane":
      return "CoordinatePlaneRenderer";
    case "function_graph":
      return "FunctionGraphRenderer";
    case "triangle":
    case "right_triangle":
    case "rectangle":
      return "TriangleRenderer";
    case "circle":
      return "CircleRenderer";
    case "number_line":
      return "NumberLineRenderer";
    case "box_plot":
      return "BoxPlotRenderer";
    case "pie_chart":
      return "PieChartRenderer";
    case "none":
      return "None";
  }
}
