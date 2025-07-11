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
    
    // Store custom edge control points
    let customEdgeControls = {};
    let selectedEdgeKey = null;
    
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
        // Expose layout and LayoutLogic globally for savePng
        window.layout = layout;
        window.LayoutLogic = LayoutLogic;
        
        // Set up event handlers
        setupEventHandlers();
        
        // Render visualization first
        render();
        
        // Initialize image manager after first render
        if (typeof ImageManager !== 'undefined') {
            ImageManager.initialize(svg, zoomGroup);
        }
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
            resetEdgeControls();
            layout = LayoutLogic.calculateLayout(data);
            selectedEdgeKey = null;
            render();
        });
        // Window resize handler
        window.addEventListener('resize', () => {
            LayoutLogic.updateDimensions();
            layout = LayoutLogic.calculateLayout(data);
            render();
        });
        // Deselect edge on background click
        d3.select('#graph').on('click', function(event) {
            if (event.target === this) {
                selectedEdgeKey = null;
                render();
            }
        });
        d3.select('#save-json').on('click', saveLayoutJson);
        d3.select('#load-json').on('click', loadLayoutJson);
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
        renderTemporalBoxes();
        renderSwimlanes();
        renderTransitions();
        renderEdges(); // Render edges first (regular edges go above time travel edges but below boxes)
        renderNodes();
        renderCharacterImages(); // Add character images
        
        // Render custom uploaded images on top of everything
        if (typeof ImageManager !== 'undefined' && ImageManager.renderImages) {
            ImageManager.renderImages();
        }
        
        // Render the static legend image, which is not part of the zoom group
        renderLegendImage();
        
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
        zoomGroup.selectAll('.edges').remove();
        const edgesGroup = zoomGroup.append('g').attr('class', 'edges');
        zoomGroup.selectAll('.timetravel-edges').remove();
        zoomGroup.append('g').attr('class', 'timetravel-edges');
        data.edges.forEach(edge => {
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
            let edgeKey = getEdgeKey(edge.source, edge.target);
            let edgeClass = isTimeTravelEdge ? (timeTravelDirection === 'future' ? 'time-travel-future-edge' : 'time-travel-past-edge') : 'edge';
            // Restore original coloring logic
            let edgeColor = '#f7fcff';
            if (isTimeTravelEdge) {
                edgeColor = timeTravelDirection === 'future' ? '#ff9800' : '#64b5f6';
            } // else keep white for bundled/complex
            
            // Use custom control points if present
            let pathData = '';
            if (customEdgeControls[edgeKey] && customEdgeControls[edgeKey].length > 0) {
                const points = [
                    [sourcePos.x, sourcePos.y],
                    ...customEdgeControls[edgeKey].map(pt => [pt.x, pt.y]),
                    [targetPos.x, targetPos.y]
                ];
                pathData = d3.line().curve(d3.curveCatmullRom.alpha(0.5))(points);
            } else {
                if (sourcePos.timeRange === targetPos.timeRange && sourcePos.lane === targetPos.lane) {
                    let midX = (sourcePos.x + targetPos.x) / 2;
                    let curveHeight = 30;
                    const verticalDistance = Math.abs(targetPos.y - sourcePos.y);
                    if (verticalDistance < 40) {
                        curveHeight = Math.max(15, verticalDistance * 0.5);
                    }
                    let controlY = (sourcePos.y + targetPos.y) / 2 - curveHeight;
                    pathData = `M ${sourcePos.x} ${sourcePos.y} Q ${midX} ${controlY} ${targetPos.x} ${targetPos.y}`;
                } else if (sourcePos.timeRange === targetPos.timeRange) {
                    const dx = targetPos.x - sourcePos.x;
                    const dy = targetPos.y - sourcePos.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const curveStrength = Math.min(0.4, Math.max(0.2, distance / 400));
                    const cp1x = sourcePos.x + dx * 0.25;
                    const cp1y = sourcePos.y - distance * curveStrength;
                    const cp2x = sourcePos.x + dx * 0.75;
                    const cp2y = targetPos.y - distance * curveStrength;
                    pathData = `M ${sourcePos.x} ${sourcePos.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetPos.x} ${targetPos.y}`;
                } else {
                    const dx = targetPos.x - sourcePos.x;
                    const sourceBoxIndex = layout.temporalBoxes.findIndex(b => b.start === sourcePos.timeRange);
                    const targetBoxIndex = layout.temporalBoxes.findIndex(b => b.start === targetPos.timeRange);
                    const sourceBox = layout.temporalBoxes[sourceBoxIndex];
                    const targetBox = layout.temporalBoxes[targetBoxIndex];
                    let useSimpleCurve = false;
                    if (!sourceBox || !targetBox) useSimpleCurve = true;
                    if (useSimpleCurve) {
                        let midX = (sourcePos.x + targetPos.x) / 2;
                        let midY = (sourcePos.y + targetPos.y) / 2;
                        let controlOffset = Math.min(150, Math.abs(targetPos.x - sourcePos.x) * 0.3);
                        pathData = `M ${sourcePos.x} ${sourcePos.y} Q ${midX} ${midY - controlOffset} ${targetPos.x} ${targetPos.y}`;
                    } else {
                        let midX = sourceBox.x + sourceBox.width + (targetBox.x - (sourceBox.x + sourceBox.width)) / 2;
                        const verticalChannelSize = 250;
                        const avgY = (sourcePos.y + targetPos.y) / 2;
                        let channelCenterY = avgY < height / 2 ? Math.max(100, avgY - verticalChannelSize) : Math.min(height - 100, avgY + verticalChannelSize);
                        let controlY = channelCenterY;
                        pathData = `M ${sourcePos.x} ${sourcePos.y} C ${sourcePos.x + dx * 0.15} ${sourcePos.y}, ${midX - 120} ${controlY}, ${midX} ${controlY} S ${midX + 120} ${controlY}, ${targetPos.x - dx * 0.15} ${targetPos.y}, ${targetPos.x} ${targetPos.y}`;
                    }
                }
            }
            const targetGroup = isTimeTravelEdge ?
                (zoomGroup.select('.timetravel-edges').size() ? zoomGroup.select('.timetravel-edges') : zoomGroup.insert('g', ':first-child').attr('class', 'timetravel-edges')) :
                edgesGroup;
            // Draw edge path
            const path = targetGroup.append('path')
                .attr('class', edgeClass + (selectedEdgeKey === edgeKey ? ' selected' : ''))
                .attr('d', pathData)
                .attr('marker-end', isTimeTravelEdge ?
                    (timeTravelDirection === 'future' ? 'url(#timetravel-future-arrow)' : 'url(#timetravel-past-arrow)') :
                    'url(#arrow)')
                .style('stroke', edgeColor)
                .style('stroke-width', isTimeTravelEdge ? 4 : 2)
                .style('filter',
                    isTimeTravelEdge || edgeColor === '#f7fcff' || edgeColor === 'white'
                        ? 'url(#glow-effect)'
                        : null
                )
                .style('stroke-opacity', isTimeTravelEdge ? 0.9 : 1)
                .style('stroke-linecap', 'round')
                .style('stroke-linejoin', 'round')
                .attr('data-source', edge.source)
                .attr('data-target', edge.target)
                .on('click', function(event) {
                    event.stopPropagation();
                    selectedEdgeKey = edgeKey;
                    // Add a control point at the click position
                    if (!customEdgeControls[edgeKey]) customEdgeControls[edgeKey] = [];
                    // Get click position in SVG coordinates
                    const pt = d3.pointer(event, zoomGroup.node());
                    customEdgeControls[edgeKey].push({ x: pt[0], y: pt[1] });
                    saveEdgeControls();
                    render();
                });
        });
        renderEdgeControls();
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
            death: '#c92eff', // Purple for death events
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
                    renderEdges();
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
                        .text(d => {
                // Truncate description if it's too long
                const maxLength = 80;
                let text = d.description || '';
                return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
            })
            .call(wrap, nodeWidth - 10); // Wrap text with 5px padding on each side
    };
    
