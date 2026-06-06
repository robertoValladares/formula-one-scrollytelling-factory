import argparse
import json
import shutil
import subprocess
from pathlib import Path


def find_ffmpeg() -> str:
    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        return system_ffmpeg

    candidates = [
        Path("node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe"),
        Path("node_modules/@ffmpeg-installer/ffmpeg/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe"),
        Path("node_modules/@ffmpeg-installer/darwin-x64/ffmpeg"),
        Path("node_modules/@ffmpeg-installer/linux-x64/ffmpeg"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return str(candidate.resolve())

    raise FileNotFoundError("ffmpeg was not found. Run npm install before compiling the sequence.")


def run(command):
    subprocess.run(command, check=True)


def ffprobe_duration(ffmpeg_path: str, source: Path) -> float | None:
    ffprobe = Path(ffmpeg_path).with_name("ffprobe.exe")
    if not ffprobe.exists():
        ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        return None

    result = subprocess.run(
        [
            str(ffprobe),
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(source),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    try:
        return float(result.stdout.strip())
    except ValueError:
        return None


def extract_variant(ffmpeg_path: str, source: Path, output: Path, fps: int, width: int, quality: int):
    output.mkdir(parents=True, exist_ok=True)
    for existing in output.glob("frame_*.webp"):
        existing.unlink()

    run(
        [
            ffmpeg_path,
            "-y",
            "-i",
            str(source),
            "-vf",
            f"fps={fps},scale={width}:-2:flags=lanczos",
            "-compression_level",
            "0",
            "-quality",
            str(quality),
            str(output / "frame_%04d.webp"),
        ]
    )


def create_poster(ffmpeg_path: str, source: Path, poster: Path, width: int, quality: int):
    poster.parent.mkdir(parents=True, exist_ok=True)
    run(
        [
            ffmpeg_path,
            "-y",
            "-i",
            str(source),
            "-frames:v",
            "1",
            "-vf",
            f"scale={width}:-2:flags=lanczos",
            "-compression_level",
            "0",
            "-quality",
            str(quality),
            str(poster),
        ]
    )


def frame_entries(directory: Path):
    return [frame.name for frame in sorted(directory.glob("frame_*.webp"))]


def main():
    parser = argparse.ArgumentParser(description="Compile a scroll-controlled canvas sequence from MP4.")
    parser.add_argument("input", type=Path, help="Input MP4 file")
    parser.add_argument("--output", type=Path, default=Path("public/generated/f1-sequence"))
    parser.add_argument("--fps", type=int, default=12)
    parser.add_argument("--desktop-width", type=int, default=1920)
    parser.add_argument("--mobile-width", type=int, default=900)
    parser.add_argument("--quality", type=int, default=82)
    args = parser.parse_args()

    source = args.input.resolve()
    output = args.output.resolve()
    if not source.exists():
        raise FileNotFoundError(f"Input video not found: {source}")

    ffmpeg_path = find_ffmpeg()
    desktop_dir = output
    mobile_dir = output / "mobile"

    extract_variant(ffmpeg_path, source, desktop_dir, args.fps, args.desktop_width, args.quality)
    extract_variant(ffmpeg_path, source, mobile_dir, args.fps, args.mobile_width, args.quality)
    create_poster(ffmpeg_path, source, output / "poster.webp", args.desktop_width, args.quality)
    create_poster(ffmpeg_path, source, mobile_dir / "poster.webp", args.mobile_width, args.quality)

    desktop_frames = frame_entries(desktop_dir)
    mobile_frames = frame_entries(mobile_dir)
    duration = ffprobe_duration(ffmpeg_path, source) or round(len(desktop_frames) / args.fps, 3)

    manifest = {
        "source": source.name,
        "fps": args.fps,
        "duration": duration,
        "frameCount": len(desktop_frames),
        "poster": "poster.webp",
        "frames": desktop_frames,
        "desktop": {
            "basePath": "/generated/f1-sequence/",
            "width": args.desktop_width,
            "poster": "poster.webp",
            "frames": desktop_frames,
        },
        "mobile": {
            "basePath": "/generated/f1-sequence/mobile/",
            "width": args.mobile_width,
            "poster": "poster.webp",
            "frames": mobile_frames,
        },
    }

    (output / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Generated {len(desktop_frames)} desktop frames and {len(mobile_frames)} mobile frames.")
    print(f"Manifest: {output / 'manifest.json'}")


if __name__ == "__main__":
    main()
