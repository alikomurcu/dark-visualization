# Dark Series - Temporal Graph Visualization

An interactive visualization tool that maps and analyzes the complex temporal relationships and events from the Dark TV series. This project provides both a visual interface for exploring the series' timeline and analytical tools for understanding the intricate connections between events.

## Features

- **Interactive Graph Visualization**
  - Dynamic force-directed graph showing event relationships
  - Zoom and pan capabilities
  - Color-coded events (Regular, Important Trigger, Death)
  - Different edge types for direct and summarized connections
  - Interactive tooltips with detailed event information

- **Data Analysis**
  - Temporal pattern analysis
  - Character involvement tracking
  - World distribution analysis
  - Graph structure analysis
  - Causal loop detection
  - Centrality measures for key events

## Project Structure

```
.
├── css/              # Stylesheets
├── js/              # JavaScript files
│   ├── data_parser.js
│   ├── layout_logic.js
│   ├── visualisation.js
│   └── main.js
├── data/            # Data files
│   ├── Dark_Events.csv
│   └── Dark_Edges.csv
├── images/          # Static images
├── data_analyser.py # Python analysis script
└── index.html       # Main visualization page
```

## Setup and Installation

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd dark-visualization
   ```

2. Set up Python environment (for data analysis):
   ```bash
   python -m venv denv
   source denv/bin/activate  # On Windows: denv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Run the visualization:
   - Open `index.html` in a modern web browser
   - For local development, use a local server (e.g., Python's `http.server` or VS Code's Live Server)

## Usage

### Visualization Interface

1. The main visualization shows events as nodes and their relationships as edges
2. Use mouse wheel to zoom in/out
3. Click and drag to pan
4. Hover over nodes to see detailed event information
5. Use the "Reset View" button to return to the default view

### Data Analysis

Run the Python analysis script to generate a comprehensive report:
```bash
python data_analyser.py
```

This will create a `report.txt` file containing:
- Event distribution across different worlds
- Temporal patterns and time spans
- Character involvement statistics
- Important event analysis
- Graph structure analysis

## Technologies Used

- **Frontend**
  - D3.js v7 for visualization
  - HTML5/CSS3 for interface
  - JavaScript for interactivity

- **Backend Analysis**
  - Python
  - Pandas for data manipulation
  - NetworkX for graph analysis
  - Matplotlib for additional visualizations


## Acknowledgments

- Based on the Dark TV series created by Baran bo Odar and Jantje Friese
- Visualization inspired by the complex temporal relationships in the series
