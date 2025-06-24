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
        // Reset nodes button
        d3.select('#reset-nodes').on('click', () => {
            localStorage.removeItem('dark-graph-node-positions');
            layout = LayoutLogic.calculateLayout(data);
            render();
        });
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
        
        // Create a specific group for time travel edges that will be rendered first (beneath everything)
        zoomGroup.append('g')
            .attr('class', 'timetravel-edges');
            
        // Render components in order of layering (bottom to top)
        renderStartArea();
        renderEdges(); // Render edges first (regular edges go above time travel edges but below boxes)
        renderTemporalBoxes();
        renderSwimlanes();
        renderTransitions();
        renderNodes();
        renderCharacterImages(); // Add character images
        
        // Render the legend at the end to ensure it's on top
        // Call the external legend function from legend.js
        renderGraphLegend(zoomGroup, layout, LayoutLogic);
        
        // Add zoom behavior after rendering
        //svg.call(zoom);
    };
    
    /**
     * Render character images in specific temporal boxes and swimlanes
     * with collision detection and avoidance for existing nodes
     */
    const renderCharacterImages = () => {
        // Create a group for character images
        const imagesGroup = zoomGroup.append('g')
            .attr('class', 'character-images');
        
        // Define images to display with their positions
        const characterImages = [
            {
                imageUrl: 'images/jonas/old.jpg',  // Path to the image
                timeRange: '1888-1890',            // Target temporal box
                characterType: 'jonas',            // Target swimlane
                width: 80,                         // Image width
                height: 80,                        // Image height
                margin: 25                         // Minimum margin to keep from nodes
            },
            {
                imageUrl: 'images/jonas/old.jpg',  // Path to the image
                timeRange: '1911-1911',            // Target temporal box
                characterType: 'jonas',            // Target swimlane
                width: 80,                         // Image width
                height: 80,                        // Image height
                margin: 25                         // Minimum margin to keep from nodes
            }
            // More images can be added here later
        ];
        
        // Find and place each image with collision avoidance
        characterImages.forEach(imageInfo => {
            // Find the corresponding temporal box
            const temporalBox = layout.temporalBoxes.find(box => 
                `${box.start}-${box.end}` === imageInfo.timeRange);
            
            if (!temporalBox) return; // Skip if temporal box not found
            
            // Find the corresponding swimlane
            const swimlaneIndex = layout.swimlanes.findIndex(s => 
                s.timeRange.start === temporalBox.start && 
                s.timeRange.end === temporalBox.end);
            
            if (swimlaneIndex === -1) return; // Skip if swimlane not found
            
            const swimlane = layout.swimlanes[swimlaneIndex];
            const characterLane = swimlane.lanes.find(lane => lane.type === imageInfo.characterType);
            
            if (!characterLane) return; // Skip if character lane not found
            
            // Identify nodes within this swimlane to avoid
            const nodesInSwimlane = [];
            Object.values(layout.nodePositions).forEach(nodePos => {
                // Check if node is in the same temporal box and character lane
                if (nodePos.timeRange === imageInfo.timeRange && 
                    nodePos.lane === imageInfo.characterType) {
                    nodesInSwimlane.push({
                        x: nodePos.x,
                        y: nodePos.y,
                        width: nodePos.width || 30, // Default node width if not specified
                        height: nodePos.height || 30 // Default node height if not specified
                    });
                }
            });
            
            // Find a position for the image that doesn't overlap with nodes
            // Initial position constraints
            const padding = 20;  // Padding from swimlane edges
            const minX = characterLane.x + padding;
            const minY = characterLane.y + padding;
            const maxX = characterLane.x + characterLane.width - imageInfo.width - padding;
            const maxY = characterLane.y + characterLane.height - imageInfo.height - padding;
            
            // Find the best position using a grid search approach
            const gridSize = 20; // Step size for grid search
            let bestPosition = null;
            let minOverlapScore = Infinity;
            
            // Try positions in a grid pattern within the swimlane
            for (let x = minX; x <= maxX; x += gridSize) {
                for (let y = minY; y <= maxY; y += gridSize) {
                    // Calculate overlap score for this position
                    let overlapScore = 0;
                    
                    // Check overlap with each node
                    nodesInSwimlane.forEach(node => {
                        // Calculate distance between image center and node center
                        const imgCenterX = x + imageInfo.width / 2;
                        const imgCenterY = y + imageInfo.height / 2;
                        const nodeCenterX = node.x + node.width / 2;
                        const nodeCenterY = node.y + node.height / 2;
                        
                        // Calculate distance
                        const dx = imgCenterX - nodeCenterX;
                        const dy = imgCenterY - nodeCenterY;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        // Calculate minimum distance needed to avoid overlap
                        const minDist = (imageInfo.width/2 + node.width/2 + imageInfo.margin) * 0.8 + 
                                     (imageInfo.height/2 + node.height/2 + imageInfo.margin) * 0.8;
                        
                        // Add to score if there's overlap
                        if (distance < minDist) {
                            // Score is higher for bigger overlaps
                            overlapScore += (minDist - distance) * 10;
                        }
                    });
                    
                    // Also prefer positions away from the edges
                    const edgeProximity = 
                        Math.min(x - minX, maxX - x, y - minY, maxY - y) / 
                        Math.min(maxX - minX, maxY - minY);
                    
                    // Combine scores (lower is better)
                    const totalScore = overlapScore - (edgeProximity * 5);
                    
                    // Update best position if this is better
                    if (totalScore < minOverlapScore) {
                        minOverlapScore = totalScore;
                        bestPosition = { x, y };
                    }
                }
            }
            
            // Use default position if no good position found
            if (!bestPosition || minOverlapScore > 100) {
                // Try to find any position that works
                bestPosition = { 
                    x: characterLane.x + padding, 
                    y: characterLane.y + padding 
                };
                
                // As a last resort, try the corners of the swimlane
                const corners = [
                    { x: minX, y: minY },                   // Top-left
                    { x: maxX, y: minY },                   // Top-right
                    { x: minX, y: maxY },                   // Bottom-left
                    { x: maxX, y: maxY }                    // Bottom-right
                ];
                
                // Find the corner with the least overlap
                corners.forEach(corner => {
                    let overlapScore = 0;
                    
                    nodesInSwimlane.forEach(node => {
                        // Check if image at this corner overlaps with the node
                        if (!(corner.x + imageInfo.width < node.x || 
                              corner.x > node.x + node.width || 
                              corner.y + imageInfo.height < node.y || 
                              corner.y > node.y + node.height)) {
                            overlapScore += 100;
                        }
                    });
                    
                    if (overlapScore < minOverlapScore) {
                        minOverlapScore = overlapScore;
                        bestPosition = corner;
                    }
                });
            }
            
            // Use the best position found
            const imgX = bestPosition.x;
            const imgY = bestPosition.y;
            const adjustedWidth = imageInfo.width;
            const adjustedHeight = imageInfo.height;
            
            // Create clipping path for rounded corners
            const clipId = `clip-${imageInfo.timeRange}-${imageInfo.characterType}`;
            imagesGroup.append('clipPath')
                .attr('id', clipId)
                .append('rect')
                .attr('x', imgX)
                .attr('y', imgY)
                .attr('width', adjustedWidth)
                .attr('height', adjustedHeight)
                .attr('rx', 8)
                .attr('ry', 8);
            
            // Create image element
            imagesGroup.append('image')
                .attr('xlink:href', imageInfo.imageUrl)
                .attr('x', imgX)
                .attr('y', imgY)
                .attr('width', adjustedWidth)
                .attr('height', adjustedHeight)
                .attr('clip-path', `url(#${clipId})`)
                .style('opacity', 0.9);
            
            // Add decorative border
            imagesGroup.append('rect')
                .attr('x', imgX)
                .attr('y', imgY)
                .attr('width', adjustedWidth)
                .attr('height', adjustedHeight)
                .attr('rx', 8)
                .attr('ry', 8)
                .attr('fill', 'none')
                .attr('stroke', '#3498db') // Blue border for Jonas
                .attr('stroke-width', '2.5px');
        });
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
        
        // Add arrow marker for edges and glow filter for time travel edges
        const defs = svg.append('defs');
        
        // Standard arrow marker
        defs.append('marker')
            .attr('id', 'arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 8)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('class', 'arrowHead');
            
        // Time travel arrow marker for past (blue glow effect)
        defs.append('marker')
            .attr('id', 'timetravel-past-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 8)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('class', 'timetravel-past-arrowHead');
            
        // Time travel arrow marker for future (orange glow effect)
        defs.append('marker')
            .attr('id', 'timetravel-future-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 8)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('class', 'timetravel-future-arrowHead');
            
        // Add glow filter for time travel edges
        const filter = defs.append('filter')
            .attr('id', 'glow-effect')
            .attr('x', '-50%')
            .attr('y', '-50%')
            .attr('width', '200%')
            .attr('height', '200%');
            
        // Glow blur effect
        filter.append('feGaussianBlur')
            .attr('stdDeviation', '3')
            .attr('result', 'blur');
            
        // Making the glow more pronounced using feComponentTransfer
        const componentTransfer = filter.append('feComponentTransfer');
        componentTransfer.append('feFuncR').attr('type', 'linear').attr('slope', '2');
        componentTransfer.append('feFuncG').attr('type', 'linear').attr('slope', '2');
        componentTransfer.append('feFuncB').attr('type', 'linear').attr('slope', '2');
        
        // Merge the original shape with the blur effect
        const merge = filter.append('feMerge');
        merge.append('feMergeNode').attr('in', 'blur');
        merge.append('feMergeNode').attr('in', 'SourceGraphic');
        
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
        
        // Jonas and Martha transitions
        const mainCharacterTypes = ['jonas', 'martha'];
        
        for (let i = 0; i < layout.swimlanes.length - 1; i++) {
            const sourceSwimlane = layout.swimlanes[i];
            const targetSwimlane = layout.swimlanes[i + 1];
            
            // Handle main character transitions first
            mainCharacterTypes.forEach(type => {
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
            
            // Handle the "Others" lane specifically - looking for the bottom lane labeled "Others"
            const sourceOthersLane = sourceSwimlane.lanes.find(lane => 
                lane.type === 'other' && lane.shortName === 'Others');
            const targetOthersLane = targetSwimlane.lanes.find(lane => 
                lane.type === 'other' && lane.shortName === 'Others');
            
            if (sourceOthersLane && targetOthersLane) {
                // Draw smooth transition path
                transitionsGroup.append('path')
                    .attr('class', 'transition-path other')
                    .attr('d', LayoutLogic.generateTransitionPath(sourceOthersLane, targetOthersLane));
            }
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
            
            // Find the actual event data
            const sourceEvent = data.events.find(e => e.id === edge.source);
            const targetEvent = data.events.find(e => e.id === edge.target);
            
            edgeGroups[key].push({
                edge,
                source: sourcePos,
                target: targetPos,
                sourceEvent,
                targetEvent
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
                const { source, target, sourceEvent, targetEvent } = edge;
                const isSummarized = DataParser.isSummarizedEdge(edge.edge);
                
                // Determine if this is a time travel edge based on source or target events
                const isTimeTravelEdge = sourceEvent?.isTimeTravel || targetEvent?.isTimeTravel;
                
                // Determine time travel direction (to future or to past)
                let timeTravelDirection = null;
                if (isTimeTravelEdge) {
                    const sourceDate = sourceEvent ? new Date(sourceEvent.date) : null;
                    const targetDate = targetEvent ? new Date(targetEvent.date) : null;
                    
                    if (sourceDate && targetDate) {
                        timeTravelDirection = sourceDate < targetDate ? 'future' : 'past';
                    }
                }
                
                // Calculate path with bundling adjustments
                let pathData;
                let strokeColor = 'white';
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
                        if (source.lane === 'jonas') strokeColor = 'blue';
                        else if (source.lane === 'martha') strokeColor = 'green';
                        else if (source.lane === 'other') strokeColor = 'yellow';
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
                        if (source.lane === 'jonas') strokeColor = 'blue';
                        else if (source.lane === 'martha') strokeColor = 'green';
                        else if (source.lane === 'other') strokeColor = 'yellow';
                        
                    }
                    strokeWidth = 1;
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

                    strokeColor = 'white';
                    strokeWidth = isTimeTravelEdge ? 3 : 2;
                }

                // Create separate groups for regular edges and time travel edges (for z-ordering)
                // Time travel edges should be drawn below all other elements
                const targetGroup = isTimeTravelEdge ? 
                    zoomGroup.select('.timetravel-edges').size() ? 
                        zoomGroup.select('.timetravel-edges') : 
                        zoomGroup.insert('g', ':first-child').attr('class', 'timetravel-edges') : 
                    edgesGroup;
                
                // Determine appropriate CSS class and color based on time travel direction
                let edgeClass = isTimeTravelEdge ? 
                    (timeTravelDirection === 'future' ? 'time-travel-future-edge' : 'time-travel-past-edge') : 
                    (isSummarized ? 'summarized-edge' : 'edge');
                    
                let edgeColor = strokeColor;
                if (isTimeTravelEdge) {
                    edgeColor = timeTravelDirection === 'future' ? '#ff9800' : '#64b5f6'; // Orange for future, blue for past
                }
                
                // Create path element with appropriate styling
                targetGroup.append('path')
                    .attr('class', edgeClass)
                    .attr('d', pathData)
                    .attr('marker-end', isTimeTravelEdge ? 
                        (timeTravelDirection === 'future' ? 'url(#timetravel-future-arrow)' : 'url(#timetravel-past-arrow)') : 
                        'url(#arrow)')
                    .style('stroke', edgeColor) 
                    .style('stroke-width', isTimeTravelEdge ? 4 : strokeWidth) // Wider stroke for time travel
                    .style('filter', isTimeTravelEdge ? 'url(#glow-effect)' : null)
                    .style('stroke-opacity', isTimeTravelEdge ? 0.9 : 1)
                    .style('stroke-linecap', 'round')
                    .style('stroke-linejoin', 'round')
                    // Add data attributes for easy selection
                    .attr('data-source', edge.edge.source)
                    .attr('data-target', edge.edge.target);
                    
                // Set the appropriate glow color in the filter if it's a time travel edge
                if (isTimeTravelEdge) {
                    // The actual glow color is managed via CSS classes
                }
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
        
        // Define node dimensions
        const nodeWidth = 130; // Width of the rectangle
        const nodeHeight = 80; // Height of the rectangle
        const cornerRadius = 8; // Rounded corner radius
        
        // Define border colors for event types
        const borderColors = {
            death: '#8e44ad', // Purple for death events
            romantic: '#e74c3c', // Red for romantic events
            missing: '#f39c12', // Orange for missing person events
            timeTravel: '#3498db' // Blue for time travel events
        };
        
        // Create node groups
        const nodeGroups = nodesGroup.selectAll('.node-group')
            .data(data.events)
            .enter()
            .append('g')
            .attr('class', 'node-group')
            .attr('transform', d => {
                const position = layout.nodePositions[d.id];
                if (!position) return 'translate(0,0)';
                return `translate(${position.x - nodeWidth/2}, ${position.y - nodeHeight/2})`;
            })
            .on('mouseover', showTooltip)
            .on('mouseout', hideTooltip)
            // Add drag behavior
            .call(d3.drag()
                .on('start', function(event, d) {
                    d3.select(this).raise();
                })
                .on('drag', function(event, d) {
                    // Update node position in layout.nodePositions
                    const newX = event.x;
                    const newY = event.y;
                    layout.nodePositions[d.id].x = newX;
                    layout.nodePositions[d.id].y = newY;
                    // Move the node visually
                    d3.select(this)
                        .attr('transform', `translate(${newX - nodeWidth/2}, ${newY - nodeHeight/2})`);
                    // Update only the edges connected to this node
                    updateNodeEdges(d.id);
                    // Save positions
                    saveNodePositions();
                })
            );
        
        // Add rectangle for each node
        nodeGroups.append('rect')
            .attr('class', d => {
                // Use world for background color instead of primary character
                const world = DataParser.getWorld(d);
                let classes = `node ${world}`;
                const position = layout.nodePositions[d.id];
                if (position && position.lane === 'start') {
                    classes += ' start';
                }
                return classes;
            })
            .attr('width', nodeWidth)
            .attr('height', nodeHeight)
            .attr('rx', cornerRadius)
            .attr('ry', cornerRadius)
            .style('stroke-width', d => {
                // Apply thicker yellow border for important trigger events
                if (d.importantTrigger) return '5px';
                return '4px';
            })
            .style('stroke', d => {
                // Define border color based on event type
                if (d.importantTrigger) return '#ffd700'; // Golden border for important events
                else if (d.death) return borderColors.death;
                else if (d.isRomantic) return borderColors.romantic;
                else if (d.isMissing) return borderColors.missing;
                else if (d.isTimeTravel) return borderColors.timeTravel;
                return '#ffffff'; // Default white border
            })
            // Apply a second border for important trigger events
            .each(function(d) {
                const rect = d3.select(this);
                
                // If it's an important event AND also has another property (death, romantic, etc.)
                // Add a second rectangle with the appropriate border color under the gold one
                if (d.importantTrigger && (d.death || d.isRomantic || d.isMissing || d.isTimeTravel)) {
                    const parentGroup = d3.select(this.parentNode);
                    
                    // Insert a background rectangle before the current one
                    parentGroup.insert('rect', 'rect')
                        .attr('width', nodeWidth + 6) // Slightly larger
                        .attr('height', nodeHeight + 6)
                        .attr('rx', cornerRadius + 2)
                        .attr('ry', cornerRadius + 2)
                        .attr('x', -3) // Center it
                        .attr('y', -3)
                        .style('stroke-width', '2px')
                        .style('fill', 'none') // Transparent fill
                        .style('stroke', () => {
                            if (d.death) return borderColors.death;
                            else if (d.isRomantic) return borderColors.romantic;
                            else if (d.isMissing) return borderColors.missing;
                            else if (d.isTimeTravel) return borderColors.timeTravel;
                            return '#ffffff';
                        });
                }
            });
        
        // Add text for event descriptions
        nodeGroups.append('text')
            .attr('class', 'node-text')
            .attr('x', nodeWidth / 2)
            .attr('y', nodeHeight / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .style('fill', '#000000') // Black text
            .text(d => {
                // Truncate description if it's too long
                const maxLength = 80;
                let text = d.description || '';
                return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
            })
            .call(wrap, nodeWidth - 10); // Wrap text with 5px padding on each side
    };
    
    /**
     * Helper function to wrap text within a given width
     * @param {Selection} text - D3 selection of text elements
     * @param {Number} width - Maximum width for the text
     */
    const wrap = (text, width) => {
        text.each(function() {
            const text = d3.select(this);
            const words = text.text().split(/\s+/).reverse();
            const lineHeight = 1.1; // ems
            const y = text.attr('y');
            const dy = parseFloat(text.attr('dy') || 0);
            
            let word;
            let line = [];
            let lineNumber = 0;
            let tspan = text.text(null).append('tspan')
                .attr('x', text.attr('x'))
                .attr('y', y)
                .attr('dy', dy + 'em');
            
            // Limit to maximum 3 lines
            const MAX_LINES = 3;
            
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(' '));
                
                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(' '));
                    line = [word];
                    
                    lineNumber++;
                    if (lineNumber >= MAX_LINES - 1) {
                        // For the last line, add ellipsis if there are more words
                        if (words.length > 0) {
                            line.push('...');
                            tspan = text.append('tspan')
                                .attr('x', text.attr('x'))
                                .attr('y', y)
                                .attr('dy', lineNumber * lineHeight + dy + 'em')
                                .text(line.join(' '));
                            break;
                        }
                    }
                    
                    tspan = text.append('tspan')
                        .attr('x', text.attr('x'))
                        .attr('y', y)
                        .attr('dy', lineNumber * lineHeight + dy + 'em')
                        .text(word);
                }
            }
        });
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

    // Render the legend using the external module
    // This function is imported from legend.js

    // Helper to update only the edges connected to a node
    const updateNodeEdges = (nodeId) => {
        // Find all edges where nodeId is source or target
        const connectedEdges = data.edges.filter(e => e.source === nodeId || e.target === nodeId);
        // Remove their SVG paths (could be in .edges or .timetravel-edges group)
        connectedEdges.forEach(edge => {
            // Remove regular edge
            zoomGroup.selectAll('.edges path').filter(function() {
                // Use edge source/target id in a data attribute for matching
                return (
                    this.getAttribute('data-source') == edge.source &&
                    this.getAttribute('data-target') == edge.target
                );
            }).remove();
            // Remove time travel edge
            zoomGroup.selectAll('.timetravel-edges path').filter(function() {
                return (
                    this.getAttribute('data-source') == edge.source &&
                    this.getAttribute('data-target') == edge.target
                );
            }).remove();
        });
        // Redraw those edges
        connectedEdges.forEach(edge => {
            // Reuse the edge rendering logic from renderEdges, but only for this edge
            const sourcePos = layout.nodePositions[edge.source];
            const targetPos = layout.nodePositions[edge.target];
            if (!sourcePos || !targetPos) return;
            const sourceEvent = data.events.find(e => e.id === edge.source);
            const targetEvent = data.events.find(e => e.id === edge.target);
            const isSummarized = DataParser.isSummarizedEdge(edge);
            const isTimeTravelEdge = sourceEvent?.isTimeTravel || targetEvent?.isTimeTravel;
            let timeTravelDirection = null;
            if (isTimeTravelEdge) {
                const sourceDate = sourceEvent ? new Date(sourceEvent.date) : null;
                const targetDate = targetEvent ? new Date(targetEvent.date) : null;
                if (sourceDate && targetDate) {
                    timeTravelDirection = sourceDate < targetDate ? 'future' : 'past';
                }
            }
            let pathData;
            let strokeColor = 'white';
            if (sourcePos.timeRange === targetPos.timeRange) {
                let curveHeight = 30;
                const verticalDistance = Math.abs(targetPos.y - sourcePos.y);
                if (verticalDistance < 40) {
                    curveHeight = Math.max(15, verticalDistance * 0.5);
                }
                if (sourcePos.lane === targetPos.lane) {
                    const midX = (sourcePos.x + targetPos.x) / 2;
                    const controlY = (sourcePos.y + targetPos.y) / 2 - curveHeight;
                    pathData = `M ${sourcePos.x} ${sourcePos.y} Q ${midX} ${controlY} ${targetPos.x} ${targetPos.y}`;
                    if (sourcePos.lane === 'jonas') strokeColor = 'blue';
                    else if (sourcePos.lane === 'martha') strokeColor = 'green';
                    else if (sourcePos.lane === 'other') strokeColor = 'yellow';
                } else {
                    const dx = targetPos.x - sourcePos.x;
                    const dy = targetPos.y - sourcePos.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const curveStrength = Math.min(0.4, Math.max(0.2, distance / 400));
                    const cp1x = sourcePos.x + dx * 0.25;
                    const cp1y = sourcePos.y - distance * curveStrength;
                    const cp2x = sourcePos.x + dx * 0.75;
                    const cp2y = targetPos.y - distance * curveStrength;
                    pathData = `M ${sourcePos.x} ${sourcePos.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetPos.x} ${targetPos.y}`;
                    if (sourcePos.lane === 'jonas') strokeColor = 'blue';
                    else if (sourcePos.lane === 'martha') strokeColor = 'green';
                    else if (sourcePos.lane === 'other') strokeColor = 'yellow';
                }
            } else {
                const dx = targetPos.x - sourcePos.x;
                const sourceBox = layout.temporalBoxes.find(b => b.start === sourcePos.timeRange);
                const targetBox = layout.temporalBoxes.find(b => b.start === targetPos.timeRange);
                let useSimpleCurve = false;
                if (!sourceBox || !targetBox) useSimpleCurve = true;
                if (useSimpleCurve) {
                    const midX = (sourcePos.x + targetPos.x) / 2;
                    const midY = (sourcePos.y + targetPos.y) / 2;
                    const controlOffset = Math.min(150, Math.abs(targetPos.x - sourcePos.x) * 0.3);
                    pathData = `M ${sourcePos.x} ${sourcePos.y} Q ${midX} ${midY - controlOffset} ${targetPos.x} ${targetPos.y}`;
                } else {
                    const midX = sourceBox.x + sourceBox.width + (targetBox.x - (sourceBox.x + sourceBox.width)) / 2;
                    const verticalChannelSize = 250;
                    const avgY = (sourcePos.y + targetPos.y) / 2;
                    const channelCenterY = avgY < height / 2 ? Math.max(100, avgY - verticalChannelSize) : Math.min(height - 100, avgY + verticalChannelSize);
                    const groupSizeLimit = 10;
                    const channelIndex = 0; // For single edge update, no group
                    const channelOffset = channelIndex * 40;
                    const withinChannelIndex = 0;
                    const edgeSeparation = 15;
                    const bundleOffset = 0;
                    const controlY = channelCenterY + channelOffset + bundleOffset;
                    pathData = `M ${sourcePos.x} ${sourcePos.y} C ${sourcePos.x + dx * 0.15} ${sourcePos.y}, ${midX - 120} ${controlY}, ${midX} ${controlY} S ${midX + 120} ${controlY}, ${targetPos.x - dx * 0.15} ${targetPos.y}, ${targetPos.x} ${targetPos.y}`;
                }
                strokeColor = 'white';
            }
            let edgeClass = isTimeTravelEdge ? (timeTravelDirection === 'future' ? 'time-travel-future-edge' : 'time-travel-past-edge') : (isSummarized ? 'summarized-edge' : 'edge');
            let edgeColor = strokeColor;
            if (isTimeTravelEdge) {
                edgeColor = timeTravelDirection === 'future' ? '#ff9800' : '#64b5f6';
            }
            const targetGroup = isTimeTravelEdge ?
                (zoomGroup.select('.timetravel-edges').size() ? zoomGroup.select('.timetravel-edges') : zoomGroup.insert('g', ':first-child').attr('class', 'timetravel-edges')) :
                zoomGroup.select('.edges');
            targetGroup.append('path')
                .attr('class', edgeClass)
                .attr('d', pathData)
                .attr('marker-end', isTimeTravelEdge ?
                    (timeTravelDirection === 'future' ? 'url(#timetravel-future-arrow)' : 'url(#timetravel-past-arrow)') :
                    'url(#arrow)')
                .style('stroke', edgeColor)
                .style('stroke-width', isTimeTravelEdge ? 4 : 2)
                .style('filter', isTimeTravelEdge ? 'url(#glow-effect)' : null)
                .style('stroke-opacity', isTimeTravelEdge ? 0.9 : 1)
                .style('stroke-linecap', 'round')
                .style('stroke-linejoin', 'round')
                // Add data attributes for easy selection
                .attr('data-source', edge.source)
                .attr('data-target', edge.target);
        });
    };

    // Helper to save node positions to localStorage
    const saveNodePositions = () => {
        try {
            localStorage.setItem('dark-graph-node-positions', JSON.stringify(layout.nodePositions));
        } catch (e) { /* ignore */ }
    };

    // Helper to load node positions from localStorage
    const loadNodePositions = () => {
        try {
            const saved = localStorage.getItem('dark-graph-node-positions');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Only override positions for nodes that exist in current data
                Object.keys(parsed).forEach(id => {
                    if (layout.nodePositions[id]) {
                        layout.nodePositions[id].x = parsed[id].x;
                        layout.nodePositions[id].y = parsed[id].y;
                    }
                });
            }
        } catch (e) { /* ignore */ }
    };

    // Patch: after layout is calculated, load saved positions
    const originalCalculateLayout = LayoutLogic.calculateLayout;
    LayoutLogic.calculateLayout = function(data) {
        const l = originalCalculateLayout.call(LayoutLogic, data);
        layout = l; // update reference for helpers
        // Load saved positions if any
        loadNodePositions();
        return layout;
    };

    // Public API
    return {
        initialize,
        renderGraphLegend
    };
})();

// Global functions for download buttons
const saveSvg = () => {
    const svgElement = document.querySelector('#graph');
    const clonedSvg = svgElement.cloneNode(true);
    
    // Set proper dimensions and viewBox
    clonedSvg.setAttribute('width', '12288');
    clonedSvg.setAttribute('height', '1200');
    clonedSvg.setAttribute('viewBox', '0 0 12288 1200');
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    
    // Add background rect
    const backgroundRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    backgroundRect.setAttribute('width', '100%');
    backgroundRect.setAttribute('height', '100%');
    backgroundRect.setAttribute('fill', '#121212');
    clonedSvg.insertBefore(backgroundRect, clonedSvg.firstChild);

    // Include all styles
    const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleElement.textContent = `
        .temporal-box { fill: rgba(255, 255, 255, 0.08); stroke: #aaaaaa; stroke-width: 2px; }
        .temporal-box-label { fill: #f5f5f5; font-size: 14px; text-anchor: middle; }
        .swimlane { fill: rgba(255, 255, 255, 0.02); stroke: #aaaaaa; stroke-width: 0.5px; stroke-dasharray: 2,2; }
        .swimlane-label { fill: #aaaaaa; font-size: 12px; text-anchor: start; }
        .node { stroke: #121212; stroke-width: 1.5px; }
        .node.jonas { fill: #3498db; }
        .node.martha { fill: #e74c3c; }
        .node.other { fill: #2ecc71; }
        .node.important { fill: #ffd700; }
        .node.death { stroke: #8e44ad; stroke-width: 2px; }
        .edge { stroke: rgba(255, 255, 255, 0.7); stroke-width: 1.5px; fill: none; opacity: 0.8; }
        .summarized-edge { stroke: rgba(255, 255, 255, 0.6); stroke-width: 1.5px; stroke-dasharray: 4,3; fill: none; opacity: 0.7; }
        .transition-path { fill-opacity: 0.3; stroke: none; }
        .transition-path.jonas { fill: #3498db; }
        .transition-path.martha { fill: #e74c3c; }
        .transition-path.other { fill: #2ecc71; }
    `;
    clonedSvg.insertBefore(styleElement, clonedSvg.firstChild);

    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = 'dark-visualization.svg';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    URL.revokeObjectURL(url);
};

const savePng = () => {
    const svgElement = document.querySelector('#graph');
    const clonedSvg = svgElement.cloneNode(true);
    
    // Set proper dimensions and viewBox
    clonedSvg.setAttribute('width', '12288');
    clonedSvg.setAttribute('height', '1200');
    clonedSvg.setAttribute('viewBox', '0 0 12288 1200');
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    
    // Add background rect
    const backgroundRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    backgroundRect.setAttribute('width', '100%');
    backgroundRect.setAttribute('height', '100%');
    backgroundRect.setAttribute('fill', '#121212');
    clonedSvg.insertBefore(backgroundRect, clonedSvg.firstChild);

    // Include all styles
    const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleElement.textContent = `
        .temporal-box { fill: rgba(255, 255, 255, 0.08); stroke: #aaaaaa; stroke-width: 2px; }
        .temporal-box-label { fill: #f5f5f5; font-size: 14px; text-anchor: middle; }
        .swimlane { fill: rgba(255, 255, 255, 0.02); stroke: #aaaaaa; stroke-width: 0.5px; stroke-dasharray: 2,2; }
        .swimlane-label { fill: #aaaaaa; font-size: 12px; text-anchor: start; }
        .node { stroke: #121212; stroke-width: 1.5px; }
        .node.jonas { fill: #3498db; }
        .node.martha { fill: #e74c3c; }
        .node.other { fill: #2ecc71; }
        .node.important { fill: #ffd700; }
        .node.death { stroke: #8e44ad; stroke-width: 2px; }
        .edge { stroke: rgba(255, 255, 255, 0.7); stroke-width: 1.5px; fill: none; opacity: 0.8; }
        .summarized-edge { stroke: rgba(255, 255, 255, 0.6); stroke-width: 1.5px; stroke-dasharray: 4,3; fill: none; opacity: 0.7; }
        .transition-path { fill-opacity: 0.3; stroke: none; }
        .transition-path.jonas { fill: #3498db; }
        .transition-path.martha { fill: #e74c3c; }
        .transition-path.other { fill: #2ecc71; }
    `;
    clonedSvg.insertBefore(styleElement, clonedSvg.firstChild);

    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    
    // Create canvas with the correct dimensions
    const canvas = document.createElement('canvas');
    canvas.width = 12288;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');

    // Set background
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Create an image from the SVG
    const img = new Image();
    img.onload = () => {
        // Draw the image on canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert to PNG and download
        canvas.toBlob((blob) => {
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(blob);
            downloadLink.download = 'dark-visualization.png';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }, 'image/png', 1.0);
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
};

