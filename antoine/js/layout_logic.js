/**
 * Layout Logic Module for Dark Series Visualization
 * Handles positioning of temporal boxes, swimlanes, and nodes
 */

const LayoutLogic = (() => {
    // Constants for layout dimensions
    const MARGIN = { top: 50, right: 50, bottom: 50, left: 150 };
    const BOX_SPACING = 40;
    const BOX_MIN_WIDTH = 150;
    const BOX_MAX_WIDTH = 350;
    const MIN_SWIMLANE_HEIGHT = 60;
    const NODE_RADIUS = 6;
    const NODE_MARGIN = 30;
    const TRANSITION_CURVE_FACTOR = 0.5;
    
    // Main characters for swimlanes
    const MAIN_CHARACTERS = [
        'Jonas Kahnwald / Adam (J)',
        'Martha Nielsen / Eve (M)'
    ];
    
    // Private variables
    let svg;
    let width;
    let height;
    let zoom;
    let timeRanges = [];
    let temporalBoxes = [];
    let swimlanes = [];
    let nodePositions = {};
    
    /**
     * Initialize the layout with SVG container
     * @param {Object} svgElement - D3 selection of SVG element
     */
    const initialize = svgElement => {
        svg = svgElement;
        updateDimensions();
        
        // Set up zoom behavior
        zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', event => {
                svg.select('g.zoom-group').attr('transform', event.transform);
            });
        
        svg.call(zoom);
        
        // Create main group for zooming
        if (svg.select('g.zoom-group').empty()) {
            svg.append('g')
                .attr('class', 'zoom-group')
                .attr('transform', 'translate(0,0) scale(1)');
        }
        
        // Add arrow marker definition for edges
        const defs = svg.append('defs');
        
        defs.append('marker')
            .attr('id', 'arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 8)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .attr('class', 'edge-marker')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5');
    };
    
    /**
     * Update dimensions based on container size
     */
    const updateDimensions = () => {
        const container = d3.select('#visualization-container');
        width = container.node().clientWidth;
        height = container.node().clientHeight;
        
        svg.attr('width', width)
           .attr('height', height);
    };
    
    /**
     * Calculate layout based on data
     * @param {Object} data - Object containing events, edges, and time ranges
     */
    const calculateLayout = data => {
        timeRanges = data.timeRanges;
        
        // Calculate variable widths based on event count and time span
        const totalEvents = data.events.length;
        const totalTimeSpan = Math.max(...timeRanges.map(r => r.end)) - Math.min(...timeRanges.map(r => r.start));
        
        // Calculate width scale factors based on both event count and time span
        const eventCountScale = timeRanges.map(range => range.eventCount / totalEvents);
        const timeSpanScale = timeRanges.map(range => (range.end - range.start) / totalTimeSpan);
        
        // Combine both factors (0.7 weight to event count, 0.3 to time span)
        const combinedScaleFactors = eventCountScale.map((count, i) => count * 0.7 + timeSpanScale[i] * 0.3);
        
        // Normalize to ensure sum equals 1
        const sum = combinedScaleFactors.reduce((a, b) => a + b, 0);
        const normalizedFactors = combinedScaleFactors.map(factor => factor / sum);
        
        // Calculate total available width for all boxes
        const totalAvailableWidth = width - MARGIN.left - MARGIN.right - (timeRanges.length - 1) * BOX_SPACING;
        
        // Calculate box widths based on normalized factors
        const boxWidths = normalizedFactors.map(factor => {
            return Math.max(BOX_MIN_WIDTH, Math.min(BOX_MAX_WIDTH, factor * totalAvailableWidth));
        });
        
        // Recalculate if any box exceeds max width
        const totalCalculatedWidth = boxWidths.reduce((a, b) => a + b, 0);
        if (totalCalculatedWidth > totalAvailableWidth) {
            const scale = totalAvailableWidth / totalCalculatedWidth;
            for (let i = 0; i < boxWidths.length; i++) {
                boxWidths[i] = Math.max(BOX_MIN_WIDTH, boxWidths[i] * scale);
            }
        }
        
        // Calculate positions for temporal boxes
        let currentX = MARGIN.left;
        temporalBoxes = timeRanges.map((range, i) => {
            const box = {
                ...range,
                x: currentX,
                y: MARGIN.top,
                width: boxWidths[i],
                height: height - MARGIN.top - MARGIN.bottom
            };
            currentX += box.width + BOX_SPACING;
            return box;
        });
        
        // Calculate swimlanes for each temporal box
        calculateSwimlanes(data);
        
        // Calculate node positions
        calculateNodePositions(data);
        
        return {
            temporalBoxes,
            swimlanes,
            nodePositions
        };
    };
    
    /**
     * Calculate swimlanes for each temporal box
     * @param {Object} data - Object containing events, edges, and time ranges
     */
    const calculateSwimlanes = data => {
        swimlanes = [];
        
        // For each temporal box, create swimlanes
        temporalBoxes.forEach(box => {
            const eventsInRange = DataParser.getEventsInTimeRange(box);
            
            // Create swimlanes for main characters and 'other'
            const lanes = [];
            
            // Jonas lane
            const jonasEvents = eventsInRange.filter(event => 
                event.characters && event.characters.some(char => 
                    char.includes('Jonas') || char.includes('Adam (J)')
                )
            );
            
            // Martha lane
            const marthaEvents = eventsInRange.filter(event => 
                event.characters && event.characters.some(char => 
                    char.includes('Martha') || char.includes('Eve (M)')
                )
            );
            
            // Find the next most frequent character in this time range
            const characterCounts = {};
            eventsInRange.forEach(event => {
                if (event.characters) {
                    event.characters.forEach(char => {
                        if (!char.includes('Jonas') && !char.includes('Adam (J)') && 
                            !char.includes('Martha') && !char.includes('Eve (M)')) {
                            characterCounts[char] = (characterCounts[char] || 0) + 1;
                        }
                    });
                }
            });
            
            // Sort characters by count
            const sortedChars = Object.entries(characterCounts)
                .sort((a, b) => b[1] - a[1])
                .map(entry => entry[0]);
            
            // Add third most frequent character if available
            let thirdCharacter = null;
            let thirdCharacterEvents = [];
            
            if (sortedChars.length > 0) {
                thirdCharacter = sortedChars[0];
                thirdCharacterEvents = eventsInRange.filter(event => 
                    event.characters && event.characters.includes(thirdCharacter)
                );
            }
            
            // Other events (not in Jonas, Martha, or third character lanes)
            const otherEvents = eventsInRange.filter(event => {
                if (!event.characters || event.characters.length === 0) return true;
                
                const isJonas = event.characters.some(char => 
                    char.includes('Jonas') || char.includes('Adam (J)')
                );
                
                const isMartha = event.characters.some(char => 
                    char.includes('Martha') || char.includes('Eve (M)')
                );
                
                const isThird = thirdCharacter && event.characters.includes(thirdCharacter);
                
                return !isJonas && !isMartha && !isThird;
            });
            
            // Calculate lane heights proportionally to event counts
            const totalEvents = eventsInRange.length || 1; // Avoid division by zero
            
            // Calculate proportional heights based on event counts
            const jonasRatio = Math.max(0.1, jonasEvents.length / totalEvents);
            const marthaRatio = Math.max(0.1, marthaEvents.length / totalEvents);
            const thirdRatio = thirdCharacterEvents.length ? Math.max(0.1, thirdCharacterEvents.length / totalEvents) : 0;
            const otherRatio = Math.max(0.1, otherEvents.length / totalEvents);
            
            // Normalize ratios to sum to 1
            const totalRatio = jonasRatio + marthaRatio + (thirdRatio || 0) + otherRatio;
            const normalizedJonasRatio = jonasRatio / totalRatio;
            const normalizedMarthaRatio = marthaRatio / totalRatio;
            const normalizedThirdRatio = thirdRatio / totalRatio;
            const normalizedOtherRatio = otherRatio / totalRatio;
            
            // Calculate actual heights ensuring minimum height
            const availableHeight = box.height - 20; // 20px for padding
            
            // Create swimlane objects with variable heights
            const jonasHeight = Math.max(MIN_SWIMLANE_HEIGHT, normalizedJonasRatio * availableHeight);
            const marthaHeight = Math.max(MIN_SWIMLANE_HEIGHT, normalizedMarthaRatio * availableHeight);
            const thirdHeight = thirdCharacter ? Math.max(MIN_SWIMLANE_HEIGHT, normalizedThirdRatio * availableHeight) : 0;
            const otherHeight = Math.max(MIN_SWIMLANE_HEIGHT, normalizedOtherRatio * availableHeight);
            
            // Recalculate if total exceeds available height
            const totalHeight = jonasHeight + marthaHeight + (thirdHeight || 0) + otherHeight;
            const heightScale = totalHeight > availableHeight ? availableHeight / totalHeight : 1;
            
            // Apply scale if needed
            const scaledJonasHeight = jonasHeight * heightScale;
            const scaledMarthaHeight = marthaHeight * heightScale;
            const scaledThirdHeight = thirdHeight * heightScale;
            const scaledOtherHeight = otherHeight * heightScale;
            
            // Create swimlane objects
            const jonasLane = {
                character: 'Jonas Kahnwald / Adam (J)',
                shortName: 'Jonas',
                type: 'jonas',
                x: box.x,
                y: box.y + 10,
                width: box.width,
                height: scaledJonasHeight,
                events: jonasEvents,
                eventCount: jonasEvents.length,
                ratio: normalizedJonasRatio
            };
            
            const marthaLane = {
                character: 'Martha Nielsen / Eve (M)',
                shortName: 'Martha',
                type: 'martha',
                x: box.x,
                y: jonasLane.y + jonasLane.height,
                width: box.width,
                height: scaledMarthaHeight,
                events: marthaEvents,
                eventCount: marthaEvents.length,
                ratio: normalizedMarthaRatio
            };
            
            let thirdLane = null;
            if (thirdCharacter) {
                thirdLane = {
                    character: thirdCharacter,
                    shortName: thirdCharacter.split(' ')[0],
                    type: 'other',
                    x: box.x,
                    y: marthaLane.y + marthaLane.height,
                    width: box.width,
                    height: scaledThirdHeight,
                    events: thirdCharacterEvents,
                    eventCount: thirdCharacterEvents.length,
                    ratio: normalizedThirdRatio
                };
            }
            
            const otherLane = {
                character: 'Other Characters',
                shortName: 'Others',
                type: 'other',
                x: box.x,
                y: thirdLane ? thirdLane.y + thirdLane.height : marthaLane.y + marthaLane.height,
                width: box.width,
                height: scaledOtherHeight,
                events: otherEvents,
                eventCount: otherEvents.length,
                ratio: normalizedOtherRatio
            };
            
            // Add lanes to the swimlanes array with reference to their temporal box
            lanes.push(jonasLane, marthaLane);
            if (thirdLane) lanes.push(thirdLane);
            lanes.push(otherLane);
            
            swimlanes.push({
                timeRange: box,
                lanes
            });
        });
    };
    
    /**
     * Calculate positions for all nodes
     * @param {Object} data - Object containing events, edges, and time ranges
     */
    const calculateNodePositions = data => {
        nodePositions = {};
        
        // Position nodes within each swimlane with collision detection
        swimlanes.forEach(swimlane => {
            const timeRange = swimlane.timeRange;
            
            swimlane.lanes.forEach(lane => {
                // Sort events by date
                const sortedEvents = [...lane.events].sort((a, b) => a.date - b.date);
                const placedNodes = []; // Keep track of already placed nodes for collision detection
                
                // Calculate horizontal position based on date within the time range
                sortedEvents.forEach((event, i) => {
                    const datePosition = (event.date - new Date(timeRange.start, 0, 1)) / 
                                        (new Date(timeRange.end + 1, 0, 1) - new Date(timeRange.start, 0, 1));
                    
                    // Initial position
                    const initialX = lane.x + 20 + (lane.width - 40) * Math.max(0, Math.min(1, datePosition));
                    const initialY = lane.y + lane.height / 2;
                    
                    // Check for collisions and adjust position
                    let finalX = initialX;
                    let finalY = initialY;
                    let collisionFound = true;
                    let attempts = 0;
                    const maxAttempts = 50;
                    const nodeSize = event.importantTrigger ? NODE_RADIUS * 1.5 : NODE_RADIUS;
                    
                    while (collisionFound && attempts < maxAttempts) {
                        collisionFound = false;
                        
                        // Check against all placed nodes
                        for (const placedNode of placedNodes) {
                            const dx = finalX - placedNode.x;
                            const dy = finalY - placedNode.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            const minDistance = nodeSize + NODE_RADIUS + 2; // Minimum distance between nodes
                            
                            if (distance < minDistance) {
                                collisionFound = true;
                                
                                // Try to adjust vertically first (within lane bounds)
                                const verticalSpace = lane.height - 2 * nodeSize;
                                const verticalOffset = (attempts % 2 === 0 ? 1 : -1) * Math.min(5, verticalSpace / 4);
                                
                                // Check if vertical adjustment would exceed lane bounds
                                const newY = finalY + verticalOffset;
                                if (newY >= lane.y + nodeSize && newY <= lane.y + lane.height - nodeSize) {
                                    finalY = newY;
                                } else {
                                    // If vertical adjustment fails, try horizontal
                                    const horizontalOffset = (attempts % 2 === 0 ? 1 : -1) * Math.min(5, lane.width / 20);
                                    finalX = finalX + horizontalOffset;
                                }
                                break;
                            }
                        }
                        
                        attempts++;
                    }
                    
                    // Store the final position
                    nodePositions[event.id] = {
                        x: finalX,
                        y: finalY,
                        lane: lane.type,
                        timeRange
                    };
                    
                    // Add to placed nodes for future collision detection
                    placedNodes.push(nodePositions[event.id]);
                });
            });
        });
        
        // Reposition start nodes near their earliest target temporal box
        const startNodes = data.startNodes || [];
        
        startNodes.forEach((startNode, index) => {
            // Find all outgoing edges from this start node
            const outgoingEdges = data.edges.filter(edge => edge.source === startNode.id);
            
            if (outgoingEdges.length > 0) {
                // Find the earliest target event
                const targetEventIds = outgoingEdges.map(edge => edge.target);
                const targetEvents = data.events.filter(event => targetEventIds.includes(event.id));
                
                if (targetEvents.length > 0) {
                    // Sort by date and get the earliest
                    const earliestTarget = [...targetEvents].sort((a, b) => a.date - b.date)[0];
                    const targetPosition = nodePositions[earliestTarget.id];
                    
                    if (targetPosition) {
                        // Find the temporal box containing this target
                        const targetBox = temporalBoxes.find(box => 
                            box.start <= earliestTarget.year && box.end >= earliestTarget.year
                        );
                        
                        if (targetBox) {
                            // Position start node just before the target box
                            // Alternate above/below for multiple start nodes pointing to the same box
                            const isAbove = index % 2 === 0;
                            const xPos = targetBox.x - NODE_MARGIN;
                            const yPos = isAbove ? 
                                targetBox.y - NODE_MARGIN : 
                                targetBox.y + targetBox.height + NODE_MARGIN;
                            
                            nodePositions[startNode.id] = {
                                x: xPos,
                                y: yPos,
                                lane: 'start',
                                timeRange: null
                            };
                        }
                    }
                }
            }
        });
        
        // For any start nodes that weren't assigned a position (no outgoing edges found)
        // place them at the left edge of the first temporal box
        startNodes.forEach((node, i) => {
            if (!nodePositions[node.id] && temporalBoxes.length > 0) {
                const firstBox = temporalBoxes[0];
                nodePositions[node.id] = {
                    x: firstBox.x - NODE_MARGIN,
                    y: firstBox.y + (i % 2 === 0 ? -NODE_MARGIN : firstBox.height + NODE_MARGIN),
                    lane: 'start',
                    timeRange: null
                };
            }
        });
    };
    
    /**
     * Generate path for a smooth transition between swimlanes
     * @param {Object} sourceLane - Source swimlane
     * @param {Object} targetLane - Target swimlane
     * @returns {String} SVG path string
     */
    const generateTransitionPath = (sourceLane, targetLane) => {
        // Calculate source coordinates (right edge of source lane)
        const sourceX = sourceLane.x + sourceLane.width;
        const sourceYTop = sourceLane.y;
        const sourceYBottom = sourceLane.y + sourceLane.height;
        
        // Calculate target coordinates (left edge of target lane)
        const targetX = targetLane.x;
        const targetYTop = targetLane.y;
        const targetYBottom = targetLane.y + targetLane.height;
        
        // Calculate control points for smooth curves
        const distance = targetX - sourceX;
        const controlX1 = sourceX + distance * TRANSITION_CURVE_FACTOR;
        const controlX2 = targetX - distance * TRANSITION_CURVE_FACTOR;
        
        // Generate path for a smooth area connecting the swimlanes
        return `
            M ${sourceX} ${sourceYTop}
            C ${controlX1} ${sourceYTop}, ${controlX2} ${targetYTop}, ${targetX} ${targetYTop}
            L ${targetX} ${targetYBottom}
            C ${controlX2} ${targetYBottom}, ${controlX1} ${sourceYBottom}, ${sourceX} ${sourceYBottom}
            Z
        `;
    };
    
    /**
     * Generate path for an edge between nodes
     * @param {Object} source - Source node position
     * @param {Object} target - Target node position
     * @param {Boolean} isSummarized - Whether this is a summarized edge
     * @returns {String} SVG path string
     */
    const generateEdgePath = (source, target, isSummarized) => {
        // If nodes are in the same swimlane, use a simple curved path
        if (source.timeRange === target.timeRange && source.lane === target.lane) {
            const midX = (source.x + target.x) / 2;
            const controlY = (source.y + target.y) / 2 - 30;
            
            return `M ${source.x} ${source.y} Q ${midX} ${controlY} ${target.x} ${target.y}`;
        }
        
        // For nodes in different swimlanes or time ranges, use a more complex path
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Adjust control points based on distance
        const controlDistance = Math.min(100, distance / 3);
        
        // Calculate control points
        const angle = Math.atan2(dy, dx);
        const sourceControlX = source.x + controlDistance * Math.cos(angle);
        const sourceControlY = source.y + controlDistance * Math.sin(angle);
        const targetControlX = target.x - controlDistance * Math.cos(angle);
        const targetControlY = target.y - controlDistance * Math.sin(angle);
        
        return `M ${source.x} ${source.y} C ${sourceControlX} ${sourceControlY}, ${targetControlX} ${targetControlY}, ${target.x} ${target.y}`;
    };
    
    /**
     * Reset zoom to default view
     */
    const resetZoom = () => {
        svg.transition().duration(750).call(
            zoom.transform,
            d3.zoomIdentity.translate(0, 0).scale(1)
        );
    };
    
    // Public API
    return {
        initialize,
        updateDimensions,
        calculateLayout,
        generateTransitionPath,
        generateEdgePath,
        resetZoom
    };
})();
