#!/usr/bin/env bash
# Download the two pilot Drive videos and regenerate demo reel exports.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${PILOT_OUT:-$ROOT/apps/web/public/demo/pilot}"
CACHE="${PILOT_CACHE:-/tmp/luminary-pilot-cache}"
FILE_A="${PILOT_DRIVE_A:-15QCPeZCx7RpwWYIkPRP1voFJH6riagHV}"
FILE_B="${PILOT_DRIVE_B:-1l5vLmipXz3f-zhN5AkvUsRsviHQ1NoOg}"
BRAND="${PILOT_BRAND:-Creator Studio}"

mkdir -p "$OUT" "$CACHE"

PYTHON="${ROOT}/apps/api/.venv/bin/python"
if [[ ! -x "$PYTHON" ]]; then
  PYTHON="$(command -v python3)"
fi

if ! "$PYTHON" -c "import gdown" 2>/dev/null; then
  echo "Installing gdown into apps/api .venv (or user env)…"
  if [[ -x "$ROOT/apps/api/.venv/bin/pip" ]]; then
    "$ROOT/apps/api/.venv/bin/pip" install -q gdown
    PYTHON="$ROOT/apps/api/.venv/bin/python"
  else
    "$PYTHON" -m pip install -q gdown
  fi
fi

download() {
  local id="$1" dest="$2"
  if [[ -f "$dest" && -s "$dest" ]]; then
    echo "Using cached $dest"
    return
  fi
  "$PYTHON" - <<PY
import gdown
gdown.download("https://drive.google.com/uc?id=$id", "$dest", quiet=False)
PY
}

download "$FILE_A" "$CACHE/pilot-a.mp4"
download "$FILE_B" "$CACHE/pilot-b.mp4"

FONT="$(ls /usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf /usr/share/fonts/truetype/macos/Inter-Bold.ttf 2>/dev/null | head -1 || true)"
if [[ -z "$FONT" ]]; then
  echo "No TrueType bold font found for brand stamp." >&2
  exit 1
fi

for id in a b; do
  ffmpeg -y -hide_banner -loglevel error -ss 5 -t 22 -i "$CACHE/pilot-${id}.mp4" \
    -vf "scale=540:-2" -c:v libx264 -preset veryfast -crf 28 -c:a aac -b:a 96k \
    -movflags +faststart "$OUT/preview-${id}.mp4"
done

write_vtt() {
  local file="$1" l1="$2" l2="$3" l3="$4"
  cat > "$file" <<VTT
WEBVTT

1
00:00:00.200 --> 00:00:03.200
$l1

2
00:00:03.400 --> 00:00:07.200
$l2

3
00:00:07.400 --> 00:00:11.800
$l3
VTT
}

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

write_vtt "$TMP/a1.vtt" "Here's the hook — stay with me." "This is the teaching beat creators clip." "Follow for the full breakdown."
write_vtt "$TMP/a2.vtt" "Practical example you can reuse today." "Short enough for Reels and Shorts." "Save this for your next post."
write_vtt "$TMP/b1.vtt" "Cold open that stops the scroll." "Identity on-frame from the first second." "Pilot edit ready for social."
write_vtt "$TMP/b2.vtt" "Clear CTA closes the loop." "Burned captions keep sound-off viewers." "Export. Download. Publish."

export_reel() {
  local src="$1" start="$2" dur="$3" vtt="$4" out="$5"
  ffmpeg -y -hide_banner -loglevel error -ss "$start" -t "$dur" -i "$src" \
    -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,subtitles=${vtt}:force_style='FontName=DejaVu Sans,FontSize=42,PrimaryColour=&H00FFFFFF&,OutlineColour=&H00000000&,BorderStyle=3,Outline=2,Alignment=2,MarginV=140',drawtext=fontfile=${FONT}:text='${BRAND}':fontsize=40:fontcolor=white:borderw=2:bordercolor=black@0.85:x=(w-text_w)/2:y=h*0.055" \
    -c:v libx264 -preset veryfast -crf 23 -c:a aac -b:a 128k -movflags +faststart \
    "$out"
}

export_reel "$CACHE/pilot-a.mp4" 12 15 "$TMP/a1.vtt" "$OUT/pilot-a-hook.mp4"
export_reel "$CACHE/pilot-a.mp4" 180 18 "$TMP/a2.vtt" "$OUT/pilot-a-insight.mp4"
export_reel "$CACHE/pilot-b.mp4" 8 16 "$TMP/b1.vtt" "$OUT/pilot-b-hook.mp4"
export_reel "$CACHE/pilot-b.mp4" 240 18 "$TMP/b2.vtt" "$OUT/pilot-b-cta.mp4"

echo "Pilot demo assets written to $OUT"
ls -lah "$OUT"
