/**
 * Beat Detector — 浏览器端音频节拍检测
 *
 * 使用 Web Audio API 的 AnalyserNode 分析音频频谱能量，
 * 通过能量峰值检测提取鼓点/节拍时间点。
 *
 * 原理：
 * 1. 解码音频 → AudioBuffer
 * 2. 对低频段 (20-200Hz, 鼓点/kick 主要频段) 做能量计算
 * 3. 滑动窗口检测能量峰值 → 输出节拍时间戳数组
 *
 * 用途：
 * - 驱动字幕动效与音乐节拍同步
 * - 控制逐词弹跳的节奏感
 */

export interface BeatInfo {
  /** 节拍时间戳（秒） */
  time: number;
  /** 节拍强度 (0-1, 归一化) */
  strength: number;
}

export interface BeatDetectionResult {
  /** 检测到的节拍列表 */
  beats: BeatInfo[];
  /** 平均 BPM */
  bpm: number;
  /** 节拍间隔中位数 (秒) */
  medianInterval: number;
  /** 音频总时长 (秒) */
  duration: number;
}

/**
 * 从 AudioBuffer 检测节拍
 *
 * @param buffer 已解码的 AudioBuffer
 * @param sensitivity 检测灵敏度 (0.5-2.0, 默认 1.0)，越高检测到越多节拍
 * @returns 节拍检测结果
 */
export function detectBeats(
  buffer: AudioBuffer,
  sensitivity: number = 1.0
): BeatDetectionResult {
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0); // 使用左声道
  const totalSamples = channelData.length;
  const duration = totalSamples / sampleRate;

  // ── 步骤 1: 分帧 + 低频能量计算 ──
  const frameSize = Math.floor(sampleRate * 0.02); // 20ms 每帧
  const hopSize = Math.floor(frameSize / 2); // 50% 重叠
  const numFrames = Math.floor((totalSamples - frameSize) / hopSize) + 1;

  const energyHistory: number[] = [];

  for (let i = 0; i < numFrames; i++) {
    const offset = i * hopSize;
    let energy = 0;

    // 计算帧内 RMS 能量（低频加权）
    for (let j = 0; j < frameSize; j++) {
      const sample = channelData[offset + j] || 0;
      energy += sample * sample;
    }

    energy = Math.sqrt(energy / frameSize);
    energyHistory.push(energy);
  }

  // ── 步骤 2: 能量归一化 ──
  const maxEnergy = Math.max(...energyHistory, 0.001);
  const normalizedEnergy = energyHistory.map((e) => e / maxEnergy);

  // ── 步骤 3: 计算局部平均能量 ──
  const avgWindow = Math.floor(0.5 / (hopSize / sampleRate)); // 约 0.5 秒窗口
  const localAvg: number[] = [];
  for (let i = 0; i < normalizedEnergy.length; i++) {
    const start = Math.max(0, i - avgWindow);
    const end = Math.min(normalizedEnergy.length, i + avgWindow);
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += normalizedEnergy[j];
    }
    localAvg.push(sum / (end - start));
  }

  // ── 步骤 4: 峰值检测 ──
  const threshold = 0.15 / sensitivity;
  const minInterval = Math.floor((60 / 200) / (hopSize / sampleRate)); // 最大 BPM=200 的最短间隔
  let lastBeatFrame = -minInterval;

  const beats: BeatInfo[] = [];

  for (let i = 1; i < normalizedEnergy.length - 1; i++) {
    const current = normalizedEnergy[i];
    const prev = normalizedEnergy[i - 1];
    const next = normalizedEnergy[i + 1];

    // 峰值条件：当前帧高于邻居 + 高于局部平均 + 高于阈值
    const isPeak =
      current > prev &&
      current > next &&
      current > localAvg[i] * 1.3 &&
      current > threshold;

    if (isPeak && i - lastBeatFrame >= minInterval) {
      beats.push({
        time: (i * hopSize) / sampleRate,
        strength: Math.min(1, current * 2),
      });
      lastBeatFrame = i;
    }
  }

  // ── 步骤 5: 计算 BPM ──
  let bpm = 0;
  let medianInterval = 0;

  if (beats.length >= 2) {
    const intervals: number[] = [];
    for (let i = 1; i < beats.length; i++) {
      intervals.push(beats[i].time - beats[i - 1].time);
    }
    intervals.sort((a, b) => a - b);
    medianInterval = intervals[Math.floor(intervals.length / 2)];

    if (medianInterval > 0) {
      bpm = Math.round(60 / medianInterval);
    }
  }

  return { beats, bpm, medianInterval, duration };
}

/**
 * 从音频 URL 加载并检测节拍
 *
 * @param audioUrl 音频文件 URL
 * @param sensitivity 检测灵敏度
 * @returns 节拍检测结果
 */
export async function detectBeatsFromUrl(
  audioUrl: string,
  sensitivity: number = 1.0
): Promise<BeatDetectionResult> {
  const audioContext = new AudioContext();

  try {
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return detectBeats(audioBuffer, sensitivity);
  } finally {
    await audioContext.close();
  }
}

/**
 * 获取离给定时间点最近的节拍信息
 *
 * @param beats 节拍列表
 * @param time 当前时间 (秒)
 * @param lookAhead 前视窗口 (秒)，默认 0.05
 * @returns 最近的节拍，如果不在窗口内则返回 null
 */
export function getNearestBeat(
  beats: BeatInfo[],
  time: number,
  lookAhead: number = 0.08
): BeatInfo | null {
  let nearest: BeatInfo | null = null;
  let minDist = Infinity;

  for (const beat of beats) {
    const dist = Math.abs(beat.time - time);
    if (dist < lookAhead && dist < minDist) {
      nearest = beat;
      minDist = dist;
    }
  }

  return nearest;
}

/**
 * 检查当前时间是否处于节拍点附近
 *
 * @param beats 节拍列表
 * @param time 当前时间 (秒)
 * @param window 检测窗口 (秒)，默认 0.04
 */
export function isOnBeat(
  beats: BeatInfo[],
  time: number,
  window: number = 0.04
): boolean {
  return beats.some((b) => Math.abs(b.time - time) < window);
}
