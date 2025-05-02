const svg = d3.select("svg");
const width = +svg.attr("width");
const height = +svg.attr("height");

const margin = { top: 50, right: 50, bottom: 50, left: 100 };
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

const parseDate = d3.timeParse("%d-%m-%Y");
const color = d3.scaleOrdinal(d3.schemeTableau10);

// Add a group for zooming and panning
const zoomGroup = svg.append("g");

// Enable zooming and panning
svg.call(
  d3.zoom()
    .scaleExtent([0.5, 5]) // Set zoom limits
    .on("zoom", (event) => {
      zoomGroup.attr("transform", event.transform); // Apply zoom/pan transformations
    })
);

d3.json("data/dark_graph_data.json").then(data => {
  const nodes = data.nodes.map(d => ({
    ...d,
    parsedDate: parseDate(d.date),
    x: null, // Placeholder for force simulation
    y: null  // Placeholder for force simulation
  })).filter(d => d.parsedDate);

  const links = data.links;

  const xScale = d3.scaleTime()
    .domain(d3.extent(nodes, d => d.parsedDate))
    .range([0, innerWidth]);

  const worlds = [...new Set(nodes.map(d => d.world))];
  const yScale = d3.scalePoint()
    .domain(worlds)
    .range([0, innerHeight])
    .padding(1);

  const g = zoomGroup.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Initialize node positions based on the overview
  nodes.forEach(node => {
    node.x = xScale(node.parsedDate);
    node.y = yScale(node.world);
  });

  // Create a force simulation
  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(50)) // Link force
    .force("charge", d3.forceManyBody().strength(-50)) // Repulsion force
    .force("x", d3.forceX(d => xScale(d.parsedDate)).strength(0.1)) // Pull nodes to their x positions
    .force("y", d3.forceY(d => yScale(d.world)).strength(0.1)) // Pull nodes to their y positions
    .on("tick", ticked); // Update positions on each tick

  // Draw edges (links)
  const link = g.selectAll(".link")
    .data(links)
    .enter().append("line")
    .attr("class", "link")
    .attr("stroke", "#999")
    .attr("stroke-opacity", 0.6)
    .attr("stroke-width", 2);

  // Draw nodes
const node = g.selectAll(".node")
    .data(nodes)
    .enter().append("g")
    .attr("class", "node")
.call(drag(simulation)); // Enable dragging

  node.append("circle")
    .attr("r", d => d.death ? 8 : d.important ? 6 : 4)
    .attr("fill", d => color(d.world));

  node.append("title")
    .text(d => `${d.date} (${d.world})\n${d.description}`);

  node.append("text")
    .attr("x", 10)
    .attr("y", 3)
    .attr("font-size", "10px")
    .attr("fill", "white")
    .text(d => d.id);

  // Update positions on each simulation tick
  function ticked() {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node
      .attr("transform", d => `translate(${d.x},${d.y})`);
  }

  // Dragging behavior
  function drag(simulation) {
    return d3.drag()
      .on("start", event => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      })
      .on("drag", event => {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      })
      .on("end", event => {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      });
  }

  // Add axes
  g.append("g")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(d3.axisBottom(xScale));

    g.append("g")
    .call(d3.axisLeft(yScale));
});
