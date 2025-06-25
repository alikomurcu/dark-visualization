/**
 * Legend rendering module for Dark visualization
 * This file handles the rendering of the in-graph legend
 */

/**
 * Render the in-graph legend
 * @param {Object} zoomGroup - The D3 zoom group to append the legend to
 * @param {Object} layout - The layout object containing temporal boxes
 * @param {Object} LayoutLogic - The LayoutLogic object with constants
 */
function renderGraphLegend(zoomGroup, layout, LayoutLogic) {
    // Use exported legend width or fallback
    const legendWidth = LayoutLogic.LEGEND_WIDTH || 300;
    const legendPadding = LayoutLogic.LEGEND_PADDING || 50;
    const svgHeight = LayoutLogic.FIXED_HEIGHT || 1200;
    // Legend should fill most of the vertical area
    const legendHeight = svgHeight * 0.92;
    const legendX = 0; // Very left
    const legendY = (svgHeight - legendHeight) / 2;
    // Get the last temporal box to position the legend after it
    const temporalBoxes = layout.temporalBoxes;
    const lastBox = temporalBoxes[temporalBoxes.length - 1];
    
    // Create legend group - render it AFTER all other elements to ensure it's on top
    const legendGroup = zoomGroup.append('g')
        .attr('class', 'graph-legend');
        
    // Draw legend box with temporal box styling
    legendGroup.append('rect')
        .attr('class', 'temporal-box')
        .attr('x', legendX)
        .attr('y', legendY)
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .attr('rx', 6)
        .attr('ry', 6);
        
    // Add legend title INSIDE the box
    legendGroup.append('text')
        .attr('class', 'legend-title')
        .attr('x', legendX + legendWidth / 2)
        .attr('y', legendY + 30)
        .attr('text-anchor', 'middle')
        .style('font-size', '18px')
        .style('font-weight', 'bold')
        .style('fill', '#ffffff')
        .text('LEGEND');
    
    // ===== FIXED SPACINGS =====
    const leftPadding = 35;
    const titleOffset = 35;
    const sectionGap = 55; // Increased gap between sections
    const itemGap = 80; // Increased gap between items
    
    // Node dimensions matching the main visualization
    const nodeWidth = 140; // Much wider for better visibility
    const nodeHeight = 60; // Taller for better visibility
    const cornerRadius = 5;
    const edgeLength = 100; // Longer edges for better visibility
    
    // Starting coordinates
    let startX = legendX + leftPadding;
    let currentY = legendY + 60; // Start below legend title
    
    // ===== SECTION 1: NODE BACKGROUNDS =====
    // Section title
    legendGroup.append('text')
        .attr('class', 'legend-section-title')
        .attr('x', startX)
        .attr('y', currentY)
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', '#ffffff')
        .text('Background');
    
    currentY += titleOffset;
    
    // Jonas node - blue background
    legendGroup.append('rect')
        .attr('x', startX)
        .attr('y', currentY - nodeHeight/2)
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('rx', cornerRadius)
        .attr('ry', cornerRadius)
        .attr('fill', '#3498db')
        .attr('stroke', '#121212')
        .attr('stroke-width', '1.5px');
        
    legendGroup.append('text')
        .attr('x', startX + nodeWidth + 10)
        .attr('y', currentY + 5)
        .style('font-size', '13px')
        .style('fill', '#ffffff')
        .text("Jonas's World");
        
    currentY += itemGap;
    
    // Martha node - red background
    legendGroup.append('rect')
        .attr('x', startX)
        .attr('y', currentY - nodeHeight/2)
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('rx', cornerRadius)
        .attr('ry', cornerRadius)
        .attr('fill', '#e74c3c')
        .attr('stroke', '#121212')
        .attr('stroke-width', '1.5px');
        
    legendGroup.append('text')
        .attr('x', startX + nodeWidth + 10)
        .attr('y', currentY + 5)
        .style('font-size', '13px')
        .style('fill', '#ffffff')
        .text("Martha's World");
        
    currentY += itemGap;
    
    // Other character node - green background
    legendGroup.append('rect')
        .attr('x', startX)
        .attr('y', currentY - nodeHeight/2)
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('rx', cornerRadius)
        .attr('ry', cornerRadius)
        .attr('fill', '#2ecc71') 
        .attr('stroke', '#121212')
        .attr('stroke-width', '1.5px');
        
    legendGroup.append('text')
        .attr('x', startX + nodeWidth + 10)
        .attr('y', currentY + 5)
        .style('font-size', '13px')
        .style('fill', '#ffffff')
        .text('Other Character');
        
    currentY += itemGap;
    
    // Important event - yellow/gold background
    legendGroup.append('rect')
        .attr('x', startX)
        .attr('y', currentY - nodeHeight/2)
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('rx', cornerRadius)
        .attr('ry', cornerRadius)
        .attr('fill', '#ffd700')
        .attr('stroke', '#121212')
        .attr('stroke-width', '1.5px');
        
    legendGroup.append('text')
        .attr('x', startX + nodeWidth + 10)
        .attr('y', currentY + 5)
        .style('font-size', '13px')
        .style('fill', '#ffffff')
        .text('Starting Event');
    
    // ===== SECTION 2: NODE BORDERS =====
    currentY += sectionGap;
    
    // Section title
    legendGroup.append('text')
        .attr('class', 'legend-section-title')
        .attr('x', startX)
        .attr('y', currentY)
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', '#ffffff')
        .text('Border');
    
    currentY += titleOffset;
    
    // Death event - purple border
    legendGroup.append('rect')
        .attr('x', startX)
        .attr('y', currentY - nodeHeight/2)
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('rx', cornerRadius)
        .attr('ry', cornerRadius)
        .attr('fill', 'transparent')
        .attr('stroke', '#8e44ad')
        .attr('stroke-width', '3px');
        
    legendGroup.append('text')
        .attr('x', startX + nodeWidth + 10)
        .attr('y', currentY + 5)
        .style('font-size', '13px')
        .style('fill', '#ffffff')
        .text('Death Event');
        
    currentY += itemGap;
    
    // Time Travel event - blue border
    legendGroup.append('rect')
        .attr('x', startX)
        .attr('y', currentY - nodeHeight/2)
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('rx', cornerRadius)
        .attr('ry', cornerRadius)
        .attr('fill', 'transparent')
        .attr('stroke', '#3498db')
        .attr('stroke-width', '3px');
        
    legendGroup.append('text')
        .attr('x', startX + nodeWidth + 10)
        .attr('y', currentY + 5)
        .style('font-size', '13px')
        .style('fill', '#ffffff')
        .text('Time Travel Event');
    
    currentY += itemGap;

    // Missing Person event - orange border
    legendGroup.append('rect')
        .attr('x', startX)
        .attr('y', currentY - nodeHeight/2)
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('rx', cornerRadius)
        .attr('ry', cornerRadius)
        .attr('fill', 'transparent')
        .attr('stroke', '#f39c12')
        .attr('stroke-width', '3px');
        
    legendGroup.append('text')
        .attr('x', startX + nodeWidth + 10)
        .attr('y', currentY + 5)
        .style('font-size', '13px')
        .style('fill', '#ffffff')
        .text('Time Travel Event');

        currentY += itemGap;

        // Romantic event - red border
        legendGroup.append('rect')
            .attr('x', startX)
            .attr('y', currentY - nodeHeight/2)
            .attr('width', nodeWidth)
            .attr('height', nodeHeight)
            .attr('rx', cornerRadius)
            .attr('ry', cornerRadius)
            .attr('fill', 'transparent')
            .attr('stroke', '#e74c3c')
            .attr('stroke-width', '3px');
            
        legendGroup.append('text')
            .attr('x', startX + nodeWidth + 10)
            .attr('y', currentY + 5)
            .style('font-size', '13px')
            .style('fill', '#ffffff')
            .text('Time Travel Event');

    // ===== SECTION 3: EDGE TYPES =====
    currentY += sectionGap;
    
    // Section title
    legendGroup.append('text')
        .attr('class', 'legend-section-title')
        .attr('x', startX)
        .attr('y', currentY)
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', '#ffffff')
        .text('Edges');
    
    currentY += titleOffset;
    
    // Create a subgroup for edges to ensure they're visible
    const edgeGroup = legendGroup.append('g')
        .attr('class', 'legend-edges')
        .style('z-index', '10'); // Ensure edges appear on top
    
    // Time Travel Past - blue edge with glow
    const pastEdgeY = currentY;
    
    // Adding extra edge elements to make the edges more visible
    // Background glow for the edge
    edgeGroup.append('path')
        .attr('d', `M${startX},${pastEdgeY} L${startX + edgeLength},${pastEdgeY}`)
        .attr('stroke', '#3498db')
        .attr('stroke-width', '6px')
        .attr('stroke-opacity', '0.3')
        .attr('filter', 'url(#glow-blue)');
    
    // Main edge line
    edgeGroup.append('path')
        .attr('d', `M${startX},${pastEdgeY} L${startX + edgeLength},${pastEdgeY}`)
        .attr('stroke', '#3498db')
        .attr('stroke-width', '2.5px')
        .attr('marker-end', 'url(#timetravel-past-arrow)')
        .attr('filter', 'url(#glow-blue)');
        
    legendGroup.append('text')
        .attr('x', startX + edgeLength + 10)
        .attr('y', pastEdgeY + 5)
        .style('font-size', '13px')
        .style('fill', '#ffffff')
        .text('Time Travel Past');
        
    currentY += itemGap;
    
    // Time Travel Future - orange edge with glow
    const futureEdgeY = currentY;
    
    // Background glow for the edge
    edgeGroup.append('path')
        .attr('d', `M${startX},${futureEdgeY} L${startX + edgeLength},${futureEdgeY}`)
        .attr('stroke', '#e67e22')
        .attr('stroke-width', '6px')
        .attr('stroke-opacity', '0.3')
        .attr('filter', 'url(#glow-orange)');
    
    // Main edge line
    edgeGroup.append('path')
        .attr('d', `M${startX},${futureEdgeY} L${startX + edgeLength},${futureEdgeY}`)
        .attr('stroke', '#e67e22')
        .attr('stroke-width', '2.5px')
        .attr('marker-end', 'url(#timetravel-future-arrow)')
        .attr('filter', 'url(#glow-orange)');
        
    legendGroup.append('text')
        .attr('x', startX + edgeLength + 10)
        .attr('y', futureEdgeY + 5)
        .style('font-size', '13px')
        .style('fill', '#ffffff')
        .text('Time Travel Future');
}

