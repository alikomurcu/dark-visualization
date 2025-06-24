from PIL import Image, ImageDraw, ImageFont

def create_legend_image(width=600, filename="legend.png", upscale_factor=4):
    """
    Generates a high-quality, anti-aliased legend image for the DARK visualization.
    """
    # --- Upscaled dimensions for anti-aliasing ---
    u_width = width * upscale_factor
    u_height = 1200 * upscale_factor # Start with a large canvas

    # --- Colors ---
    colors = {
        "background": "#ffffff", #rgba(255, 255, 255, 0.08)
        "text_primary": "#ffffff",
        "text_secondary": "#b8b8d1",
        "jonas_world": "#00d9ff",
        "martha_world": "#ff3cac",
        "other_character": "#c92eff",
        "starting_event": "#ffac33",
        "death_border": "#c92eff",
        "time_travel_border": "#3498db",
        "important_event_border": "#ffd700",
        "romantic_event_border": "#e74c3c",
        "missing_person_event_border": "#f39c12",
        "edge_past": "#64b5f6",
        "edge_future": "#ff9800",
        "accent": "#ffac33",
    }

    # --- Image & Font Setup (at upscaled resolution) ---
    image = Image.new("RGBA", (u_width, u_height), colors["background"])
    draw = ImageDraw.Draw(image)

    try:
        title_font = ImageFont.truetype("arialbd.ttf", 48 * upscale_factor)
        section_font = ImageFont.truetype("arial.ttf", 32 * upscale_factor)
        item_font = ImageFont.truetype("arial.ttf", 22 * upscale_factor)
    except IOError:
        print("Arial font not found, using default font.")
        title_font = ImageFont.load_default()
        section_font = ImageFont.load_default()
        item_font = ImageFont.load_default()

    # --- Helper function for drawing a separator ---
    def draw_separator(y):
        line_x0 = padding
        line_x1 = u_width - padding
        draw.line([(line_x0, y), (line_x1, y)], fill=colors["text_secondary"], width=1 * upscale_factor)
        mid_x = u_width / 2
        diamond_size = 6 * upscale_factor
        draw.polygon([
            (mid_x - diamond_size, y),
            (mid_x, y - diamond_size),
            (mid_x + diamond_size, y),
            (mid_x, y + diamond_size)
        ], fill=colors["text_secondary"])

    # --- Drawing Logic ---
    padding = 50 * upscale_factor
    current_y = padding

    # --- Title ---
    title_text = "LEGEND"
    draw.text((u_width / 2, current_y), title_text, font=title_font, fill=colors["text_primary"], anchor="mt")
    title_bbox = draw.textbbox((u_width / 2, current_y), title_text, font=title_font, anchor="mt")
    current_y = title_bbox[3] + (15 * upscale_factor)
    title_width = title_bbox[2] - title_bbox[0]
    line_start_x = (u_width - title_width) / 2 - (20 * upscale_factor)
    line_end_x = (u_width + title_width) / 2 + (20 * upscale_factor)
    draw.line([(line_start_x, current_y), (line_end_x, current_y)], fill=colors["accent"], width=3 * upscale_factor)
    current_y += 50 * upscale_factor

    # --- Section: Node Color ---
    draw.text((padding, current_y), "Node Color", font=section_font, fill=colors["text_secondary"])
    current_y += 60 * upscale_factor
    node_items = [
        ("Jonas's World", colors["jonas_world"]),
        ("Martha's World", colors["martha_world"]),
        ("Origin [End]", colors["other_character"]),
        ("Starting Event", colors["starting_event"]),
    ]
    box_w = 280 * upscale_factor
    box_h = 50 * upscale_factor
    radius = 10 * upscale_factor
    box_x = (u_width - box_w) / 2
    for label, color in node_items:
        draw.rounded_rectangle((box_x, current_y, box_x + box_w, current_y + box_h), radius=radius, fill=color)
        text_fill = "#000000"
        text_pos = (box_x + box_w / 2, current_y + box_h / 2)
        draw.text(text_pos, label, font=item_font, fill=text_fill, anchor="mm")
        current_y += box_h + (20 * upscale_factor)
    # --- Separator ---
    draw_separator(current_y)
    current_y += 30 * upscale_factor

    # --- Section: Node Borders ---
    draw.text((padding, current_y), "Node Borders", font=section_font, fill=colors["text_secondary"])
    current_y += 60 * upscale_factor
    border_items = [
        ("Death Event", colors["death_border"]),
        ("Time Travel Event", colors["time_travel_border"]),
        ("Important Event", colors["important_event_border"]),
        ("Romantic Event", colors["romantic_event_border"]),
        ("Missing Person Event", colors["missing_person_event_border"]),
    ]
    for label, color in border_items:
        draw.rounded_rectangle((box_x, current_y, box_x + box_w, current_y + box_h), radius=radius, outline=color, width=3 * upscale_factor)
        text_pos = (box_x + box_w / 2, current_y + box_h / 2)
        draw.text(text_pos, label, font=item_font, fill=colors["text_primary"], anchor="mm")
        current_y += box_h + (20 * upscale_factor)
    # --- Separator ---
    draw_separator(current_y)   
    current_y += 30 * upscale_factor

    # --- Section: Edge Colors ---
    draw.text((padding, current_y), "Edge Colors", font=section_font, fill=colors["text_secondary"])
    current_y += 80 * upscale_factor # Increased spacing
    edge_items = [
        ("Time Travel Past", colors["edge_past"]),
        ("Time Travel Future", colors["edge_future"]),
    ]
    for label, color in edge_items:
        text_bbox = draw.textbbox((u_width / 2, current_y), label, font=item_font, anchor="mm")
        text_width = text_bbox[2] - text_bbox[0]

        arc_padding = 40 * upscale_factor # Increased padding for longer arc
        arc_height = 30 * upscale_factor
        arc_start_x = (u_width / 2) - (text_width / 2) - arc_padding
        arc_end_x = (u_width / 2) + (text_width / 2) + arc_padding

        arc_y_center = current_y - (10 * upscale_factor)
        arc_y_top = arc_y_center - arc_height
        arc_y_bottom = arc_y_center + arc_height

        dot_radius = 5 * upscale_factor
        dot_y = (arc_y_top + arc_y_bottom) / 2 # Align dots with the center of the arc's stroke

        draw.arc([arc_start_x, arc_y_top, arc_end_x, arc_y_bottom], 180, 0, fill=color, width=4 * upscale_factor)
        draw.ellipse([arc_start_x - dot_radius, dot_y - dot_radius, arc_start_x + dot_radius, dot_y + dot_radius], fill=color)
        draw.ellipse([arc_end_x - dot_radius, dot_y - dot_radius, arc_end_x + dot_radius, dot_y + dot_radius], fill=color)

        draw.text((u_width / 2, current_y), label, font=item_font, fill=colors["text_primary"], anchor="mm")
        current_y += 80 * upscale_factor

    # --- Crop, Resize (for anti-aliasing), and Save ---
    final_height = (current_y + padding) / upscale_factor
    cropped_image = image.crop((0, 0, u_width, current_y + padding))
    final_image = cropped_image.resize((width, int(final_height)), Image.Resampling.LANCZOS)

    final_image.save(filename)
    print(f"High-quality legend saved as '{filename}'")

if __name__ == "__main__":
    create_legend_image(width=600, filename="legend.png")
