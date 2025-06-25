from PIL import Image, ImageDraw, ImageFont
import textwrap

def create_origin_graph(output_filename="origin_graph.png"):
    """
    Generates a high-quality, manually-drawn visualization of the Origin World timeline.
    """
    # --- 1. Constants and Configuration ---
    SCALE = 2
    WIDTH = 800 * SCALE
    NODE_HEIGHT = 120* SCALE
    V_SPACING = 80 * SCALE
    PADDING = 50 * SCALE

    BG_COLOR = "#1e1e2f"
    NODE_COLOR = "#708BFC"
    TEXT_COLOR = "#000000"
    ARROW_COLOR = "#FFFFFF"
    FONT_SIZE = 30 * SCALE
    NODE_RADIUS = 20 * SCALE

    try:
        font = ImageFont.truetype("arial.ttf", FONT_SIZE)
    except IOError:
        print("Arial font not found. Using default font.")
        font = ImageFont.load_default()

    # --- 2. Hardcoded Event Data ---
    events = [
        "Marek argues with his father H.G. Tannhaus because he doesn't pay him enough attention.",
        "Marek, Sonja and their daughter Charlotte leave Tannhaus' shop and take the car although it's raining.",
        "Marek, Sonja and little Charlotte die in a car accident.",
        "Adult H.G. Tannhaus remembers his family.",
        "He wants to create a time machine to undo it all.",
        "He spends the next years building a time machine in the bunker.",
        "Old H.G. Tannhaus finishes his machine...",
        "... and activates it.",
        "Instead of saving his family, he splits and destroys his world, thus creating both Adam's and Eva's worlds."
    ]

    # --- 3. Calculate Layout and Setup Image ---
    TITLE_FONT_SIZE = 100 * SCALE
    TITLE_COLOR = "#FFFFFF"
    TITLE_PADDING_BOTTOM = 80 * SCALE
    
    try:
        title_font = ImageFont.truetype("arialbd.ttf", TITLE_FONT_SIZE)
    except IOError:
        print("Arial Bold font not found. Using default font for title.")
        title_font = font

    # Calculate total height needed
    title_height = TITLE_FONT_SIZE + TITLE_PADDING_BOTTOM
    nodes_height = (len(events) * NODE_HEIGHT) + ((len(events) - 1) * V_SPACING)
    total_height = (2 * PADDING) + title_height + nodes_height
    
    image = Image.new("RGB", (WIDTH, int(total_height)), BG_COLOR)
    draw = ImageDraw.Draw(image)

    # --- 4. Drawing Logic ---
    current_y = PADDING
    
    # Draw Title
    title_x = WIDTH / 2
    draw.text((title_x, current_y), "ORIGIN", fill=TITLE_COLOR, font=title_font, anchor="mt", align="center")
    current_y += title_height

    # Draw Nodes and Arrows
    node_width = WIDTH - 2 * PADDING
    x0 = PADDING
    x1 = x0 + node_width

    for i, event_text in enumerate(events):
        y0 = current_y
        y1 = y0 + NODE_HEIGHT

        # Draw the rounded rectangle node
        draw.rounded_rectangle([x0, y0, x1, y1], radius=NODE_RADIUS, fill=NODE_COLOR)

        # Wrap and draw the text
        wrapped_text = textwrap.fill(event_text, width=45)
        text_x = x0 + (node_width / 2)
        text_y = y0 + (NODE_HEIGHT / 2)
        draw.multiline_text((text_x, text_y), wrapped_text, fill=TEXT_COLOR, font=font, anchor="mm", align="center")

        # Draw connecting arrow (if not the last node)
        if i < len(events) - 1:
            arrow_start_y = y1 + 5 * SCALE
            arrow_end_y = arrow_start_y + V_SPACING - 10 * SCALE
            arrow_x = x0 + node_width / 2
            draw.line([(arrow_x, arrow_start_y), (arrow_x, arrow_end_y)], fill=ARROW_COLOR, width=3 * SCALE)
            # Arrowhead
            draw.polygon([
                (arrow_x, arrow_end_y + 5 * SCALE),
                (arrow_x - 10 * SCALE, arrow_end_y - 15 * SCALE),
                (arrow_x + 10 * SCALE, arrow_end_y - 15 * SCALE)
            ], fill=ARROW_COLOR)

        current_y += NODE_HEIGHT + V_SPACING

    # --- 5. Finalize and Save ---
    final_image = image.resize((WIDTH // SCALE, int(total_height // SCALE)), Image.Resampling.LANCZOS)
    final_image.save(output_filename)
    print(f"High-quality origin graph saved as {output_filename}")

if __name__ == "__main__":
    create_origin_graph()
