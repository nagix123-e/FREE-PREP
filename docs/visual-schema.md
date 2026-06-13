# Visual JSON Schema

SAT Practice Simulator renders visuals from CSV data. External official assets are not required.

The active visual columns are:

- `visual_type`
- `visual_json`
- `table_markdown`

`visual_json.type` should match `visual_type`.

## none

Use `visual_type=none` and an empty object:

```json
{}
```

## table

Tables can be represented with `table_markdown`:

```markdown
| x | y |
|---|---|
| 1 | 3 |
| 2 | 6 |
```

They can also be represented with JSON:

```json
{
  "type": "table",
  "headers": ["Week", "Visits"],
  "rows": [["1", "120"], ["2", "135"]]
}
```

## function_graph

Supported equation patterns:

- `y=ax+b`
- `f(x)=ax+b`
- `y=(x-h)^2+k`
- `f(x)=(x-h)^2+k`

Example:

```json
{
  "type": "function_graph",
  "equation": "y=(x-2)^2+4",
  "xMin": -4,
  "xMax": 8
}
```

The renderer draws axes, grid lines, ticks, and the curve. If rendering fails, the app displays `Unable to render graph` instead of a blank canvas.

## coordinate_plane

```json
{
  "type": "coordinate_plane",
  "points": [
    { "x": 2, "y": 3, "label": "P" }
  ],
  "xMin": -5,
  "xMax": 5,
  "yMin": -5,
  "yMax": 5
}
```

## Charts

Line graph:

```json
{
  "type": "line_graph",
  "title": "f(x)",
  "points": [{ "x": 0, "y": 2 }, { "x": 1, "y": 4 }]
}
```

Bar graph:

```json
{
  "type": "bar_graph",
  "bars": [{ "label": "A", "value": 12 }, { "label": "B", "value": 8 }]
}
```

Scatter plot:

```json
{
  "type": "scatter_plot",
  "points": [{ "x": 1, "y": 2 }, { "x": 3, "y": 5 }]
}
```

## Geometry

Supported geometry types include:

- `triangle`
- `right_triangle`
- `rectangle`
- `circle`
- `number_line`
- `box_plot`
- `pie_chart`

Example:

```json
{
  "type": "rectangle",
  "widthLabel": "7",
  "heightLabel": "18"
}
```

## Deprecated Fields

`xRange` and `yRange` are deprecated. Prefer explicit `xMin`, `xMax`, `yMin`, and `yMax` fields when ranges are needed.

Deprecated visual columns such as `graph_json`, `diagram_json`, `image_definition`, `legacy_visual_data`, and `visual_payload_v1` are migration inputs only. New CSV files should use `visual_type`, `visual_json`, and `table_markdown`.
