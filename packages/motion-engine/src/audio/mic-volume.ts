export class MicVolume {
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private stream: MediaStream | null = null;

  /** Initialize from an existing audio MediaStream (e.g. from getUserMedia) */
  init(stream: MediaStream): void {
    this.stream = stream;
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    source.connect(this.analyser);
    // Do NOT connect to destination — we don't want to play back mic audio
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  /** Returns normalized volume 0-1 */
  getVolume(): number {
    if (!this.analyser || !this.dataArray) return 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.analyser.getByteFrequencyData(this.dataArray as any);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) sum += this.dataArray[i];
    return sum / (this.dataArray.length * 255);
  }

  dispose(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.analyser = null;
    this.dataArray = null;
    this.stream = null;
  }
}
