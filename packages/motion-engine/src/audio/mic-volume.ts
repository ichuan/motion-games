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
    source.connect(this.analyser);
    // Do NOT connect to destination — we don't want to play back mic audio
    this.dataArray = new Uint8Array(this.analyser.fftSize);
  }

  /** Returns normalized volume 0-1 based on RMS of time-domain waveform */
  getVolume(): number {
    if (!this.analyser || !this.dataArray) return 0;
    this.analyser.getByteTimeDomainData(this.dataArray as any);
    // Calculate RMS (root mean square) — true loudness measure
    let sumSq = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const v = (this.dataArray[i] - 128) / 128; // normalize to -1..1
      sumSq += v * v;
    }
    return Math.sqrt(sumSq / this.dataArray.length);
  }

  dispose(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.analyser = null;
    this.dataArray = null;
    this.stream = null;
  }
}
