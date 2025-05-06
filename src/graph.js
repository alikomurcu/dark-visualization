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

  // Extract unique years and group nodes by year
  const yearGroups = d3.groups(nodes, d => d.parsedDate.getFullYear());

  // Set the gap (in pixels) between year boxes
  const yearGap = 30;

  // Calculate year box positions and widths with gaps
  let prevX2 = null;
  const yearBoxes = yearGroups.map(([year, nodesInYear], i, arr) => {
    // Find min/max date for this year
    const minDate = d3.min(nodesInYear, d => d.parsedDate);
    const maxDate = d3.max(nodesInYear, d => d.parsedDate);

    // x positions for min/max date in this year
    let x1 = xScale(minDate);
    let x2 = xScale(maxDate);

    // If only one event, give a minimum width
    if (x1 === x2) {
      x1 -= 20;
      x2 += 20;
    }

    // Optionally, expand the box a bit for visual clarity
    x1 -= 10;
    x2 += 10;

    // Add gap from previous box
    if (prevX2 !== null && x1 < prevX2 + yearGap) {
      x1 = prevX2 + yearGap;
      x2 = x1 + (x2 - x1);
    }
    prevX2 = x2;

    return {
      year,
      x: x1,
      width: x2 - x1
    };
  });

  // Map worlds to y positions
  const worldPositions = {};
  worlds.forEach((w, i) => {
    worldPositions[w] = yScale(w);
  });

  // Place nodes inside their year box, spaced horizontally by event order
  yearBoxes.forEach(box => {
    // Get nodes for this year, sort by date
    const nodesInYear = nodes.filter(n => n.parsedDate.getFullYear() === box.year)
      .sort((a, b) => a.parsedDate - b.parsedDate);

    // Horizontal spacing within the box
    const spacing = box.width / (nodesInYear.length + 1);

    nodesInYear.forEach((node, i) => {
      node.x = box.x + spacing * (i + 1);
      node.y = worldPositions[node.world];
    });
  });

  // Draw year boxes (behind everything)
  g.selectAll(".year-box")
    .data(yearBoxes)
    .enter()
    .append("rect")
    .attr("class", "year-box")
    .attr("x", d => d.x)
    .attr("y", 0)
    .attr("width", d => d.width)
    .attr("height", innerHeight)
    .attr("fill", "#444")
    .attr("opacity", 0.15)
    .lower();

  // Optionally, add year labels at the top
  g.selectAll(".year-label")
    .data(yearBoxes)
    .enter()
    .append("text")
    .attr("class", "year-label")
    .attr("x", d => d.x + d.width / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .attr("fill", "#bbb")
    .attr("font-size", "16px")
    .text(d => d.year);

  // Draw links (straight lines between nodes)
  const link = g.selectAll(".link")
    .data(links)
    .enter().append("line")
    .attr("class", "link")
    .attr("stroke", "#999")
    .attr("stroke-opacity", 0.6)
    .attr("stroke-width", 2)
    .attr("x1", d => {
      const source = nodes.find(n => n.id === d.source || n.id === d.source.id);
      return source ? source.x : 0;
    })
    .attr("y1", d => {
      const source = nodes.find(n => n.id === d.source || n.id === d.source.id);
      return source ? source.y : 0;
    })
    .attr("x2", d => {
      const target = nodes.find(n => n.id === d.target || n.id === d.target.id);
      return target ? target.x : 0;
    })
    .attr("y2", d => {
      const target = nodes.find(n => n.id === d.target || n.id === d.target.id);
      return target ? target.y : 0;
    });

  // Draw nodes
  const node = g.selectAll(".node")
    .data(nodes)
    .enter().append("g")
    .attr("class", "node")
    .attr("transform", d => `translate(${d.x},${d.y})`);

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

  // Add axes
  g.append("g")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(d3.axisBottom(xScale));

  g.append("g")
    .call(d3.axisLeft(yScale));
});
