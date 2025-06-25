/**
 * Image Manager Module for Dark Series Graph
 * Handles uploading, positioning, scaling, and rendering of custom images
 */

const ImageManager = (() => {
    // Private variables
    let uploadedImages = [];
    let selectedImageId = null;
    let svg;
    let zoomGroup;
    
    /**
     * Initialize the image manager
     * @param {Object} svgElement - The main SVG D3 selection
     * @param {Object} zoomGroupElement - The zoom group D3 selection
     */
    const initialize = (svgElement, zoomGroupElement) => {
        svg = svgElement;
        zoomGroup = zoomGroupElement;
        
        // Load saved images from localStorage
        loadImages();
        
        // Set up event handlers
        setupEventHandlers();
        
        // Render existing images
        renderImages();
    };
    
    /**
     * Set up event handlers for image management
     */
    const setupEventHandlers = () => {
        // Upload button click
        d3.select('#upload-image-btn').on('click', () => {
            d3.select('#image-upload').node().click();
        });
        
        // Clear all images button click
        d3.select('#clear-images-btn').on('click', () => {
            if (uploadedImages.length > 0) {
                if (confirm('Are you sure you want to clear all uploaded images?')) {
                    clearImages();
                }
            }
        });
        
        // Arrow button controls
        d3.select('#move-up-btn').on('click', () => moveSelectedImage('up'));
        d3.select('#move-down-btn').on('click', () => moveSelectedImage('down'));
        d3.select('#move-left-btn').on('click', () => moveSelectedImage('left'));
        d3.select('#move-right-btn').on('click', () => moveSelectedImage('right'));
        
        // File input change
        d3.select('#image-upload').on('change', handleFileUpload);
        
        // Background click to deselect images
        svg.on('click', function(event) {
            if (event.target === this) {
                deselectImage();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Delete' && selectedImageId) {
                deleteImage(selectedImageId);
            } else if (event.key === 'Escape') {
                deselectImage();
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                moveSelectedImage('up');
            } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                moveSelectedImage('down');
            } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                moveSelectedImage('left');
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                moveSelectedImage('right');
            }
        });
    };
    
    /**
     * Handle file upload
     * @param {Event} event - File input change event
     */
    const handleFileUpload = (event) => {
        const files = event.target.files;
        
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imageData = {
                        id: generateId(),
                        name: file.name,
                        dataUrl: e.target.result,
                        x: 100,
                        y: 100,
                        scale: 1.0,
                        originalWidth: 0,
                        originalHeight: 0
                    };
                    
                    // Get original dimensions
                    const img = new Image();
                    img.onload = () => {
                        imageData.originalWidth = img.width;
                        imageData.originalHeight = img.height;
                        uploadedImages.push(imageData);
                        saveImages();
                        renderImages();
                        updateImageList();
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
        
        // Clear the input
        event.target.value = '';
    };
    
    /**
     * Generate unique ID for images
     * @returns {string} Unique ID
     */
    const generateId = () => {
        return 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    };
    
    /**
     * Render all uploaded images on the SVG
     */
    const renderImages = () => {
        // Safety check - ensure zoomGroup is available
        if (!zoomGroup || !zoomGroup.selectAll) {
            console.warn('ImageManager: zoomGroup not properly initialized');
            return;
        }
        
        // Remove existing image group
        zoomGroup.selectAll('.custom-images').remove();
        
        // Create new image group
        const imagesGroup = zoomGroup.append('g')
            .attr('class', 'custom-images');
        
        // Render each image
        uploadedImages.forEach(imageData => {
            const imageGroup = imagesGroup.append('g')
                .attr('class', 'custom-image')
                .attr('data-image-id', imageData.id)
                .attr('transform', `translate(${imageData.x}, ${imageData.y}) scale(${imageData.scale})`)
                .style('cursor', 'pointer')
                .on('click', function(event) {
                    event.stopPropagation();
                    selectImage(imageData.id);
                });
            
            // Add image element
            imageGroup.append('image')
                .attr('xlink:href', imageData.dataUrl)
                .attr('width', imageData.originalWidth)
                .attr('height', imageData.originalHeight)
                .attr('x', -imageData.originalWidth / 2)
                .attr('y', -imageData.originalHeight / 2);
            
            // Add selection border if selected
            if (selectedImageId === imageData.id) {
                imageGroup.append('rect')
                    .attr('class', 'image-selection-border')
                    .attr('x', -imageData.originalWidth / 2 - 5)
                    .attr('y', -imageData.originalHeight / 2 - 5)
                    .attr('width', imageData.originalWidth + 10)
                    .attr('height', imageData.originalHeight + 10)
                    .attr('fill', 'none')
                    .attr('stroke', '#8b5cf6')
                    .attr('stroke-width', '2px')
                    .attr('stroke-dasharray', '5,5');
            }
        });
    };
    
    /**
     * Select an image
     * @param {string} imageId - ID of the image to select
     */
    const selectImage = (imageId) => {
        selectedImageId = imageId;
        renderImages();
        updateImageList();
    };
    
    /**
     * Deselect the currently selected image
     */
    const deselectImage = () => {
        selectedImageId = null;
        renderImages();
        updateImageList();
    };
    
    /**
     * Update the image list in the UI
     */
    const updateImageList = () => {
        const imageList = d3.select('#image-list');
        imageList.html('');
        
        // Add image count header
        if (uploadedImages.length > 0) {
            imageList.append('div')
                .attr('class', 'image-count')
                .text(`${uploadedImages.length} image${uploadedImages.length > 1 ? 's' : ''} uploaded`);
        }
        
        uploadedImages.forEach(imageData => {
            const imageItem = imageList.append('div')
                .attr('class', `image-item ${selectedImageId === imageData.id ? 'selected' : ''}`)
                .on('click', () => selectImage(imageData.id));
            
            // Add preview
            imageItem.append('img')
                .attr('class', 'image-preview')
                .attr('src', imageData.dataUrl)
                .attr('alt', imageData.name);
            
            // Add selection indicator
            if (selectedImageId === imageData.id) {
                imageItem.append('div')
                    .attr('class', 'selection-indicator')
                    .text('✓ Selected');
            }
            
            // Add controls
            const controlsRow = imageItem.append('div')
                .attr('class', 'image-controls-row');
            
            // Scale slider
            controlsRow.append('input')
                .attr('type', 'range')
                .attr('min', '0.1')
                .attr('max', '3.0')
                .attr('step', '0.1')
                .attr('value', imageData.scale)
                .on('input', function() {
                    const newScale = parseFloat(this.value);
                    imageData.scale = newScale;
                    d3.select(this.parentNode.parentNode).select('.image-scale-value').text(`${newScale}x`);
                    // Use efficient single image update instead of full re-render
                    updateImageTransform(imageData.id);
                    // Save immediately since we're not dragging
                    saveImages();
                });
            
            // Scale value display
            controlsRow.append('span')
                .attr('class', 'image-scale-value')
                .text(`${imageData.scale}x`);
            
            // Delete button
            controlsRow.append('button')
                .attr('class', 'delete-btn')
                .text('🗑️')
                .on('click', (event) => {
                    event.stopPropagation();
                    deleteImage(imageData.id);
                });
        });
    };
    
    /**
     * Delete an image
     * @param {string} imageId - ID of the image to delete
     */
    const deleteImage = (imageId) => {
        uploadedImages = uploadedImages.filter(img => img.id !== imageId);
        if (selectedImageId === imageId) {
            selectedImageId = null;
        }
        saveImages();
        renderImages();
        updateImageList();
    };
    
    /**
     * Save images to localStorage
     */
    const saveImages = () => {
        try {
            localStorage.setItem('dark-graph-images', JSON.stringify(uploadedImages));
        } catch (e) {
            console.warn('Could not save images to localStorage:', e);
        }
    };
    
    /**
     * Load images from localStorage
     */
    const loadImages = () => {
        try {
            const saved = localStorage.getItem('dark-graph-images');
            if (saved) {
                uploadedImages = JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Could not load images from localStorage:', e);
            uploadedImages = [];
        }
    };
    
    /**
     * Get all uploaded images for export
     * @returns {Array} Array of image data
     */
    const getImagesForExport = () => {
        return uploadedImages.map(img => ({
            ...img,
            // Convert to base64 if needed for export
            dataUrl: img.dataUrl
        }));
    };
    
    /**
     * Clear all images
     */
    const clearImages = () => {
        uploadedImages = [];
        selectedImageId = null;
        saveImages();
        renderImages();
        updateImageList();
    };
    
    /**
     * Reload images from localStorage
     */
    const reloadImages = () => {
        loadImages();
        renderImages();
        updateImageList();
    };
    
    /**
     * Update a single image's transform without re-rendering all images
     * @param {string} imageId - ID of the image to update
     */
    const updateImageTransform = (imageId) => {
        const imageData = uploadedImages.find(img => img.id === imageId);
        if (imageData) {
            const imageElement = zoomGroup.select(`[data-image-id="${imageId}"]`);
            if (!imageElement.empty()) {
                imageElement.attr('transform', `translate(${imageData.x}, ${imageData.y}) scale(${imageData.scale})`);
                
                // Update selection border if selected
                if (selectedImageId === imageId) {
                    const borderElement = imageElement.select('.image-selection-border');
                    if (!borderElement.empty()) {
                        borderElement
                            .attr('x', -imageData.originalWidth / 2 - 5)
                            .attr('y', -imageData.originalHeight / 2 - 5)
                            .attr('width', imageData.originalWidth + 10)
                            .attr('height', imageData.originalHeight + 10);
                    }
                }
            }
        }
    };
    
    /**
     * Move the selected image in the specified direction
     * @param {string} direction - 'up', 'down', 'left', or 'right'
     */
    const moveSelectedImage = (direction) => {
        if (!selectedImageId) {
            alert('Please select an image first by clicking on it.');
            return;
        }
        
        const imageData = uploadedImages.find(img => img.id === selectedImageId);
        if (!imageData) return;
        
        // Get the current offset value
        const offset = parseInt(d3.select('#position-offset').property('value')) || 10;
        
        // Update position based on direction
        switch (direction) {
            case 'up':
                imageData.y -= offset;
                break;
            case 'down':
                imageData.y += offset;
                break;
            case 'left':
                imageData.x -= offset;
                break;
            case 'right':
                imageData.x += offset;
                break;
        }
        
        // Update the image transform
        updateImageTransform(selectedImageId);
        
        // Save the new position
        saveImages();
    };
    
    // Public API
    return {
        initialize,
        getImagesForExport,
        clearImages,
        reloadImages,
        renderImages,
        updateImageTransform
    };
})(); 