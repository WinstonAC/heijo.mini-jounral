# Space Video for Heijō Intro

## Required Files

Place the following video files in this directory:

- `space.mp4` - Main video file (H.264 + AAC encoding recommended)
- `space.webm` - WebM fallback for better browser compatibility

## Video Specifications

- **Format**: MP4 (H.264 + AAC) and WebM
- **Duration**: 4-6 seconds (loops during intro)
- **Resolution**: 1920x1080 or higher
- **Aspect Ratio**: 16:9
- **Content**: Space/starfield animation or similar cosmic theme
- **File Size**: Keep under 5MB for optimal loading

## Usage

The video will automatically play as background during the intro animation, with:
- Autoplay (muted for browser compliance)
- Loop enabled
- Fade-in animation
- Fallback to starfield particles if video fails to load

## Testing

With `NEXT_PUBLIC_DEBUG=1`, check browser console for video playback diagnostics:
- `[Heijo][Diag] Video event: canplay`
- `[Heijo] Video started successfully`
- `[Heijo][Diag] Video event: play`
