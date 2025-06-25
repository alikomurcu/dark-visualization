import textwrap
from PIL import Image, ImageDraw, ImageFont

def create_text_legend(width=800, filename="textLegend.png", upscale_factor=4):
    """
    Generates a text-based legend image explaining how to read the DARK visualization graph.
    """
    # --- Colors and Fonts ---
    colors = {
        "background": "#1a1a2e",
        "text_primary": "#ffffff",
        "text_title": "#00d9ff",  # Jonas' world color for titles
        "text_secondary": "#b8b8d1"
    }

    try:
        font_bold = ImageFont.truetype("arialbd.ttf", 22 * upscale_factor)
        font_regular = ImageFont.truetype("arial.ttf", 18 * upscale_factor)
        font_main_title = ImageFont.truetype("arialbd.ttf", 32 * upscale_factor)
    except IOError:
        print("Arial font not found. Using default font.")
        font_bold = ImageFont.load_default()
        font_regular = ImageFont.load_default()
        font_main_title = ImageFont.load_default()

    # --- Content ---
    title = "How to Read the Graph"
    sections = [
        {
            "heading": "Graph Structure",
            "body": "This visualization represents a subgraph of the DARK event dataset, structured as a timeline from 1888 to 2053. The timeline is divided into six distinct temporal boxes."
        },
        {
            "heading": "Nodes (Events)",
            "body": "Each node represents a significant event. The visual style of a node indicates its type: critical plot points, time travel, character deaths, romantic entanglements, or missing person cases."
        },
        {
            "heading": "Swimlanes (Characters)",
            "body": "Within each temporal box, events are organized into horizontal swimlanes. The top two lanes are reserved for Jonas and Martha. A third lane is for the next most prominent character in that time period, while the bottom lane groups all other characters."
        },
        {
            "heading": "Edges & Starting Points",
            "body": "Colored lines connecting the temporal boxes represent the shifting presence of characters across time. Events located outside the main timeline are 'starting points'—root causes with no preceding events, which cause the foundation of the time loop."
        }
    ]

    # --- Calculate Image Height ---
    padding = 40 * upscale_factor
    line_spacing = 15 * upscale_factor
    section_spacing = 30 * upscale_factor
    img_width = width * upscale_factor
    text_width_char = 85  # Approximate character count for wrapping

    total_height = padding  # Top padding

    # Main title height
    total_height += font_main_title.getbbox(title)[3] + section_spacing

    # Sections height
    for section in sections:
        total_height += font_bold.getbbox(section["heading"])[3] + line_spacing
        wrapped_body = textwrap.wrap(section["body"], width=text_width_char)
        for line in wrapped_body:
            total_height += font_regular.getbbox(line)[3]
        total_height += section_spacing

    total_height += padding - section_spacing # Bottom padding

    # --- Create and Draw Image ---
    image = Image.new("RGBA", (img_width, total_height), colors["background"])
    draw = ImageDraw.Draw(image)

    current_y = padding

    # Draw main title
    title_bbox = draw.textbbox((0, 0), title, font=font_main_title)
    title_width = title_bbox[2] - title_bbox[0]
    draw.text(((img_width - title_width) / 2, current_y), title, font=font_main_title, fill=colors["text_title"])
    current_y += title_bbox[3] + section_spacing

    # Draw sections
    for section in sections:
        # Draw heading
        draw.text((padding, current_y), section["heading"], font=font_bold, fill=colors["text_primary"])
        current_y += font_bold.getbbox(section["heading"])[3] + line_spacing

        # Draw wrapped body text
        wrapped_body = textwrap.wrap(section["body"], width=text_width_char)
        for line in wrapped_body:
            draw.text((padding, current_y), line, font=font_regular, fill=colors["text_secondary"])
            current_y += font_regular.getbbox(line)[3]
        current_y += section_spacing

    # --- Finalize --- 
    # Downscale for anti-aliasing
    final_image = image.resize((width, total_height // upscale_factor), Image.Resampling.LANCZOS)

    # Save the image
    final_image.save(filename)
    print(f"Legend saved as {filename}")

if __name__ == "__main__":
    create_text_legend()
