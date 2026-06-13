# Renderer Spec

Visual rendering follows this flow:

```text
VisualRenderer -> validateVisualData -> RendererFactory -> concrete renderer
```

Concrete renderers:

- `TableRenderer`
- `LineGraphRenderer`
- `BarGraphRenderer`
- `ScatterPlotRenderer`
- `CoordinatePlaneRenderer`
- `FunctionGraphRenderer`
- `TriangleRenderer`
- `CircleRenderer`
- `NumberLineRenderer`
- `BoxPlotRenderer`
- `PieChartRenderer`

Design rules:

- Render from `visual_type`, `visual_json`, and `table_markdown`.
- Do not depend on external images.
- Keep renderers tolerant of optional labels and captions.
- Return stable fallback messages instead of crashing the test UI.
- Keep the UI distinct from official Bluebook or College Board interfaces.

Migration:

Deprecated inputs such as `graph_json`, `diagram_json`, `image_definition`, `legacy_visual_data`, and `visual_payload_v1` may be converted during import, but saved questions should use `visual_json`.
