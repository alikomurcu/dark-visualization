# Dark Visualization Project

This project visualizes characters and their relationships from the Dark series using D3.js. The visualization is built to help users understand the complex interactions and events that shape the narrative of the series.

## Project Structure

The project is organized as follows:

```
dark-visualization
├── data
│   ├── Dark_GD_Contest_Edges.csv
│   └── Dark_GD_Contest_Events.csv
├── src
│   ├── graph.js
│   └── styles.css
├── index.html
└── README.md
```

### Data Files

- **data/Dark_GD_Contest_Edges.csv**: Contains the edges of the graph, representing relationships between characters. It includes columns for ID, Source, Target, Type, and Description.

- **data/Dark_GD_Contest_Events.csv**: Contains events related to the characters and their interactions. It includes columns for ID, World, Date, Important Trigger, Death, Description, and Characters.

### Source Files

- **src/graph.js**: Contains the JavaScript code to create the graph visualization using D3.js. It defines the nodes (characters) and links (relationships) based on the data from the CSV files. It also handles the D3 force simulation for the graph layout.

- **src/styles.css**: Contains the CSS styles for the visualization. It defines styles for nodes, links, and the overall SVG canvas.

### HTML File

- **index.html**: The main HTML file that loads the D3.js library, the graph.js script, and the styles.css file. It contains an SVG element where the graph will be rendered.

## Getting Started

1. **Clone the Repository**: Clone this repository to your local machine using `git clone <repository-url>`.

2. **Open the Project**: Navigate to the project directory.

3. **Open index.html**: Open the `index.html` file in a web browser to view the visualization.

4. **Explore the Data**: You can modify the CSV files in the `data` directory to add or change characters and relationships.

## Goals

The goal of this project is to provide an interactive visualization that helps users explore the intricate relationships and events in the Dark series, enhancing their understanding of the storyline and character dynamics.