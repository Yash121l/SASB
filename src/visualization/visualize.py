"""
Convenience CLI for regenerating the interactive Plotly dashboards without
running the entire analytical pipeline.
"""

from __future__ import annotations

from src.analysis.analyze import _ensure_dirs, create_visualizations, load_datasets


def main() -> None:
    _ensure_dirs()
    panel, _, openaq_city = load_datasets()
    create_visualizations(panel, openaq_city)


if __name__ == "__main__":
    main()
