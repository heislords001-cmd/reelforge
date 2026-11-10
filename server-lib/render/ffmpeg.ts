import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env';
import { AspectRatio } from '../types';

/**
 * FFmpeg assembly for rendered videos. Needs a real FFmpeg and FFprobe on the machine
 * (set FFMPEG_PATH and FFPROBE_PATH, or have them on PATH). Pipeline:
 *
 *   1. one clip per scene, exactly as long as that scene's narration
 *        still image  -> Ken Burns pan and zoom (kenBurnsClip)
 *        AI clip      -> scaled, cropped, looped or trimmed to fit (fitClip)
 *   2. clips joined into one silent video (concatClips)
 *   3. narration joined into one track, each scene padded to its clip length (buildAudioTrack)
 *   4. audio laid over the video, watermark burned in for free renders (finalize)
 *
 * Every scene's length comes from its own audio, so picture and voice cannot drift apart.
 */

export const FPS = 25;
const SCENE_TAIL_SECONDS = 0.4;
const MIN_SCENE_SECONDS = 2;

export function frameSize(aspect: AspectRatio): { width: number; height: number } {
  // Even numbers only, H.264 requires it.
  if (aspect === '9:16') return { width: 720, height: 1280 };
  if (aspect === '1:1') return { width: 720, height: 720 };
  return { width: 1280, height: 720 };
}

let configured = false;
export function configureFfmpeg() {
  if (configured) return;
  if (env.render.ffmpegPath) ffmpeg.setFfmpegPath(env.render.ffmpegPath);
  if (env.render.ffprobePath) ffmpeg.setFfprobePath(env.render.ffprobePath);
  configured = true;
}

function run(cmd: ffmpeg.FfmpegCommand, outPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let tail = '';
    cmd
      .on('stderr', (line: string) => {
        tail = `${tail}\n${line}`.slice(-1500);
      })
      .on('error', (err: Error) => reject(new Error(`ffmpeg failed: ${err.message}\n${tail}`)))
      .on('end', () => resolve())
      .save(outPath);
  });
}

export function probeDuration(file: string): Promise<number> {
  configureFfmpeg();
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, (err, data) => {
      if (err) return reject(err);
      resolve(Number(data.format.duration) || 0);
    });
  });
}

// Identical encode settings for every scene clip, this is what lets concatClips stream copy.
// movflags +faststart must be here even though the intermediate clips are not served over
// HTTP, because FFmpeg's concat demuxer inherits the moov position from the first clip. If
// the first clip has moov at the end, the finished file has moov at the end, and browsers
// must download the whole file before they can start playback.
const VIDEO_ENCODE = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-an', '-movflags', '+faststart'];

export type KenBurnsStyle = 'zoom-in' | 'zoom-out' | 'pan-right' | 'pan-left';
export const KEN_BURNS_STYLES: KenBurnsStyle[] = ['zoom-in', 'pan-right', 'zoom-out', 'pan-left'];

/** Slow pan and zoom over a still. Linear in the output frame number, so it is smooth. */
export async function kenBurnsClip(opts: {
  imagePath: string;
  outPath: string;
  seconds: number;
  width: number;
  height: number;
  style: KenBurnsStyle;
}): Promise<void> {
  configureFfmpeg();
  const { width, height, seconds, style } = opts;
  const frames = Math.max(1, Math.round(seconds * FPS));
  const centerY = `y='ih/2-(ih/zoom/2)'`;
  const motion: Record<KenBurnsStyle, string> = {
    'zoom-in': `z='1+0.25*on/${frames}':x='iw/2-(iw/zoom/2)':${centerY}`,
    'zoom-out': `z='1.25-0.25*on/${frames}':x='iw/2-(iw/zoom/2)':${centerY}`,
    'pan-right': `z=1.2:x='(iw-iw/zoom)*on/${frames}':${centerY}`,
    'pan-left': `z=1.2:x='(iw-iw/zoom)*(1-on/${frames})':${centerY}`,
  };
  // Work at double size then scale down in zoompan. Zooming a small frame directly makes
  // the picture visibly jitter because zoompan rounds to whole pixels.
  const w2 = width * 2;
  const h2 = height * 2;
  const filter =
    `scale=${w2}:${h2}:force_original_aspect_ratio=increase,crop=${w2}:${h2},` +
    `zoompan=${motion[style]}:d=${frames}:s=${width}x${height}:fps=${FPS},format=yuv420p`;

  await run(ffmpeg().input(opts.imagePath).videoFilters(filter).outputOptions(VIDEO_ENCODE).duration(seconds), opts.outPath);
}

