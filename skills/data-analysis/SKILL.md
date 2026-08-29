# Data Analysis Skill

Domain knowledge and best practices for data inspection, transformation, and analysis.

## Overview

Handles dataset inspection, statistical analysis, transformation, and visualization.

## Data Analysis Workflow

```
User goal (e.g., "Analyze sales trends")
  ↓
Inspect dataset (shape, columns, types)
  ↓
Clean data (missing values, outliers, type issues)
  ↓
Exploratory analysis (distributions, patterns)
  ↓
Form hypothesis
  ↓
Statistical analysis / modeling
  ↓
Visualize results
  ↓
Interpret findings
  ↓
Report results
```

## Capabilities

- Inspect dataset (rows, columns, types, schema)
- Read tabular data (CSV, JSON, database)
- Clean data (handle nulls, outliers, type conversion)
- Transform data (filter, aggregate, pivot, join)
- Calculate statistics (mean, median, std dev, correlation)
- Detect patterns (trends, clusters, anomalies)
- Visualize data (charts, plots, heatmaps)
- Export results

## Common Data Tasks

### Descriptive Analytics

- What does the data look like?
- What are the distributions?
- What are the basic statistics?

### Diagnostic Analytics

- Why did something happen?
- What patterns exist?
- Where are the outliers?

### Predictive Analytics

- What will happen next?
- What are the trends?

### Prescriptive Analytics

- What should we do?
- What action is optimal?

## Data Quality Checks

- Missing values (nulls, NaNs)
- Type mismatches (string vs. numeric)
- Out-of-range values
- Duplicates
- Inconsistent formatting
- Encoding issues

## Capability Mapping

```
Task: "Analyze this sales dataset"
  ↓
Skill knowledge: Data analysis methodology
  ↓
Capabilities needed:
  - inspect_directory
  - read_file (CSV, JSON)
  - (future) run_python (pandas, numpy)
  - (future) visualize_data
```

## Safety Notes

- Do not modify original data without backup
- Clearly document transformations applied
- Verify results make sense (sanity checks)
- Distinguish correlation from causation
- Consider data privacy when sharing results
