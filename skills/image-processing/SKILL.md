# Image Processing Skill

Domain knowledge and best practices for image-related tasks.

## Overview

Handles image inspection, transformation, composition, and analysis.

## Capabilities

- Inspect image properties (dimensions, format, color space, EXIF data)
- Transform images (resize, crop, rotate, filter)
- Compose images (combine, overlay, annotate)
- Detect features (faces, objects, colors, text)
- Generate images (from templates, from descriptions)
- Extract text (OCR)
- Format conversion

## Considerations

### Quality & Compression

- Preserve quality when possible; lossy compression (JPEG) for web
- Account for DPI/resolution requirements
- Color space: RGB vs CMYK (print), sRGB vs Adobe RGB (graphics)

### Image-Specific Tasks

#### Passport Photo Requirements

- Square format (typically 600×600 or 400×400 pixels)
- White background
- Face centered, neutral expression
- Head fills 50-70% of frame
- No glasses (usually), no hats
- Good lighting, sharp focus
- Country/jurisdiction specific (US, UK, EU, etc.)

#### Social Media

- Platform-specific dimensions (LinkedIn, Facebook, Twitter, Instagram)
- Compression considerations
- Aspect ratios

#### Print

- 300 DPI minimum
- Color accuracy (CMYK if going to print)
- Bleed areas

## Capability Mapping

```
Task: "Make a passport photo"
  ↓
Skill knowledge: Passport requirements
  ↓
Capabilities needed:
  - inspect_image (current dimensions)
  - process_image (crop, center, resize)
  - detect_faces (ensure face quality)
  - (future) validate_passport_requirements
```

## Safety Notes

- Do not modify user images without confirmation
- Validate output dimensions before delivery
- Preserve original if destructive transformation requested