/** Fits an AI generated clip to the scene: fill the frame, then loop or trim to length. */
export async function fitClip(opts: {
  clipPath: string;
  outPath: string;
  seconds: number;
  width: number;
  height: number;
}): Promise<void> {
  configureFfmpeg();
  const { width, height } = opts;
  const filter = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=${FPS},format=yuv420p`;
  await run(
    ffmpeg()
      .input(opts.clipPath)
      .inputOptions(['-stream_loop', '-1']) // a 5 second clip under a 9 second scene just repeats
      .videoFilters(filter)
      .outputOptions(VIDEO_ENCODE)
      .duration(opts.seconds),
    opts.outPath
  );
}

const escapeConcatPath = (p: string) => p.replace(/'/g, `'\\''`);

/** Joins finished scene clips into one video, no re-encode. */
export async function concatClips(clipPaths: string[], outPath: string, workDir: string): Promise<void> {
  configureFfmpeg();
  const listPath = path.join(workDir, 'clips.txt');
  await fs.writeFile(listPath, clipPaths.map((p) => `file '${escapeConcatPath(p)}'`).join('\n'));
  await run(ffmpeg().input(listPath).inputOptions(['-f', 'concat', '-safe', '0']).outputOptions(['-c', 'copy']), outPath);
}

/**
 * Joins per scene narration into one track. Each file is resampled to one common format
 * (so mixing voices from different providers is safe) and padded with silence to exactly
 * its scene's length, which is what keeps the voice lined up with the picture.
 */
export async function buildAudioTrack(
  parts: { audioPath: string; seconds: number }[],
  outPath: string
): Promise<void> {
  configureFfmpeg();
  const cmd = ffmpeg();
  parts.forEach((p) => cmd.input(p.audioPath));
  const prepared = parts.map(
    (p, i) => `[${i}:a]aresample=44100,aformat=channel_layouts=stereo,apad=whole_dur=${p.seconds.toFixed(3)}[a${i}]`
  );
  const joined = `${parts.map((_, i) => `[a${i}]`).join('')}concat=n=${parts.length}:v=0:a=1[aout]`;
  cmd.complexFilter([...prepared, joined], 'aout');
  await run(cmd.outputOptions(['-c:a', 'aac', '-b:a', '160k']), outPath);
}

/** Lays the audio under the video and, for free renders, burns in the watermark. */
export async function finalize(opts: {
  videoPath: string;
  audioPath: string;
  outPath: string;
  watermark: boolean;
  workDir: string;
}): Promise<void> {
  configureFfmpeg();
  const cmd = ffmpeg().input(opts.videoPath).input(opts.audioPath);

  if (opts.watermark) {
    try {
      await fs.access(env.render.watermarkFont);
    } catch {
      throw new Error(`Watermark font not found at ${env.render.watermarkFont}. Install a TTF font or set WATERMARK_FONT.`);
    }
    // textfile instead of text: no quoting or escaping to get wrong for the filter parser.
    const textPath = path.join(opts.workDir, 'watermark.txt');
    await fs.writeFile(textPath, env.render.watermarkText);
    cmd
      .videoFilters(
        `drawtext=fontfile='${env.render.watermarkFont}':textfile='${textPath}':fontcolor=white@0.85:fontsize=h/26:` +
          `box=1:boxcolor=black@0.4:boxborderw=12:x=w-tw-28:y=h-th-28`
      )
      .outputOptions(['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p']);
  } else {
    cmd.outputOptions(['-c:v', 'copy']);
  }

  await run(cmd.outputOptions(['-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart']), opts.outPath);
}

export interface SceneInput {
  visual: { kind: 'image' | 'clip'; path: string };
  audioPath: string;
}

/** The whole assembly. Returns the final length in seconds. */
export async function assembleVideo(opts: {
  scenes: SceneInput[];
  aspect: AspectRatio;
  watermark: boolean;
  workDir: string;
  outPath: string;
  onProgress?: (message: string) => void;
}): Promise<{ durationSeconds: number }> {
  if (opts.scenes.length === 0) throw new Error('No scenes to assemble');
  configureFfmpeg();
  const { width, height } = frameSize(opts.aspect);

  const clipPaths: string[] = [];
  const audioParts: { audioPath: string; seconds: number }[] = [];

  for (let i = 0; i < opts.scenes.length; i++) {
    const scene = opts.scenes[i];
    opts.onProgress?.(`Building scene ${i + 1} of ${opts.scenes.length}`);

    const narration = await probeDuration(scene.audioPath);
    if (narration <= 0) throw new Error(`Narration for scene ${i + 1} has no audio`);
    const seconds = Math.max(MIN_SCENE_SECONDS, narration + SCENE_TAIL_SECONDS);

    const clipPath = path.join(opts.workDir, `scene-${String(i).padStart(3, '0')}.mp4`);
    if (scene.visual.kind === 'clip') {
      await fitClip({ clipPath: scene.visual.path, outPath: clipPath, seconds, width, height });
    } else {
      await kenBurnsClip({
        imagePath: scene.visual.path,
        outPath: clipPath,
        seconds,
        width,
        height,
        style: KEN_BURNS_STYLES[i % KEN_BURNS_STYLES.length],
      });
    }
    clipPaths.push(clipPath);
    audioParts.push({ audioPath: scene.audioPath, seconds });
  }

  opts.onProgress?.('Joining scenes');
  const silentPath = path.join(opts.workDir, 'silent.mp4');
  await concatClips(clipPaths, silentPath, opts.workDir);

  opts.onProgress?.('Mixing narration');
  const audioPath = path.join(opts.workDir, 'narration.m4a');
  await buildAudioTrack(audioParts, audioPath);

  opts.onProgress?.(opts.watermark ? 'Adding watermark and finishing' : 'Finishing');
  await finalize({ videoPath: silentPath, audioPath, outPath: opts.outPath, watermark: opts.watermark, workDir: opts.workDir });

  return { durationSeconds: audioParts.reduce((sum, p) => sum + p.seconds, 0) };
}
