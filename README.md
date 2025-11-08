# Noditor - Graph Lib

A modular graph data processing toolkit with chainable pipelines, reusable processors, and utilities for filtering, transforming, and applying custom formulas to nodes and edges, built with [graphology](https://graphology.github.io/).

By [Studio Webux](https://studiowebux.com)

## Why?

Needed a flexible way to build items for my game with PRNG-based attributes and modular processing pipelines.

## Quick Start

Check `example/` and `html/` directories.

### Run Example

```bash
deno run --allow-write example/basic_processing_sword.ts
```

### View Graph

> You need to update the `index.html` to match your data structure, like adding color, showing data, etc. (around line ~155-212)

```bash
python -m http.server -d html 8003
```

## Advanced Examples

> When you need to control each step or prefer flexibility, you can alter the data directly in the graph or use the pipeline approach.

**Manual Function Calling:**

```bash
deno run --allow-write example/advanced_processing_sword.ts
```

**Using Pipeline Approach:**

```bash
deno run --allow-write example/processing_prng_attributes_1.ts
deno run --allow-write example/processing_prng_attributes_2.ts
deno run --allow-write example/processing_prng_attributes_3.ts
```
