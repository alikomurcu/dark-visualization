/**
 * Data Parser Module for Dark Series Visualization
 * Handles loading and processing CSV data files
 */

const DataParser = (() => {
    // Private variables
    let events = [];
    let edges = [];
    let timeRanges = [];
    let characterCounts = {};
    let startNodes = [];
    
    // Date parser function
    const parseDate = dateStr => {
        const [day, month, year] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    };
    
    /**
     * Load and parse the CSV data files
     * @returns {Promise} Promise that resolves when data is loaded
     */
    const loadData = () => {
        return Promise.all([
            d3.csv('data/Dark_Events.csv'),
            d3.csv('data/Dark_Edges.csv')
        ]).then(([eventsData, edgesData]) => {
            // Process events data
            events = eventsData.map(event => ({
                id: +event.ID,
                description: event.Description,
                date: parseDate(event.Date),
                year: parseDate(event.Date).getFullYear(),
                importantTrigger: event['Important Trigger'] === 'TRUE',
                death: event['Death'] === 'TRUE',
                characters: event.Characters ? event.Characters.split(',').map(c => c.trim()) : [],
                world: event.World,
                isRomantic: isRomantic(event.Description) || isRomantic(event.Characters),
                isMissing: isMissingPerson(event.Description) || isMissingPerson(event.Characters),
                isTimeTravel: isTimeTravelEvent(event.Description) || isTimeTravelEvent(event.Characters)
            })).filter(event => event.isRomantic || event.isMissing || event.isTimeTravel);

            console.log("Number of events:", events.length);
            // Get set of important event IDs for edge filtering
            const eventIds = new Set(events.map(event => event.id));

            // Process edges data - only keep edges between important events
            edges = edgesData
                .filter(edge => edge.Source && edge.Target)
                .map(edge => ({
                    id: +edge.ID,
                    source: +edge.Source,
                    target: +edge.Target,
                    type: edge.Type,
                    description: edge.Description
                }))
                .filter(edge => 
                    eventIds.has(edge.source) && 
                    eventIds.has(edge.target)
                );
            
            // Identify start nodes (nodes with no incoming edges)
            const targetNodeIds = new Set(edges.map(edge => edge.target));
            startNodes = events.filter(event => !targetNodeIds.has(event.id));
            
            // Count character appearances
            characterCounts = countCharacterAppearances();
            
            // Determine time ranges for temporal boxes
            timeRanges = determineTimeRanges();
            
            return { events, edges, timeRanges, characterCounts, startNodes };
        });
    };
    
    /**
     * Count appearances of each character across all events
     * @returns {Object} Object with character names as keys and counts as values
     */
    const countCharacterAppearances = () => {
        const counts = {};
        events.forEach(event => {
            if (event.characters) {
                event.characters.forEach(character => {
                    counts[character] = (counts[character] || 0) + 1;
                });
            }
        });
        return counts;
    };
    
    /**
     * Determine time ranges for temporal boxes based on event clustering
     * @returns {Array} Array of time range objects
     */
    const determineTimeRanges = () => {
        // Get all unique years from events
        const years = [...new Set(events.map(event => event.year))];
        years.sort((a, b) => a - b);
        
        // Group years into ranges based on proximity
        const ranges = [];
        let currentRange = [years[0]];
        
        for (let i = 1; i < years.length; i++) {
            const gap = years[i] - years[i-1];
            
            // If gap is small or there are many events in these years, keep in same range
            if (gap <= 5) {
                currentRange.push(years[i]);
            } else {
                // Start a new range
                ranges.push({
                    start: Math.min(...currentRange),
                    end: Math.max(...currentRange),
                    years: [...currentRange]
                });
                currentRange = [years[i]];
            }
        }
        
        // Add the last range
        if (currentRange.length > 0) {
            ranges.push({
                start: Math.min(...currentRange),
                end: Math.max(...currentRange),
                years: [...currentRange]
            });
        }
        
        // Calculate event counts for each range
        ranges.forEach(range => {
            range.eventCount = events.filter(event => 
                event.year >= range.start && event.year <= range.end
            ).length;
        });
        
        return ranges;
    };
    
    /**
     * Get events for a specific time range
     * @param {Object} range - Time range object with start and end years
     * @returns {Array} Filtered events within the time range
     */
    const getEventsInTimeRange = range => {
        return events.filter(event => 
            event.year >= range.start && event.year <= range.end
        );
    };
    
    /**
     * Get events for a specific character
     * @param {String} character - Character name
     * @returns {Array} Filtered events involving the character
     */
    const getEventsForCharacter = character => {
        return events.filter(event => 
            event.characters && event.characters.includes(character)
        );
    };
    
    /**
     * Get events for a specific character within a time range
     * @param {String} character - Character name
     * @param {Object} range - Time range object with start and end years
     * @returns {Array} Filtered events involving the character within the time range
     */
    const getEventsForCharacterInTimeRange = (character, range) => {
        return events.filter(event => 
            event.year >= range.start && 
            event.year <= range.end && 
            event.characters && 
            event.characters.includes(character)
        );
    };
    
    /**
     * Determine the primary character for an event
     * @param {Object} event - Event object
     * @returns {String} Primary character category ('jonas', 'martha', or 'other')
     */
    const getPrimaryCharacter = event => {
        if (!event.characters || event.characters.length === 0) {
            return 'other';
        }
        
        // Check for Jonas
        if (event.characters.some(char => char.includes('Jonas') || char.includes('Adam (J)'))) {
            return 'jonas';
        }
        
        // Check for Martha
        if (event.characters.some(char => char.includes('Martha') || char.includes('Eve (M)'))) {
            return 'martha';
        }
        
        // Otherwise return the first character or 'other'
        return 'other';
    };
    
    /**
     * Get all edges between events in different time ranges
     * @returns {Array} Edges that span across time ranges
     */
    const getCrossTimeRangeEdges = () => {
        return edges.filter(edge => {
            const sourceEvent = events.find(e => e.id === edge.source);
            const targetEvent = events.find(e => e.id === edge.target);
            
            if (!sourceEvent || !targetEvent) return false;
            
            return sourceEvent.year !== targetEvent.year;
        });
    };
    
    /**
     * Get all edges for events within a specific time range
     * @param {Object} range - Time range object with start and end years
     * @returns {Array} Edges connecting events within the time range
     */
    const getEdgesInTimeRange = range => {
        const eventsInRange = getEventsInTimeRange(range).map(e => e.id);
        
        return edges.filter(edge => 
            eventsInRange.includes(edge.source) && eventsInRange.includes(edge.target)
        );
    };
    
    /**
     * Determine if an edge should be displayed as a summarized edge
     * @param {Object} edge - Edge object
     * @returns {Boolean} True if edge should be summarized
     */
    const isSummarizedEdge = edge => {
        // Check if there are intermediate nodes between source and target
        const sourceEvent = events.find(e => e.id === edge.source);
        const targetEvent = events.find(e => e.id === edge.target);
        
        if (!sourceEvent || !targetEvent) return false;
        
        // If events are in different time ranges, mark as summarized
        if (sourceEvent.year !== targetEvent.year) {
            return true;
        }
        
        // Check if there's a path with intermediate nodes
        // This is a simplified check - a more thorough approach would use graph traversal
        const intermediateEdges = edges.filter(e => 
            (e.source === edge.source && e.target !== edge.target) ||
            (e.source !== edge.source && e.target === edge.target)
        );
        
        return intermediateEdges.length > 0;
    };

    const romanticKeywords = [
        "love", "marry", "marriage", "affair", "romantic", "husband", "wife", 
        "boyfriend", "girlfriend", "relationship", "lover", "engage", "fiancé", "fiancée"
    ];

    // Helper function to check for romantic keywords
    const isRomantic = text => {
        if (!text) return false;
        const lower = text.toLowerCase();
        return romanticKeywords.some(keyword => lower.includes(keyword));
    };

    const missingKeywords = [
        "missing", "disappear", "abducted", "gone", "lost", "vanished", "kidnapped"
    ];

    const isMissingPerson = text => {
        if (!text) return false;
        const lower = text.toLowerCase();
        return missingKeywords.some(keyword => lower.includes(keyword));
    };

    const timeTravelKeywords = [
        "travels", "travel to",
        "wormhole", "time portal", "sends", "arrive", "use the"
    
    ];

    const isTimeTravelEvent = text => {
        if (!text) return false;
        const lower = text.toLowerCase();
        return timeTravelKeywords.some(keyword => lower.includes(keyword));
    };
    
    

    // Public API
    return {
        loadData,
        getEventsInTimeRange,
        getEventsForCharacter,
        getEventsForCharacterInTimeRange,
        getPrimaryCharacter,
        getCrossTimeRangeEdges,
        getEdgesInTimeRange,
        isSummarizedEdge
    };
})();
