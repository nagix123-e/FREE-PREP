import type { VisualType } from "../../types";
import { BarGraphRenderer } from "./BarGraphRenderer";
import { BoxPlotRenderer } from "./BoxPlotRenderer";
import { CircleRenderer } from "./CircleRenderer";
import { CoordinatePlaneRenderer } from "./CoordinatePlaneRenderer";
import { FunctionGraphRenderer } from "./FunctionGraphRenderer";
import { LineGraphRenderer } from "./LineGraphRenderer";
import { NumberLineRenderer } from "./NumberLineRenderer";
import { PieChartRenderer } from "./PieChartRenderer";
import { ScatterPlotRenderer } from "./ScatterPlotRenderer";
import { TableRenderer } from "./TableRenderer";
import { TriangleRenderer } from "./TriangleRenderer";

export function RendererFactory({
  data,
  tableMarkdown,
  visualType
}: {
  data: Record<string, unknown>;
  tableMarkdown?: string;
  visualType: VisualType;
}) {
  switch (visualType) {
    case "table":
      return <TableRenderer data={data} tableMarkdown={tableMarkdown} />;
    case "line_graph":
      return <LineGraphRenderer data={data} />;
    case "bar_graph":
      return <BarGraphRenderer data={data} />;
    case "scatter_plot":
      return <ScatterPlotRenderer data={data} />;
    case "coordinate_plane":
      return <CoordinatePlaneRenderer data={data} />;
    case "function_graph":
      return <FunctionGraphRenderer data={data} />;
    case "triangle":
    case "right_triangle":
    case "rectangle":
      return <TriangleRenderer data={data} visualType={visualType} />;
    case "circle":
      return <CircleRenderer data={data} />;
    case "number_line":
      return <NumberLineRenderer data={data} />;
    case "box_plot":
      return <BoxPlotRenderer data={data} />;
    case "pie_chart":
      return <PieChartRenderer data={data} />;
    case "none":
      return null;
  }
}
