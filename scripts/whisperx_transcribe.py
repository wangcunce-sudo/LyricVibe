#!/usr/bin/env python3
"""
WhisperX + Demucs 音频歌词转录脚本
=====================================

策略: Demucs 音源分离 → Faster-Whisper (large-v3) 转录 → JSON 时间轴

用法:
  python3 scripts/whisperx_transcribe.py <audio_path> [options]

选项:
  --output, -o      输出 JSON 文件路径 (默认 stdout)
  --model, -m       Whisper 模型: tiny/base/small/medium/large-v3 (默认 large-v3)
  --device, -d      设备: cpu/cuda/auto (默认 auto)
  --no-demucs       跳过音源分离（直接转录原音频）
  --pretty          格式化 JSON 输出
  --correct-lyrics  尝试用已知歌词修正 ASR 错误（需要提供正确歌词文本）

输出 JSON 格式:
  {
    "lyrics": [
      { "index": 0, "text": "...", "startTime": 0.0, "endTime": 1.5, "confidence": 0.98 },
      ...
    ],
    "language": "en",
    "duration": 32.74,
    "source": "demucs+whisper"
  }
"""

import argparse
import json
import sys
import os
import subprocess
import tempfile
import warnings

warnings.filterwarnings("ignore")


def separate_vocals(audio_path: str, output_dir: str) -> str:
    """
    使用 Demucs 分离人声。
    返回人声文件的路径。
    """
    import torch

    stem_name = os.path.splitext(os.path.basename(audio_path))[0]

    # Check if already separated
    vocals_path = os.path.join(output_dir, "htdemucs", stem_name, "vocals.wav")
    if os.path.exists(vocals_path):
        print(f"[Demucs] Using cached vocals: {vocals_path}", file=sys.stderr)
        return vocals_path

    print(f"[Demucs] Separating vocals from: {audio_path}", file=sys.stderr)
    print(f"[Demucs] Output dir: {output_dir}", file=sys.stderr)

    # Run demucs as subprocess to avoid import issues
    result = subprocess.run(
        [
            sys.executable, "-m", "demucs",
            "--two-stems=vocals",
            "-o", output_dir,
            audio_path,
        ],
        capture_output=True,
        text=True,
        timeout=600,  # 10 min timeout
    )

    if result.returncode != 0:
        print(f"[Demucs] stderr: {result.stderr[-500:]}", file=sys.stderr)
        raise RuntimeError(f"Demucs failed with code {result.returncode}")

    if os.path.exists(vocals_path):
        print(f"[Demucs] Vocals extracted: {vocals_path}", file=sys.stderr)
        return vocals_path

    # Try alternative path format
    alt_path = os.path.join(output_dir, "htdemucs", stem_name, "vocals.wav")
    if os.path.exists(alt_path):
        return alt_path

    raise FileNotFoundError(f"Vocals file not found after separation. Expected: {vocals_path}")


def transcribe_with_faster_whisper(
    audio_path: str,
    model_name: str = "large-v3",
    device: str = "cpu",
    compute_type: str = "int8",
):
    """
    使用 faster-whisper 直接转录音频（绕过 VAD pipeline）。
    返回 (segments_list, info_dict)
    """
    from faster_whisper import WhisperModel

    print(f"[Whisper] Loading model '{model_name}' ({device}/{compute_type})...", file=sys.stderr)

    model = WhisperModel(model_name, device=device, compute_type=compute_type)

    print(f"[Whisper] Transcribing: {audio_path}", file=sys.stderr)

    segments, info = model.transcribe(
        audio_path,
        language="en",               # 指定英文，避免语言检测开销
        beam_size=5,
        vad_filter=False,            # 禁用 VAD，转录整个音频
        word_timestamps=True,        # 获取逐字时间戳
        condition_on_previous_text=False,  # 防止幻觉
        no_speech_threshold=0.1,     # 低无声阈值
        compression_ratio_threshold=2.4,   # 放宽压缩比
        log_prob_threshold=-1.0,     # 更宽松的阈值
    )

    seg_list = []
    for seg in segments:
        words = seg.words or []
        if words:
            start = words[0].start
            end = words[-1].end
            conf = sum(w.probability for w in words) / max(len(words), 1)
        else:
            start = seg.start
            end = seg.end
            conf = 0.8

        seg_list.append({
            "text": seg.text.strip(),
            "start": start,
            "end": end,
            "confidence": float(conf),
            "words": [
                {"word": w.word, "start": w.start, "end": w.end, "prob": float(w.probability)}
                for w in (seg.words or [])
            ],
        })

    print(f"[Whisper] Found {len(seg_list)} segments", file=sys.stderr)
    for s in seg_list:
        print(f"  [{s['start']:6.2f}s - {s['end']:6.2f}s] {s['text']}", file=sys.stderr)

    return seg_list, {
        "language": info.language,
        "language_probability": info.language_probability,
        "duration": info.duration,
    }


def correct_lyrics_text(lyrics: list, reference_text: str = None) -> list:
    """
    如果提供了正确歌词文本，尝试用其修正 ASR 错误。
    使用简单的顺序对齐策略。
    """
    if not reference_text:
        return lyrics

    # Split reference into lines
    ref_lines = [l.strip() for l in reference_text.strip().split("\n") if l.strip()]

    if len(ref_lines) != len(lyrics):
        print(f"[Correct] Reference has {len(ref_lines)} lines, ASR has {len(lyrics)} lines. Skipping correction.",
              file=sys.stderr)
        return lyrics

    for i, ref in enumerate(ref_lines):
        if i < len(lyrics):
            lyrics[i]["text"] = ref

    print(f"[Correct] Applied {len(ref_lines)} corrected lines", file=sys.stderr)
    return lyrics