function renderLegendToSVG(svgSelection, layout, LayoutLogic, options = {}) {
    const offsetX = options.x || 0;
    const offsetY = options.y || 50;

    const temporalBoxes = layout.temporalBoxes;
    const lastBox = temporalBoxes[temporalBoxes.length - 1];

    const legendGroup = svgSelection.append('g')
        .attr('class', 'legend-export')
        .attr('transform', `translate(${offsetX}, ${offsetY})`);

    const legendWidth = 280;
    const legendHeight = lastBox.height * 0.92;
    const legendX = 0;
    const legendY = 0;

    // Legend Box
    legendGroup.append('rect')
        .attr('class', 'temporal-box')
        .attr('x', legendX)
        .attr('y', legendY)
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .attr('rx', 6)
        .attr('ry', 6);

    // Title
    legendGroup.append('text')
        .attr('class', 'legend-title')
        .attr('x', legendX + legendWidth / 2)
        .attr('y', legendY + 30)
        .attr('text-anchor', 'middle')
        .style('font-size', '18px')
        .style('font-weight', 'bold')
        .style('fill', '#ffffff')
        .text('LEGEND');

    // Layout constants
    const leftPadding = 35;
    const titleOffset = 35;
    const sectionGap = 55;
    const itemGap = 80;
    const nodeWidth = 140;
    const nodeHeight = 60;
    const cornerRadius = 5;
    const edgeLength = 100;

    let startX = legendX + leftPadding;
    let currentY = legendY + 60;

    // === Section: Backgrounds ===
    legendGroup.append('text')
        .attr('x', startX)
        .attr('y', currentY)
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', '#ffffff')
        .text('Background');

    currentY += titleOffset;

    const nodeData = [
        { label: "Jonas's World", fill: '#3498db' },
        { label: "Martha's World", fill: '#e74c3c' },
        { label: 'Other Character', fill: '#2ecc71' },
        { label: 'Starting Event', fill: '#ffd700' },
    ];

    nodeData.forEach(node => {
        legendGroup.append('rect')
            .attr('x', startX)
            .attr('y', currentY - nodeHeight / 2)
            .attr('width', nodeWidth)
            .attr('height', nodeHeight)
            .attr('rx', cornerRadius)
            .attr('ry', cornerRadius)
            .attr('fill', node.fill)
            .attr('stroke', '#121212')
            .attr('stroke-width', '1.5px');

        legendGroup.append('text')
            .attr('x', startX + nodeWidth + 10)
            .attr('y', currentY + 5)
            .style('font-size', '13px')
            .style('fill', '#ffffff')
            .text(node.label);

        currentY += itemGap;
    });

    // === Section: Borders ===
    currentY += sectionGap;
    legendGroup.append('text')
        .attr('x', startX)
        .attr('y', currentY)
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', '#ffffff')
        .text('Border');

    currentY += titleOffset;

    const borderData = [
        { label: 'Death Event', color: '#8e44ad' },
        { label: 'Time Travel Event', color: '#3498db' },
        { label: 'Missing Person', color: '#f39c12' },
        { label: 'Romantic Event', color: '#e74c3c' },
    ];

    borderData.forEach(node => {
        legendGroup.append('rect')
            .attr('x', startX)
            .attr('y', currentY - nodeHeight / 2)
            .attr('width', nodeWidth)
            .attr('height', nodeHeight)
            .attr('rx', cornerRadius)
            .attr('ry', cornerRadius)
            .attr('fill', 'transparent')
            .attr('stroke', node.color)
            .attr('stroke-width', '3px');

        legendGroup.append('text')
            .attr('x', startX + nodeWidth + 10)
            .attr('y', currentY + 5)
            .style('font-size', '13px')
            .style('fill', '#ffffff')
            .text(node.label);

        currentY += itemGap;
    });

    // === Section: Edges ===
    currentY += sectionGap;
    legendGroup.append('text')
        .attr('x', startX)
        .attr('y', currentY)
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', '#ffffff')
        .text('Edges');

    currentY += titleOffset;

    const edgeData = [
        { label: 'Time Travel Past', color: '#3498db', marker: 'url(#timetravel-past-arrow)', glow: 'url(#glow-blue)' },
        { label: 'Time Travel Future', color: '#e67e22', marker: 'url(#timetravel-future-arrow)', glow: 'url(#glow-orange)' }
    ];

    edgeData.forEach(edge => {
        const y = currentY;

        legendGroup.append('path')
            .attr('d', `M${startX},${y} L${startX + edgeLength},${y}`)
            .attr('stroke', edge.color)
            .attr('stroke-width', '6px')
            .attr('stroke-opacity', '0.3')
            .attr('filter', edge.glow);

        legendGroup.append('path')
            .attr('d', `M${startX},${y} L${startX + edgeLength},${y}`)
            .attr('stroke', edge.color)
            .attr('stroke-width', '2.5px')
            .attr('marker-end', edge.marker)
            .attr('filter', edge.glow);

        legendGroup.append('text')
            .attr('x', startX + edgeLength + 10)
            .attr('y', y + 5)
            .style('font-size', '13px')
            .style('fill', '#ffffff')
            .text(edge.label);

        currentY += itemGap;
    });
}

// Export the function to be used in visualisation.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { renderGraphLegend };
}
