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
    // Get the last temporal box to position the legend after it
    const temporalBoxes = layout.temporalBoxes;
    const lastBox = temporalBoxes[temporalBoxes.length - 1];
    
    // Create legend group - render it AFTER all other elements to ensure it's on top
    const legendGroup = zoomGroup.append('g')
        .attr('class', 'graph-legend');
        
    // ===== FIXED DIMENSIONS FOR CLEAR LAYOUT =====
    const legendWidth = 250;  // Wider box for better spacing
    const legendHeight = lastBox.height * 0.85;
    const legendX = lastBox.x + lastBox.width + LayoutLogic.BOX_SPACING;
    const legendY = lastBox.y + (lastBox.height - legendHeight) / 2;
    
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
    const leftPadding = 25;
    const titleOffset = 35;
    const sectionGap = 45;
    const itemGap = 50;
    const nodeWidth = 30;
    const nodeHeight = 20;
    const cornerRadius = 5;
    const edgeLength = 80;
    
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
        .style('font-size', '12px')
        .style('fill', '#ffffff')
        .text('Jonas');
        
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
        .style('font-size', '12px')
        .style('fill', '#ffffff')
        .text('Martha');
        
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
        .style('font-size', '12px')
        .style('fill', '#ffffff')
        .text('Other');
        
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
        .style('font-size', '12px')
        .style('fill', '#ffffff')
        .text('Important');
    
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
        .attr('stroke-width', '2px');
        
    legendGroup.append('text')
        .attr('x', startX + nodeWidth + 10)
        .attr('y', currentY + 5)
        .style('font-size', '12px')
        .style('fill', '#ffffff')
        .text('Death');
        
    currentY += itemGap;
    
    // Time Travel event - orange border
    legendGroup.append('rect')
        .attr('x', startX)
        .attr('y', currentY - nodeHeight/2)
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('rx', cornerRadius)
        .attr('ry', cornerRadius)
        .attr('fill', 'transparent')
        .attr('stroke', '#ff9800')
        .attr('stroke-width', '2px');
        
    legendGroup.append('text')
        .attr('x', startX + nodeWidth + 10)
        .attr('y', currentY + 5)
        .style('font-size', '12px')
        .style('fill', '#ffffff')
        .text('T.Travel');
    
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
    
    // Time Travel Past - blue edge with glow
    const pastEdgeY = currentY;
    legendGroup.append('path')
        .attr('d', `M${startX},${pastEdgeY} L${startX + edgeLength},${pastEdgeY}`)
        .attr('stroke', '#3498db')
        .attr('stroke-width', '2px')
        .attr('marker-end', 'url(#timetravel-past-arrow)')
        .attr('filter', 'url(#glow-blue)');
        
    legendGroup.append('text')
        .attr('x', startX + edgeLength + 10)
        .attr('y', pastEdgeY + 5)
        .style('font-size', '12px')
        .style('fill', '#ffffff')
        .text('Time Travel Past');
        
    currentY += itemGap;
    
    // Time Travel Future - orange edge with glow
    const futureEdgeY = currentY;
    legendGroup.append('path')
        .attr('d', `M${startX},${futureEdgeY} L${startX + edgeLength},${futureEdgeY}`)
        .attr('stroke', '#e67e22')
        .attr('stroke-width', '2px')
        .attr('marker-end', 'url(#timetravel-future-arrow)')
        .attr('filter', 'url(#glow-orange)');
        
    legendGroup.append('text')
        .attr('x', startX + edgeLength + 10)
        .attr('y', futureEdgeY + 5)
        .style('font-size', '12px')
        .style('fill', '#ffffff')
        .text('Time Travel Future');
}

// Export the function to be used in visualisation.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { renderGraphLegend };
}