def post_process_lyrics(lyrics: list, max_chars: int = 60) -> list:
    """后处理：合并过短行、拆分过长行"""
    if not lyrics:
        return lyrics

    # Merge short adjacent lines
    merged = []
    for line in lyrics:
        duration = line["endTime"] - line["startTime"]
        text = line["text"]

        if merged and duration < 1.5 and len(merged[-1]["text"] + " " + text) <= max_chars:
            prev = merged[-1]
            prev["text"] = prev["text"] + " " + text
            prev["endTime"] = line["endTime"]
            prev["confidence"] = (prev["confidence"] + line["confidence"]) / 2
        else:
            merged.append(line.copy())

    # Re-index
    for i, l in enumerate(merged):
        l["index"] = i

    return merged


def transcribe_audio(
    audio_path: str,
    model_name: str = "large-v3",
    device: str = "auto",
    use_demucs: bool = True,
    reference_lyrics: str = None,
    max_line_chars: int = 60,
):
    """
    完整转录流程:
    1. (可选) Demucs 音源分离
    2. Faster-Whisper 转录
    3. 后处理
    4. 返回 LyricLine 数组
    """
    import torch

    # Determine device
    if device == "auto":
        device = "cuda" if torch.cuda.is_available() else "cpu"

    compute_type = "int8" if device == "cpu" else "float16"
    if device == "cuda":
        compute_type = "float16"

    # Step 1: Demucs separation (optional)
    transcription_audio = audio_path
    if use_demucs:
        try:
            demucs_out = os.path.join(
                os.path.dirname(audio_path) or ".",
                "..", "out", "demucs_out"
            )
            demucs_out = os.path.abspath(demucs_out)
            transcription_audio = separate_vocals(audio_path, demucs_out)
        except Exception as e:
            print(f"[Pipeline] Demucs failed ({e}), falling back to raw audio", file=sys.stderr)
            transcription_audio = audio_path

    # Step 2: Transcribe
    segments, info = transcribe_with_faster_whisper(
        transcription_audio,
        model_name=model_name,
        device=device,
        compute_type=compute_type,
    )

    # Step 3: Convert to LyricLine format with per-word timestamps
    lyrics = []
    for seg in segments:
        words = []
        if seg.get("words"):
            for w in seg["words"]:
                words.append({
                    "word": w["word"],
                    "start": round(w["start"], 3),
                    "end": round(w["end"], 3),
                    "confidence": round(w["prob"], 3),
                })
        lyrics.append({
            "index": len(lyrics),
            "text": seg["text"],
            "startTime": round(seg["start"], 2),
            "endTime": round(seg["end"], 2),
            "confidence": round(seg["confidence"], 3),
            "words": words,
        })

    # Step 4: Post-process
    lyrics = post_process_lyrics(lyrics, max_line_chars)

    # Step 5: Correct text if reference provided
    if reference_lyrics:
        lyrics = correct_lyrics_text(lyrics, reference_lyrics)

    # Calculate duration from audio file
    import wave
    try:
        import soundfile as sf
        data, sr = sf.read(transcription_audio)
        duration = len(data) / sr
    except Exception:
        duration = info.get("duration", 0)

    print(f"[Pipeline] Final: {len(lyrics)} lines, duration: {duration:.2f}s", file=sys.stderr)

    return {
        "lyrics": lyrics,
        "language": info.get("language", "en"),
        "duration": round(duration, 2),
        "source": "demucs+whisper" if use_demucs else "whisper",
    }


def main():
    parser = argparse.ArgumentParser(
        description="WhisperX + Demucs Audio → Lyric Timeline JSON"
    )
    parser.add_argument("audio", help="音频文件路径 (mp3, wav, m4a 等)")
    parser.add_argument("--output", "-o", help="输出 JSON 文件路径 (默认: stdout)")
    parser.add_argument("--model", "-m", default="large-v3",
                        help="Whisper 模型: tiny/base/small/medium/large-v3 (默认 large-v3)")
    parser.add_argument("--device", "-d", default="auto", help="设备: cpu, cuda, auto")
    parser.add_argument("--no-demucs", action="store_true", help="跳过 Demucs 音源分离")
    parser.add_argument("--reference", "-r", help="正确歌词文本文件（用于修正 ASR 错误）")
    parser.add_argument("--max-chars", type=int, default=60, help="每行最大字符数")
    parser.add_argument("--pretty", action="store_true", help="格式化 JSON 输出")

    args = parser.parse_args()

    if not os.path.exists(args.audio):
        print(f"Error: Audio file not found: {args.audio}", file=sys.stderr)
        sys.exit(1)

    # Load reference lyrics if provided
    reference_lyrics = None
    if args.reference and os.path.exists(args.reference):
        with open(args.reference, "r", encoding="utf-8") as f:
            reference_lyrics = f.read()

    try:
        result = transcribe_audio(
            audio_path=args.audio,
            model_name=args.model,
            device=args.device,
            use_demucs=not args.no_demucs,
            reference_lyrics=reference_lyrics,
            max_line_chars=args.max_chars,
        )
    except Exception as e:
        print(f"Error during transcription: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

    json_str = json.dumps(result, indent=2 if args.pretty else None, ensure_ascii=False)

    if args.output:
        os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(json_str)
        print(f"[Pipeline] Output: {args.output}", file=sys.stderr)
    else:
        print(json_str)


if __name__ == "__main__":
    main()
