/**
 * Main JavaScript file for Dark Series Visualization
 * Orchestrates data loading and visualization initialization
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Dark Series Visualization...');
    
    // Show loading indicator
    const container = document.getElementById('visualization-container');
    container.innerHTML += '<div class="loading">Loading data...</div>';
    
    // Load data
    DataParser.loadData()
        .then(data => {
            console.log('Data loaded successfully');
            console.log(`Events: ${data.events.length}, Edges: ${data.edges.length}`);
            console.log(`Time ranges: ${data.timeRanges.length}`);
            
            // Remove loading indicator
            document.querySelector('.loading').remove();
            
            // Initialize visualization
            Visualization.initialize(data);
        })
        .catch(error => {
            console.error('Error loading data:', error);
            container.innerHTML = `<div class="error">Error loading data: ${error.message}</div>`;
        });
});

// Add loading and error styles
const style = document.createElement('style');
style.textContent = `
    .loading, .error {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 20px;
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        border-radius: 8px;
        text-align: center;
        font-size: 18px;
    }
    
    .error {
        background-color: rgba(220, 53, 69, 0.8);
        max-width: 80%;
    }
`;
document.head.appendChild(style);
