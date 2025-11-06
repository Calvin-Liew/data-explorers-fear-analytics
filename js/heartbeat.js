console.log("💓 heartbeat.js LOADED!");

/**
 * 心跳音效系统
 * 模拟真实的双重心跳声（lub-dub）
 */
class HeartbeatSound {
  constructor() {
    this.audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    this.isPlaying = false;
    this.currentBPM = 80;
    this.timeoutId = null;
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    this.volume = 0.3; // 默认音量
  }

  /**
   * 播放单次心跳音（lub 或 dub）
   */
  playBeat(frequency, duration, volume, delay = 0) {
    const now = this.audioContext.currentTime + delay;
    const osc = this.audioContext.createOscillator();
    const beatGain = this.audioContext.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(
      frequency * 0.7,
      now + duration
    );

    beatGain.gain.setValueAtTime(volume * this.volume, now);
    beatGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(beatGain);
    beatGain.connect(this.gainNode);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * 播放完整的心跳周期（lub-dub）
   */
  playHeartbeat() {
    if (!this.isPlaying) return;

    // 第一声心跳 "lub" - 更低沉、更长
    this.playBeat(120, 0.15, 0.4, 0);

    // 第二声心跳 "dub" - 更高、更短
    this.playBeat(150, 0.1, 0.3, 0.18);

    // 根据BPM计算下次心跳的时间间隔
    const interval = (60 / this.currentBPM) * 1000; // 转换为毫秒

    // 安排下一次心跳
    this.timeoutId = setTimeout(() => {
      this.playHeartbeat();
    }, interval);
  }

  /**
   * 开始播放心跳
   */
  start(bpm = 80) {
    if (this.isPlaying) {
      this.stop();
    }

    this.currentBPM = bpm;
    this.isPlaying = true;
    console.log(`💓 Heart started beating at ${bpm} BPM`);
    this.playHeartbeat();
  }

  /**
   * 停止播放心跳
   */
  stop() {
    this.isPlaying = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    console.log("💔 Heart stopped");
  }

  /**
   * 更新BPM（心跳会平滑过渡）
   */
  updateBPM(newBPM) {
    this.currentBPM = newBPM;
    console.log(`💓 BPM updated to ${newBPM}`);
  }

  /**
   * 设置音量
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.gainNode.gain.value = this.volume;
  }

  /**
   * 播放警报音（危险状态）
   */
  playAlarm() {
    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const alarmGain = this.audioContext.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(800, now);

    alarmGain.gain.setValueAtTime(0.2, now);
    alarmGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(alarmGain);
    alarmGain.connect(this.audioContext.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * 播放平线音（极度危险）
   */
  playFlatline() {
    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const flatlineGain = this.audioContext.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, now);

    flatlineGain.gain.setValueAtTime(0.3, now);

    osc.connect(flatlineGain);
    flatlineGain.connect(this.audioContext.destination);

    osc.start(now);
    osc.stop(now + 2); // 持续2秒
  }
}

// 创建全局实例
window.HeartbeatSound = HeartbeatSound;