/**
 * Layout Logic Module for Dark Series Visualization
 * Handles positioning of temporal boxes, swimlanes, and nodes
 */

const LayoutLogic = (() => {

    // Fixed dimensions for the graph (12288 x 1200 pixels)
    const FIXED_WIDTH = 12288;
    const FIXED_HEIGHT = 1200;
    const ASPECT_RATIO = FIXED_WIDTH / FIXED_HEIGHT; // 10.24:1


    // Constants for layout dimensions
    const MARGIN = { top: FIXED_HEIGHT*0.08, right: FIXED_WIDTH*0.03, bottom: FIXED_HEIGHT*0.08, left: FIXED_WIDTH*0.03 };
    const BOX_SPACING = FIXED_WIDTH*0.025; // Increased spacing between temporal boxes
    const BOX_MIN_WIDTH = FIXED_WIDTH*0.028; // Much wider minimum box width to utilize full graph width
    const BOX_MAX_WIDTH = FIXED_WIDTH*0.18; // Much wider maximum box width
    const MIN_SWIMLANE_HEIGHT = FIXED_HEIGHT*0.06; // Increased height for swimlanes
    // Node dimensions for rectangular nodes
    const NODE_WIDTH = FIXED_WIDTH*0.012;
    const NODE_HEIGHT = FIXED_HEIGHT*0.06;
    const NODE_RADIUS = FIXED_WIDTH*0.028; // Keep for backwards compatibility
    const NODE_MARGIN = FIXED_WIDTH*0.025; // Increased margin between nodes
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
        // Log message to verify new code is loaded
        console.log('DARK Visualization - New layout with fixed dimensions loaded');
        
        svg = svgElement;
        updateDimensions();
        
        // Set up zoom behavior - using original parameters
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
     * Set the visualization to fixed dimensions (12288 x 1200 pixels)
     */
    const updateDimensions = () => {
        const container = d3.select('#visualization-container');
        
        // Use our fixed dimensions
        width = FIXED_WIDTH;
        height = FIXED_HEIGHT;
        
        // Configure container for proper scrolling of the large visualization
        container
            .style('height', '80vh')
            .style('overflow', 'auto');
        
        // Set SVG dimensions
        svg.attr('width', width)
           .attr('height', height);
        
        console.log(`DARK Visualization set to fixed dimensions: ${width} x ${height} pixels`);
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
    
    const getTemporalBoxForEvent = event => {
        return temporalBoxes.find(box =>
            box.start <= event.year && box.end >= event.year
        );
    };
    
    const getSwimlaneForEvent = event => {
        // Find the swimlane that includes this event
        for (const swimlaneObj of swimlanes) {
            for (const lane of swimlaneObj.lanes) {
                if (lane.events.some(e => e.id === event.id)) {
                    return lane;
                }
            }
        }
        return null;
    };
    

    /**
     * Calculate positions for all nodes
     * @param {Object} data - Object containing events, edges, and time ranges
     */
    const calculateNodePositions = data => {
        nodePositions = {};
    
        // Create simulation nodes: clone events with swimlane & box info
        const nodes = data.events.map(event => {
            const swimlane = getSwimlaneForEvent(event);
            const box = getTemporalBoxForEvent(event);
    
            return {
                ...event,
                swimlane,
                box,
                x: box.x + box.width / 2,
                y: swimlane.y + swimlane.height / 2
            };
        });
    
        // Create links from edges
        const links = data.edges.map(edge => ({
            source: edge.source,
            target: edge.target
        }));
    
        // Create the simulation
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(NODE_WIDTH).strength(0.1))
            .force("charge", d3.forceManyBody().strength(-150)) // Increased repulsion
            .force("collision", d3.forceCollide().radius(d => Math.sqrt((NODE_WIDTH/2)**2 + (NODE_HEIGHT/2)**2) + 10)) // Diagonal radius of rectangle + padding
            .force("boxX", d3.forceX(d => d.box.x + d.box.width / 2).strength(0.05))
            .force("swimlaneY", d3.forceY(d => d.swimlane.y + d.swimlane.height / 2).strength(0.1))
            .stop();
    
        // Run the simulation for a set number of ticks
        for (let i = 0; i < 300; i++) {
            simulation.tick();
        }
    
        // Clamp nodes back within their boxes
        nodes.forEach(node => {
            // Use half width/height to ensure node center stays within box boundaries
            const halfWidth = NODE_WIDTH / 2;
            const halfHeight = NODE_HEIGHT / 2;
            const lane = node.swimlane;
            
            // Add some padding to avoid touching edges
            const padding = 10;
            
            // Clamp node position to ensure the entire rectangle stays within the lane
            node.x = Math.max(lane.x + halfWidth + padding, 
                        Math.min(lane.x + lane.width - halfWidth - padding, node.x));
            node.y = Math.max(lane.y + halfHeight + padding, 
                        Math.min(lane.y + lane.height - halfHeight - padding, node.y));
    
            nodePositions[node.id] = {
                x: node.x,
                y: node.y,
                lane: lane.type,
                timeRange: node.box
            };
        });

        // Handle start nodes - nodes that have only outgoing edges
        const startNodes = [];
        data.events.forEach(event => {
            const incomingEdges = data.edges.filter(edge => edge.target === event.id);
            const outgoingEdges = data.edges.filter(edge => edge.source === event.id);
            
            if (incomingEdges.length === 0 && outgoingEdges.length > 0) {
                startNodes.push(event);
            }
        });
        
        // Group start nodes by target temporal box for better positioning
        const startNodesByBox = {};
        
        // First, analyze and group start nodes by their target temporal box
        startNodes.forEach(startNode => {
            const outgoingEdges = data.edges.filter(edge => edge.source === startNode.id);
            
            if (outgoingEdges.length > 0) {
                const targetEventIds = outgoingEdges.map(edge => edge.target);
                const targetEvents = data.events.filter(event => targetEventIds.includes(event.id));
                
                if (targetEvents.length > 0) {
                    // Find the earliest target event
                    const earliestTarget = [...targetEvents].sort((a, b) => a.date - b.date)[0];
                    const targetBox = getTemporalBoxForEvent(earliestTarget);
                    
                    if (targetBox) {
                        // Group by target box ID
                        const boxId = targetBox.start + '-' + targetBox.end;
                        if (!startNodesByBox[boxId]) {
                            startNodesByBox[boxId] = {
                                box: targetBox,
                                nodes: []
                            };
                        }
                        startNodesByBox[boxId].nodes.push({
                            node: startNode,
                            targetEvent: earliestTarget
                        });
                    }
                }
            }
        });
        
        // Now position start nodes horizontally next to their target boxes
        Object.keys(startNodesByBox).forEach(boxId => {
            const { box, nodes } = startNodesByBox[boxId];
            const NODE_MARGIN = 20; // Space between nodes
            
            // Position nodes in two rows if there are more than 3 nodes
            const numNodes = nodes.length;
            const maxNodesPerRow = Math.ceil(numNodes / 2);
            
            nodes.forEach((nodeInfo, i) => {
                const row = i < maxNodesPerRow ? 0 : 1; // 0 = top row, 1 = bottom row
                const col = i % maxNodesPerRow;
                
                // Position horizontally outside the box
                const xOffset = box.x - NODE_WIDTH - NODE_MARGIN - (col * (NODE_WIDTH + NODE_MARGIN));
                
                // Position either above or below the box depending on row
                let yPos;
                if (row === 0) {
                    // Top row positioned above the box
                    yPos = box.y - NODE_HEIGHT - NODE_MARGIN;
                } else {
                    // Bottom row positioned below the box
                    yPos = box.y + box.height + NODE_MARGIN;
                }
                
                // Store the position
                nodePositions[nodeInfo.node.id] = {
                    x: xOffset,
                    y: yPos,
                    lane: 'start',
                    timeRange: null
                };
            });
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