/**
 * Helper function to wrap text within a given width and vertically center it inside its container.
 * @param {Selection} text - D3 selection of text elements
 * @param {Number} width - Maximum width for the text
 */
const wrap = (text, width) => {
    const MAX_LINES = 4;
    const lineHeight = 1.1; // ems

    text.each(function() {
        const textElement = d3.select(this);
        // Preserve original attributes
        const words = textElement.text().split(/\s+/).reverse();
        const x = textElement.attr('x');
        const y = textElement.attr('y');
        const dy = parseFloat(textElement.attr('dy') || 0);

        // --- 1. Pre-computation Pass: Determine all lines needed without rendering ---
        const allLines = [];
        let currentLine = [];
        let word;

        // Create a temporary, non-rendered tspan for measurement
        const tempTspan = textElement.text(null).append('tspan');

        while (word = words.pop()) {
            currentLine.push(word);
            tempTspan.text(currentLine.join(' '));
            // When the line exceeds the width, finalize the previous line
            if (tempTspan.node().getComputedTextLength() > width && currentLine.length > 1) {
                currentLine.pop(); // Remove the word that broke the limit
                allLines.push(currentLine.join(' '));
                currentLine = [word]; // Start a new line
            }
        }
        allLines.push(currentLine.join(' ')); // Add the last line
        tempTspan.remove(); // Clean up the temporary element

        // --- 2. Ellipsis Pass: Truncate lines and add '...' if necessary ---
        let finalLines = allLines;
        if (allLines.length > MAX_LINES) {
            finalLines = allLines.slice(0, MAX_LINES);
            let lastLine = finalLines[MAX_LINES - 1];
            
            const ellipsisTspan = textElement.append('tspan');
            // Shorten the last line until it fits with the ellipsis
            while (lastLine.length > 0) {
                ellipsisTspan.text(lastLine + '...');
                if (ellipsisTspan.node().getComputedTextLength() <= width) {
                    break; // It fits
                }
                lastLine = lastLine.slice(0, -1); // Shorten and try again
            }
            finalLines[MAX_LINES - 1] = lastLine + '...';
            ellipsisTspan.remove(); // Clean up
        }

        // --- 3. Rendering Pass: Calculate vertical offset and create final tspans ---
        const numLines = finalLines.length;
        // Calculate the starting offset to shift the entire text block upwards
        // so that its center aligns with the original 'y' position.
        const startDy = dy - ((numLines - 1) / 2) * lineHeight;

        textElement.text(null); // Clear the original text before rendering final lines

        finalLines.forEach((line, i) => {
            textElement.append('tspan')
                .attr('x', x)
                .attr('y', y)
                .attr('dy', (startDy + i * lineHeight) + 'em')
                .text(line);
        });
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

    /**
     * Renders the static legend image to the left of the graph.
     * The legend is not part of the zoomable area, so it's appended to the main SVG.
     */
    const renderLegendImage = () => {
        svg.append('image')
            .attr('xlink:href', 'images/legend/legend.png')
            .attr('x', 10) // Padding from the left edge
            .attr('y', 10) // Padding from the top edge
            .attr('width', 300)
            .attr('height', 600); // Approximate height, can be adjusted if needed
    };


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
            const isSummarized = DataParser.isSummarizedEdge(edge.edge);
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
                    // For edges between different lanes in same temporal box
                    // Use cubic curve for smoother path
                    const dx = targetPos.x - sourcePos.x;
                    const dy = targetPos.y - sourcePos.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Calculate control points
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
                strokeWidth = 1;
            } else {
                // For edges between different temporal boxes, create more pronounced bundled effect
                // Calculate fixed control points for consistent bundling
                const dx = targetPos.x - sourcePos.x;
                
                // Use a fixed central channel for bundling
                // This creates a strong visual bundling effect
                const sourceBoxIndex = layout.temporalBoxes.findIndex(b => b.start === sourcePos.timeRange);
                const targetBoxIndex = layout.temporalBoxes.findIndex(b => b.start === targetPos.timeRange);
                
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
                    const midX = (sourcePos.x + targetPos.x) / 2;
                    const midY = (sourcePos.y + targetPos.y) / 2;
                    const controlOffset = Math.min(150, Math.abs(targetPos.x - sourcePos.x) * 0.3);
                    
                    pathData = `M ${sourcePos.x} ${sourcePos.y} ` +
                               `Q ${midX} ${midY - controlOffset} ` +
                               `${targetPos.x} ${targetPos.y}`;
                } else {
                    // For the large visualization, use much more pronounced bundling
                    // Calculate the midpoint between the boxes (where the bundle should go through)
                    const midX = sourceBox.x + sourceBox.width + (targetBox.x - (sourceBox.x + sourceBox.width)) / 2;
                    
                    // Create a vertical "channel" where all edges between these boxes will pass through
                    // For large visualization (12288x1200), we need more pronounced bundling
                    const verticalChannelSize = 250; // Larger channel for more visual separation
                    
                    // Base position of the channel - place it above or below based on source/target positions
                    const avgY = (sourcePos.y + targetPos.y) / 2;
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
                    pathData = `M ${sourcePos.x} ${sourcePos.y} ` +
                               `C ${sourcePos.x + dx * 0.15} ${sourcePos.y}, ` +
                               `${midX - 120} ${controlY}, ` +
                               `${midX} ${controlY} ` +
                               `S ${midX + 120} ${controlY}, ` +
                               `${targetPos.x - dx * 0.15} ${targetPos.y}, ` +
                               `${targetPos.x} ${targetPos.y}`;
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
                'edge';
                
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
                .style('filter',
                    isTimeTravelEdge || edgeColor === '#f7fcff' || edgeColor === 'white'
                        ? 'url(#glow-effect)'
                        : null
                )
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

    // Helper to save edge controls to localStorage
    const saveEdgeControls = () => {
        try {
            localStorage.setItem('dark-graph-edge-controls', JSON.stringify(customEdgeControls));
        } catch (e) { /* ignore */ }
    };
    // Helper to load edge controls from localStorage
    const loadEdgeControls = () => {
        try {
            const saved = localStorage.getItem('dark-graph-edge-controls');
            if (saved) customEdgeControls = JSON.parse(saved);
        } catch (e) { customEdgeControls = {}; }
    };
    // Helper to reset edge controls
    const resetEdgeControls = () => {
        customEdgeControls = {};
        localStorage.removeItem('dark-graph-edge-controls');
    };

    // Patch: after layout is calculated, load saved positions and edge controls
    const originalCalculateLayout = LayoutLogic.calculateLayout;
    LayoutLogic.calculateLayout = function(data) {
        const l = originalCalculateLayout.call(LayoutLogic, data);
        layout = l;
        loadNodePositions();
        loadEdgeControls();
        return layout;
    };

    // Helper to get edge key (direction-agnostic)
    const getEdgeKey = (source, target) => {
        // Always sort ids to avoid direction issues
        return [source, target].sort().join('--');
    };

    // Clamp a value to the visible SVG area
    const clampToSVG = (x, y) => {
        const svg = document.getElementById('graph');
        const width = svg ? svg.clientWidth : 12288;
        const height = svg ? svg.clientHeight : 1200;
        return [
            Math.max(0, Math.min(width, x)),
            Math.max(0, Math.min(height, y))
        ];
    };

    // Helper: Quadratic Bézier at t
    function quadBezier(t, p0, p1, p2) {
        const x = (1-t)*(1-t)*p0.x + 2*(1-t)*t*p1.x + t*t*p2.x;
        const y = (1-t)*(1-t)*p0.y + 2*(1-t)*t*p1.y + t*t*p2.y;
        return {x, y};
    }
    // Helper: Cubic Bézier at t
    function cubicBezier(t, p0, p1, p2, p3) {
        const x = Math.pow(1-t,3)*p0.x + 3*Math.pow(1-t,2)*t*p1.x + 3*(1-t)*t*t*p2.x + t*t*t*p3.x;
        const y = Math.pow(1-t,3)*p0.y + 3*Math.pow(1-t,2)*t*p1.y + 3*(1-t)*t*t*p2.y + t*t*t*p3.y;
        return {x, y};
    }

    // Render edge control handles for the selected edge
    const renderEdgeControls = () => {
        zoomGroup.selectAll('.edge-control').remove();
        zoomGroup.selectAll('.edge-control-hit').remove();
        if (!selectedEdgeKey) return;
        const edge = data.edges.find(e => getEdgeKey(e.source, e.target) === selectedEdgeKey);
        if (!edge) return;
        const edgeKey = getEdgeKey(edge.source, edge.target);
        if (!customEdgeControls[edgeKey] || customEdgeControls[edgeKey].length === 0) return;
        customEdgeControls[edgeKey].forEach((pt, idx) => {
            zoomGroup.append('circle')
                .attr('class', 'edge-control-hit')
                .attr('cx', pt.x)
                .attr('cy', pt.y)
                .attr('r', 18)
                .attr('fill', 'transparent')
                .style('pointer-events', 'all');
            zoomGroup.append('circle')
                .attr('class', 'edge-control')
                .attr('cx', pt.x)
                .attr('cy', pt.y)
                .attr('r', 10)
                .attr('fill', '#ff9800')
                .attr('stroke', '#fff')
                .attr('stroke-width', 2)
                .attr('cursor', 'pointer')
                .call(d3.drag()
                    .on('start', function() { d3.select(this).raise(); })
                    .on('drag', function(event) {
                        customEdgeControls[edgeKey][idx] = { x: event.x, y: event.y };
                        saveEdgeControls();
                        render();
                    })
                );
        });
    };

    // Save current node and edge positions to a JSON file
    function saveLayoutJson() {
        const dataToSave = {
            nodePositions: layout.nodePositions,
            edgeControls: customEdgeControls,
            images: typeof ImageManager !== 'undefined' ? ImageManager.getImagesForExport() : []
        };
        const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'layout.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    }

    // Load node and edge positions from a JSON file
    function loadLayoutJson() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = evt => {
                try {
                    const json = JSON.parse(evt.target.result);
                    // Reset nodes and edge controls
                    localStorage.removeItem('dark-graph-node-positions');
                    resetEdgeControls();
                    layout = LayoutLogic.calculateLayout(data);
                    // Apply loaded node positions
                    if (json.nodePositions) {
                        Object.keys(json.nodePositions).forEach(id => {
                            if (layout.nodePositions[id]) {
                                layout.nodePositions[id].x = json.nodePositions[id].x;
                                layout.nodePositions[id].y = json.nodePositions[id].y;
                            }
                        });
                    }
                    // Apply loaded edge controls
                    if (json.edgeControls) {
                        customEdgeControls = json.edgeControls;
                    }
                    // Apply loaded images
                    if (json.images && typeof ImageManager !== 'undefined') {
                        localStorage.setItem('dark-graph-images', JSON.stringify(json.images));
                        ImageManager.clearImages(); // Clear current images
                        // The ImageManager will reload from localStorage on next render
                        setTimeout(() => {
                            ImageManager.reloadImages();
                        }, 100);
                    }
                    saveNodePositions();
                    saveEdgeControls();
                    render();
                } catch (err) {
                    alert('Invalid JSON file.');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    // Public API
    return {
        initialize
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
        .temporal-box-label { fill: #f5f5f5; font-size: 30px; text-anchor: middle; }
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
    // === Legend transform controls ===
    // Left legend
    const LEGEND_LEFT_SCALE = 1.0; // Uniform scale for left legend
    const LEGEND_LEFT_OFFSET_X = 300; // Horizontal offset for left legend
    const LEGEND_LEFT_OFFSET_Y = 0; // Vertical offset for left legend
    // Right legend
    const LEGEND_RIGHT_SCALE = 1.0; // Uniform scale for right legend
    const LEGEND_RIGHT_OFFSET_X = -600; // Horizontal offset for right legend
    const LEGEND_RIGHT_OFFSET_Y = 0; // Vertical offset for right legend
    // Origin world legend
    const LEGEND_ORIGIN_SCALE = 1.0; // Uniform scale for right legend
    const LEGEND_ORIGIN_OFFSET_X = 8200; // Horizontal offset for right legend
    const LEGEND_ORIGIN_OFFSET_Y = 0; // Vertical offset for right legend

    const svgElement = document.querySelector('#graph');
    // --- Reset zoom/pan for export ---
    const zoomGroup = svgElement.querySelector('g.zoom-group');
    let originalTransform = null;
    if (zoomGroup) {
        originalTransform = zoomGroup.getAttribute('transform');
        // Use the new setTransform logic
        if (window.LayoutLogic && typeof window.LayoutLogic.setTransform === 'function') {
            window.LayoutLogic.setTransform({ x: 2000, y: 350, k: 3.0 });
        } else {
            zoomGroup.setAttribute('transform', 'translate(1000,100) scale(1)');
        }
    }

    const clonedSvg = svgElement.cloneNode(true);

    // Restore the original transform in the DOM (browser view)
    if (zoomGroup && originalTransform !== null) {
        if (window.LayoutLogic && typeof window.LayoutLogic.setTransform === 'function') {
            // Parse the original transform string to extract x, y, k
            const match = /translate\(([^,]+),([^\)]+)\) scale\(([^\)]+)\)/.exec(originalTransform);
            if (match) {
                const [, x, y, k] = match;
                window.LayoutLogic.setTransform({ x: parseFloat(x), y: parseFloat(y), k: parseFloat(k) });
            } else {
                zoomGroup.setAttribute('transform', originalTransform);
            }
        } else {
            zoomGroup.setAttribute('transform', originalTransform);
        }
    }

    const WIDTH = 14456 * 3;
    const HEIGHT = 1411 * 3;
    const LEGEND_WIDTH = 1800*9;
    // Original legend.png: 600x1250, textLegend.png: 800x634
    const LEFT_ORIG_W = 600, LEFT_ORIG_H = 1250;
    const RIGHT_ORIG_W = 800, RIGHT_ORIG_H = 634;
    const ORIGIN_W = 800, ORIGIN_H = 2000;

    clonedSvg.setAttribute('width', WIDTH);
    clonedSvg.setAttribute('height', HEIGHT);
    clonedSvg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', WIDTH);
    bgRect.setAttribute('height', HEIGHT);
    bgRect.setAttribute('fill', '#1a1a2e');
    clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);

    const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleEl.textContent = `
        .temporal-box { fill: rgba(255, 255, 255, 0.08); stroke: #b8b8d1; stroke-width: 2px; }
        .temporal-box-label { fill: #ffffff; font-size: 40px; text-anchor: middle; }
        .swimlane { fill: rgba(255, 255, 255, 0.02); stroke: #b8b8d1; stroke-width: 0.5px; stroke-dasharray: 2,2; }
        .swimlane-label { fill: #b8b8d1; font-size: 12px; text-anchor: start; }
        .node.jonas { fill: #00d9ff; }
        .node.martha { fill: #ff3cac; }
        .node.origin { fill: #9b59b6; }
        .node.start { fill: #69e8a8;}
        .node.other { fill:rgb(27, 28, 15); }
        .node-text { font-size: 16px; font-weight: 600; fill: #000000; pointer-events: none; }
        .edge { stroke: rgba(238, 242, 245, 0.9); stroke-width: 4px; fill: none; opacity: 0.9; }
        .summarized-edge { stroke: rgba(240, 240, 240, 0.75); stroke-width: 1.6px; stroke-dasharray: 4,3; fill: none; opacity: 0.85; }
        .time-travel-past-edge { stroke: rgba(100, 181, 246, 0.9); stroke-width: 4px; fill: none; opacity: 0.9; }
        .time-travel-future-edge { stroke: rgba(255, 152, 0, 0.9); stroke-width: 4px; fill: none; opacity: 0.9; }
        .transition-path.jonas { fill: #00d9ff; fill-opacity: 0.3; }
        .transition-path.martha { fill: #ff3cac; fill-opacity: 0.3; }
        .transition-path.other { fill: #0f0f1c; fill-opacity: 0.3; }
    `;
    clonedSvg.insertBefore(styleEl, clonedSvg.firstChild);

    // Convert SVG to PNG, then overlay the legend images on the left and right
    const svgString = new XMLSerializer().serializeToString(clonedSvg);
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // === Apply graph transform (offsets and scale) ===
        ctx.save();
        // ctx.setTransform(GRAPH_SCALE, 0, 0, GRAPH_SCALE, GRAPH_OFFSET_X, GRAPH_OFFSET_Y);
        ctx.drawImage(img, 0, 0, WIDTH, HEIGHT);
        ctx.restore();

        // Overlay the left legend image, preserving aspect ratio and centering vertically
        const legendImg = new window.Image();
        legendImg.onload = () => {
            const leftScale = Math.min(LEGEND_WIDTH / LEFT_ORIG_W, HEIGHT / LEFT_ORIG_H) * LEGEND_LEFT_SCALE;
            const leftW = LEFT_ORIG_W * leftScale;
            const leftH = LEFT_ORIG_H * leftScale;
            const leftX = 0 + LEGEND_LEFT_OFFSET_X;
            const leftY = (HEIGHT - leftH) / 2 + 20 + LEGEND_LEFT_OFFSET_Y; // Center vertically + offset
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset to default for legend
            ctx.drawImage(legendImg, leftX, leftY, leftW, leftH);
            ctx.restore();
            // Overlay the right legend image after the left is loaded
            const textLegendImg = new window.Image();
            textLegendImg.onload = () => {
                const rightScale = Math.min(LEGEND_WIDTH / RIGHT_ORIG_W, HEIGHT / RIGHT_ORIG_H) * LEGEND_RIGHT_SCALE;
                const rightW = RIGHT_ORIG_W * rightScale;
                const rightH = RIGHT_ORIG_H * rightScale;
                const rightX = WIDTH - rightW + LEGEND_RIGHT_OFFSET_X;
                const rightY = (HEIGHT - rightH) / 2 + LEGEND_RIGHT_OFFSET_Y; // Center vertically + offset
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset to default for legend
                ctx.drawImage(textLegendImg, rightX, rightY, rightW, rightH);
                ctx.restore();
                // === Add the origin_graph legend between left and right legends ===
                const originLegendImg = new window.Image();
                originLegendImg.onload = () => {
                    // Use ORIGIN_W and ORIGIN_H for scaling
                    const originScale = Math.min(LEGEND_WIDTH / ORIGIN_W, HEIGHT / ORIGIN_H) * LEGEND_ORIGIN_SCALE;
                    const originW = ORIGIN_W * originScale;
                    const originH = ORIGIN_H * originScale;
                    // Place it using freely controllable offset
                    const originX = WIDTH - LEGEND_ORIGIN_OFFSET_X;
                    const originY = (HEIGHT - originH) / 2 + LEGEND_ORIGIN_OFFSET_Y;
                    ctx.save();
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.drawImage(originLegendImg, originX, originY, originW, originH);
                    ctx.restore();
                    
                    // === Add uploaded images on top of everything ===
                    if (typeof ImageManager !== 'undefined') {
                        const uploadedImages = ImageManager.getImagesForExport();
                        if (uploadedImages.length > 0) {
                            // Apply the same transform as the graph (scale 3.0, translate 2000, 350)
                            const graphScale = 3.0;
                            const graphOffsetX = 2000;
                            const graphOffsetY = 350;
                            
                            uploadedImages.forEach(imageData => {
                                const customImg = new window.Image();
                                customImg.onload = () => {
                                    // Calculate scaled dimensions
                                    const scaledWidth = imageData.originalWidth * imageData.scale * graphScale;
                                    const scaledHeight = imageData.originalHeight * imageData.scale * graphScale;
                                    
                                    // Calculate position with graph transform applied
                                    const scaledX = imageData.x * graphScale + graphOffsetX - scaledWidth / 2;
                                    const scaledY = imageData.y * graphScale + graphOffsetY - scaledHeight / 2;
                                    
                                    ctx.save();
                                    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset to default for custom images
                                    ctx.drawImage(customImg, scaledX, scaledY, scaledWidth, scaledHeight);
                                    ctx.restore();
                                    
                                    // Check if this is the last image to save the final PNG
                                    const isLastImage = uploadedImages.indexOf(imageData) === uploadedImages.length - 1;
                                    if (isLastImage) {
                                        canvas.toBlob((blob) => {
                                            const link = document.createElement('a');
                                            link.href = URL.createObjectURL(blob);
                                            link.download = 'dark-graph-12288x1200.png';
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                        }, 'image/png');
                                    }
                                };
                                customImg.src = imageData.dataUrl;
                            });
                        } else {
                            // No uploaded images, save immediately
                            canvas.toBlob((blob) => {
                                const link = document.createElement('a');
                                link.href = URL.createObjectURL(blob);
                                link.download = 'dark-graph-12288x1200.png';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }, 'image/png');
                        }
                    } else {
                        // ImageManager not available, save immediately
                        canvas.toBlob((blob) => {
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.download = 'dark-graph-12288x1200.png';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }, 'image/png');
                    }
                };
                originLegendImg.src = 'images/origin_graph.png';
            };
            textLegendImg.src = 'images/legend/textLegend.png';
        };
        legendImg.src = 'images/legend/legend.png';
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
};

