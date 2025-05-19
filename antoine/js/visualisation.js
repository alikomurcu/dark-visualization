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
     * Render edges between nodes with improved edge bundling
     */
    const renderEdges = () => {
        // Create group for edges
        const edgesGroup = zoomGroup.append('g')
            .attr('class', 'edges');
        
        // Group edges by similar paths to improve bundling
        const edgeGroups = {};
        
        // Process edges and group them by source/target temporal boxes
        data.edges.forEach(edge => {
            const sourcePos = layout.nodePositions[edge.source];
            const targetPos = layout.nodePositions[edge.target];
            
            // Skip invalid edges
            if (!sourcePos || !targetPos) return;
            
            // Create a key based on the temporal boxes to group similar edges
            const sourceTimeRange = sourcePos.timeRange;
            const targetTimeRange = targetPos.timeRange;
            
            // Create key for grouping similar edges
            let key;
            if (sourceTimeRange === targetTimeRange) {
                // For edges within same time range, group by characters/lanes
                key = `${sourceTimeRange}_${sourcePos.lane}_${targetPos.lane}`;
            } else {
                // For edges between time ranges, group by the time ranges themselves
                key = `${sourceTimeRange}_${targetTimeRange}`;
            }
            
            if (!edgeGroups[key]) {
                edgeGroups[key] = [];
            }
            
            edgeGroups[key].push({
                edge,
                source: sourcePos,
                target: targetPos
            });
        });
        
        // Process edge groups
        Object.values(edgeGroups).forEach(group => {
            // Sort edges within the group for more consistent bundling
            group.sort((a, b) => {
                // Sort by vertical position to help with bundling
                return (a.source.y + a.target.y) - (b.source.y + b.target.y);
            });
            
            // Create paths for each edge in the group with bundling effect
            group.forEach((edge, index) => {
                const { source, target } = edge;
                const isSummarized = DataParser.isSummarizedEdge(edge.edge);
                
                // Calculate path with bundling adjustments
                let pathData;
                
                // Check if source and target are in the same temporal box
                if (source.timeRange === target.timeRange) {
                    // Use simple curved path for edges within same temporal box
                    let curveHeight = 30; // Default curve height
                    
                    // Adjust curve height based on vertical distance
                    const verticalDistance = Math.abs(target.y - source.y);
                    if (verticalDistance < 40) {
                        curveHeight = Math.max(15, verticalDistance * 0.5);
                    }
                    
                    // For edges in same lane, use more curved paths
                    if (source.lane === target.lane) {
                        const midX = (source.x + target.x) / 2;
                        const controlY = (source.y + target.y) / 2 - curveHeight;
                        
                        pathData = `M ${source.x} ${source.y} Q ${midX} ${controlY} ${target.x} ${target.y}`;
                    } else {
                        // For edges between different lanes in same temporal box
                        // Use cubic curve for smoother path
                        const dx = target.x - source.x;
                        const dy = target.y - source.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        // Calculate control points
                        const curveStrength = Math.min(0.4, Math.max(0.2, distance / 400));
                        const cp1x = source.x + dx * 0.25;
                        const cp1y = source.y - distance * curveStrength;
                        const cp2x = source.x + dx * 0.75;
                        const cp2y = target.y - distance * curveStrength;
                        
                        pathData = `M ${source.x} ${source.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${target.x} ${target.y}`;
                    }
                } else {
                    // For edges between different temporal boxes, create more pronounced bundled effect
                    // Calculate fixed control points for consistent bundling
                    const dx = target.x - source.x;
                    
                    // Use a fixed central channel for bundling
                    // This creates a strong visual bundling effect
                    const sourceBoxIndex = layout.temporalBoxes.findIndex(b => b.start === source.timeRange);
                    const targetBoxIndex = layout.temporalBoxes.findIndex(b => b.start === target.timeRange);
                    
                    // Find the temporal boxes, with safety checks
                    const sourceBox = layout.temporalBoxes[sourceBoxIndex];
                    const targetBox = layout.temporalBoxes[targetBoxIndex];
                    
                    // Check if the boxes exist
                    let useSimpleCurve = false;
                    if (!sourceBox || !targetBox) {
                        useSimpleCurve = true;
                    }
                    
                    if (useSimpleCurve) {
                        // Use a simple curved path when boxes can't be found
                        const midX = (source.x + target.x) / 2;
                        const midY = (source.y + target.y) / 2;
                        const controlOffset = Math.min(150, Math.abs(target.x - source.x) * 0.3);
                        
                        pathData = `M ${source.x} ${source.y} ` +
                                   `Q ${midX} ${midY - controlOffset} ` +
                                   `${target.x} ${target.y}`;
                    } else {
                        // For the large visualization, use much more pronounced bundling
                        // Calculate the midpoint between the boxes (where the bundle should go through)
                        const midX = sourceBox.x + sourceBox.width + (targetBox.x - (sourceBox.x + sourceBox.width)) / 2;
                        
                        // Create a vertical "channel" where all edges between these boxes will pass through
                        // For large visualization (12288x1200), we need more pronounced bundling
                        const verticalChannelSize = 250; // Larger channel for more visual separation
                        
                        // Base position of the channel - place it above or below based on source/target positions
                        const avgY = (source.y + target.y) / 2;
                        const channelCenterY = avgY < height / 2 ? 
                                               Math.max(100, avgY - verticalChannelSize) : 
                                               Math.min(height - 100, avgY + verticalChannelSize);
                        
                        // Use group index to create multiple parallel channels if needed
                        const groupSizeLimit = 10; // Maximum edges per channel
                        const channelIndex = Math.floor(index / groupSizeLimit);
                        const channelOffset = channelIndex * 40; // Offset for multiple channels
                        
                        // Calculate edge position within its channel
                        const withinChannelIndex = index % groupSizeLimit;
                        const edgeSeparation = 15; // More space between edges in large visualization
                        const bundleOffset = (withinChannelIndex - (Math.min(group.length, groupSizeLimit) - 1) / 2) * edgeSeparation;
                        
                        // Final control point Y position
                        const controlY = channelCenterY + channelOffset + bundleOffset;
                        
                        // Create a more exaggerated path for the large visualization 
                        // with more space between control points
                        pathData = `M ${source.x} ${source.y} ` +
                                   `C ${source.x + dx * 0.15} ${source.y}, ` +
                                   `${midX - 120} ${controlY}, ` +
                                   `${midX} ${controlY} ` +
                                   `S ${midX + 120} ${controlY}, ` +
                                   `${target.x - dx * 0.15} ${target.y}, ` +
                                   `${target.x} ${target.y}`;
                    }
                }
                
                // Create path element
                edgesGroup.append('path')
                    .attr('class', isSummarized ? 'summarized-edge' : 'edge')
                    .attr('d', pathData)
                    .attr('marker-end', 'url(#arrow)');
            });
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
