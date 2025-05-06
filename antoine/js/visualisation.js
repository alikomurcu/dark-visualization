/**
 * Visualization Module for Dark Series Graph
 * Handles rendering of graph components using D3.js
 */

const Visualization = (() => {
    // Private variables
    let svg;
    let zoomGroup;
    let tooltip;
    let data = {};
    let layout = {};
    
    /**
     * Initialize the visualization
     * @param {Object} graphData - Object containing events, edges, and time ranges
     */
    const initialize = graphData => {
        // Store data reference
        data = graphData;
        
        // Get SVG element
        svg = d3.select('#graph');
        
        // Initialize layout
        LayoutLogic.initialize(svg);
        
        // Get zoom group
        zoomGroup = svg.select('g.zoom-group');
        
        // Get tooltip element
        tooltip = d3.select('#tooltip');
        
        // Calculate layout
        layout = LayoutLogic.calculateLayout(data);
        
        // Set up event handlers
        setupEventHandlers();
        
        // Render visualization
        render();
    };
    
    /**
     * Set up event handlers
     */
    const setupEventHandlers = () => {
        // Reset zoom button
        d3.select('#reset-zoom').on('click', LayoutLogic.resetZoom);
        
        // Window resize handler
        window.addEventListener('resize', () => {
            LayoutLogic.updateDimensions();
            layout = LayoutLogic.calculateLayout(data);
            render();
        });
    };
    
    /**
     * Render the visualization
     */
    const render = () => {
        // Clear previous content
        zoomGroup.selectAll('*').remove();
        
        // Render components
        renderStartArea();
        renderTemporalBoxes();
        renderSwimlanes();
        renderTransitions();
        renderEdges();
        renderNodes();
    };
    
    /**
     * Render the start nodes area (removed as start nodes are now positioned near their target boxes)
     */
    const renderStartArea = () => {
        // No longer needed as start nodes are positioned near their target boxes
    };
    
    /**
     * Render temporal boxes
     */
    const renderTemporalBoxes = () => {
        // Create group for temporal boxes
        const boxesGroup = zoomGroup.append('g')
            .attr('class', 'temporal-boxes');
        
        // Draw temporal boxes
        boxesGroup.selectAll('.temporal-box')
            .data(layout.temporalBoxes)
            .enter()
            .append('rect')
            .attr('class', 'temporal-box')
            .attr('x', d => d.x)
            .attr('y', d => d.y)
            .attr('width', d => d.width)
            .attr('height', d => d.height);
        
        // Add labels
        boxesGroup.selectAll('.temporal-box-label')
            .data(layout.temporalBoxes)
            .enter()
            .append('text')
            .attr('class', 'temporal-box-label')
            .attr('x', d => d.x + d.width / 2)
            .attr('y', d => d.y - 15)
            .text(d => `${d.start}-${d.end}`);
    };
    
    /**
     * Render swimlanes
     */
    const renderSwimlanes = () => {
        // Create group for swimlanes
        const swimlanesGroup = zoomGroup.append('g')
            .attr('class', 'swimlanes');
        
        // Iterate through each temporal box's swimlanes
        layout.swimlanes.forEach(swimlane => {
            // Draw swimlane rectangles
            swimlanesGroup.selectAll(`.swimlane-${swimlane.timeRange.start}`)
                .data(swimlane.lanes)
                .enter()
                .append('rect')
                .attr('class', 'swimlane')
                .attr('x', d => d.x)
                .attr('y', d => d.y)
                .attr('width', d => d.width)
                .attr('height', d => d.height);
            
            // Add labels
            swimlanesGroup.selectAll(`.swimlane-label-${swimlane.timeRange.start}`)
                .data(swimlane.lanes)
                .enter()
                .append('text')
                .attr('class', 'swimlane-label')
                .attr('x', d => d.x + 5)
                .attr('y', d => d.y + 15)
                .text(d => d.shortName);
        });
    };
    
    /**
     * Render smooth transitions between swimlanes
     */
    const renderTransitions = () => {
        // Create group for transitions
        const transitionsGroup = zoomGroup.append('g')
            .attr('class', 'transitions');
        
        // Generate transitions for each character type between adjacent temporal boxes
        // Only create smooth transitions for Jonas and Martha lanes
        const characterTypes = ['jonas', 'martha'];
        
        for (let i = 0; i < layout.swimlanes.length - 1; i++) {
            const sourceSwimlane = layout.swimlanes[i];
            const targetSwimlane = layout.swimlanes[i + 1];
            
            characterTypes.forEach(type => {
                // Find matching lanes in source and target
                const sourceLane = sourceSwimlane.lanes.find(lane => lane.type === type);
                const targetLane = targetSwimlane.lanes.find(lane => lane.type === type);
                
                if (sourceLane && targetLane) {
                    // Draw smooth transition path
                    transitionsGroup.append('path')
                        .attr('class', `transition-path ${type}`)
                        .attr('d', LayoutLogic.generateTransitionPath(sourceLane, targetLane));
                }
            });
        }
    };
    
    /**
     * Render edges between nodes
     */
    const renderEdges = () => {
        // Create group for edges
        const edgesGroup = zoomGroup.append('g')
            .attr('class', 'edges');
        
        // Draw edges
        data.edges.forEach(edge => {
            const sourcePos = layout.nodePositions[edge.source];
            const targetPos = layout.nodePositions[edge.target];
            
            if (sourcePos && targetPos) {
                const isSummarized = DataParser.isSummarizedEdge(edge);
                
                edgesGroup.append('path')
                    .attr('class', isSummarized ? 'summarized-edge' : 'edge')
                    .attr('d', LayoutLogic.generateEdgePath(sourcePos, targetPos, isSummarized))
                    .attr('marker-end', 'url(#arrow)');
            }
        });
    };
    
    /**
     * Render nodes
     */
    const renderNodes = () => {
        // Create group for nodes
        const nodesGroup = zoomGroup.append('g')
            .attr('class', 'nodes');
        
        // Draw nodes
        nodesGroup.selectAll('.node')
            .data(data.events)
            .enter()
            .append('circle')
            .attr('class', d => {
                const primaryChar = DataParser.getPrimaryCharacter(d);
                let classes = `node ${primaryChar}`;
                if (d.importantTrigger) classes += ' important';
                if (d.death) classes += ' death';
                
                // Add start node class for nodes with no incoming edges
                const position = layout.nodePositions[d.id];
                if (position && position.lane === 'start') {
                    classes += ' start';
                }
                
                return classes;
            })
            .attr('r', d => {
                // Make start nodes and important nodes slightly larger
                const position = layout.nodePositions[d.id];
                if (position && position.lane === 'start') return 8;
                return d.importantTrigger ? 8 : 6;
            })
            .attr('cx', d => layout.nodePositions[d.id]?.x || 0)
            .attr('cy', d => layout.nodePositions[d.id]?.y || 0)
            .on('mouseover', showTooltip)
            .on('mouseout', hideTooltip);
    };
    
    /**
     * Show tooltip for a node
     * @param {Event} event - Mouse event
     * @param {Object} d - Node data
     */
    const showTooltip = (event, d) => {
        // Format date
        const dateFormatter = new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        // Update tooltip content
        d3.select('#tooltip-id').text(`Event ${d.id}`);
        d3.select('#tooltip-date').text(dateFormatter.format(d.date));
        d3.select('#tooltip-description').text(d.description);
        d3.select('#tooltip-characters').text(`Characters: ${d.characters ? d.characters.join(', ') : 'None'}`);
        d3.select('#tooltip-world').text(`World: ${d.world}`);
        
        // Position tooltip near the mouse
        const tooltipWidth = tooltip.node().offsetWidth;
        const tooltipHeight = tooltip.node().offsetHeight;
        const xPosition = event.pageX + 10;
        const yPosition = event.pageY - tooltipHeight / 2;
        
        // Ensure tooltip stays within viewport
        const adjustedX = Math.min(xPosition, window.innerWidth - tooltipWidth - 20);
        const adjustedY = Math.max(10, Math.min(yPosition, window.innerHeight - tooltipHeight - 10));
        
        tooltip
            .style('left', `${adjustedX}px`)
            .style('top', `${adjustedY}px`)
            .style('display', 'block');
    };
    
    /**
     * Hide tooltip
     */
    const hideTooltip = () => {
        tooltip.style('display', 'none');
    };
    
    // Public API
    return {
        initialize
    };
})();
