import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Application, extend, useApplication, useTick } from '@pixi/react';
import { Container, Graphics } from 'pixi.js';
import { useFaceTracking, useMicVolume, TiltSteering, SFX, unlockAudio } from '@motion-games/engine';
import { StartScreen } from './components/StartScreen';
import { CountdownOverlay } from './components/CountdownOverlay';
import { HUD } from './components/HUD';
import { ResultScreen } from './components/ResultScreen';
import { useGameStore } from './store/useGameStore';
import { drawRoad, laneToScreen } from './game/Road';
import { type BikeState, createBike, updateBike, crashBike, getSpeedMultiplier, isBikeVisible, drawBike } from './game/Bike';
import { type ObstacleState, spawnObstacle, updateObstacle, isObstacleOffScreen, drawObstacle } from './game/Obstacle';
import { type CoinState, spawnCoin, updateCoin, isCoinOffScreen, drawCoin } from './game/Coin';
import { checkObstacleCollision, checkCoinCollision } from './game/collision';
import {
  GAME_DURATION, BASE_SPEED, MAX_SPEED, BIKE_Y_RATIO,
  OBSTACLE_SPAWN_START, OBSTACLE_SPAWN_END, COIN_SPAWN_CHANCE, COIN_SCORE,
  CRASH_SHAKE_INTENSITY, CRASH_SHAKE_DURATION,
} from './game/constants';
import { ScreenShake } from './effects/ScreenShake';
import { FloatingTextSystem } from './effects/FloatingText';
import { DustParticleSystem } from './effects/DustParticles';

extend({ Container, Graphics });

const NOOP_DRAW = () => {};

// ── Engine sound using Web Audio oscillator ──
class EngineSound {
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private ctx: AudioContext | null = null;

  start() {
    this.ctx = new AudioContext();
    this.osc = this.ctx.createOscillator();
    this.gain = this.ctx.createGain();
    this.osc.type = 'sawtooth';
    this.osc.frequency.value = 60;
    this.gain.gain.value = 0.06;
    this.osc.connect(this.gain);
    this.gain.connect(this.ctx.destination);
    this.osc.start();
  }

  setSpeed(speed01: number) {
    if (!this.osc || !this.gain || !this.ctx) return;
    // Map 0-1 to 60-180Hz
    const freq = 60 + speed01 * 120;
    const vol = 0.04 + speed01 * 0.08;
    this.osc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1);
    this.gain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
  }

  stop() {
    this.osc?.stop();
    this.osc = null;
    this.gain = null;
    this.ctx?.close();
    this.ctx = null;
  }
}

// ── Road + objects renderer ──
function GameRenderer({
  bike,
  obstacles,
  coins,
  scrollOffset,
  gameTime,
}: {
  bike: React.RefObject<BikeState>;
  obstacles: React.RefObject<ObstacleState[]>;
  coins: React.RefObject<CoinState[]>;
  scrollOffset: React.RefObject<number>;
  gameTime: React.RefObject<number>;
}) {
  const { app } = useApplication();
  const gRef = useRef<any>(null);

  useTick(() => {
    const g = gRef.current;
    if (!g || !app) return;
    g.clear();

    const w = app.screen.width;
    const h = app.screen.height;

    // Draw road
    drawRoad(g, w, h, scrollOffset.current!);

    // Draw coins
    for (const coin of coins.current!) {
      if (!coin.alive) continue;
      const pos = laneToScreen(coin.laneX, coin.depth, w, h);
      if (pos.scale > 0.15) {
        drawCoin(g, pos.x, pos.y, pos.scale, gameTime.current!);
      }
    }

    // Draw obstacles
    for (const obs of obstacles.current!) {
      if (!obs.alive) continue;
      const pos = laneToScreen(obs.laneX, obs.depth, w, h);
      if (pos.scale > 0.15) {
        drawObstacle(g, obs, pos.x, pos.y, pos.scale);
      }
    }

    // Draw bike
    const b = bike.current!;
    const bikePos = laneToScreen(b.laneX, BIKE_Y_RATIO, w, h);
    drawBike(g, bikePos.x, bikePos.y, bikePos.scale, isBikeVisible(b));
  });

  return <pixiGraphics ref={gRef} draw={NOOP_DRAW} />;
}

// ── Dust particles renderer ──
function DustRenderer({ dust }: { dust: DustParticleSystem }) {
  const gRef = useRef<any>(null);
  useTick(() => {
    const g = gRef.current;
    if (!g) return;
    g.clear();
    dust.draw(g);
  });
  return <pixiGraphics ref={gRef} draw={NOOP_DRAW} />;
}

// ── Game scene ──
function GameScene({
  videoRef,
  audioStream,
  speedRef,
  volumeRef,
  hasMicRef,
  onTrackingStatus,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  audioStream: MediaStream | null;
  speedRef: React.MutableRefObject<number>;
  volumeRef: React.MutableRefObject<number>;
  hasMicRef: React.MutableRefObject<boolean>;
  onTrackingStatus?: (s: { detectorReady: boolean; hasFace: boolean; error: string | null }) => void;
}) {
  const { app } = useApplication();
  const bikeRef = useRef<BikeState>(createBike());
  const obstaclesRef = useRef<ObstacleState[]>([]);
  const coinsRef = useRef<CoinState[]>([]);
  const scrollOffsetRef = useRef(0);
  const gameTimeRef = useRef(0);
  const spawnTimerRef = useRef(0);

  const screenShake = useMemo(() => new ScreenShake(), []);
  const floatingTexts = useMemo(() => new FloatingTextSystem(), []);
  const dust = useMemo(() => new DustParticleSystem(), []);
  const tiltSteering = useMemo(() => new TiltSteering(), []);
  const engineSound = useMemo(() => new EngineSound(), []);

  const gameState = useGameStore((s) => s.state);
  const addDistance = useGameStore((s) => s.addDistance);
  const addCoin = useGameStore((s) => s.addCoin);
  const updateTopSpeed = useGameStore((s) => s.updateTopSpeed);
  const setTimeLeft = useGameStore((s) => s.setTimeLeft);
  const setState = useGameStore((s) => s.setState);

  // Face tracking
  const { tiltAngle, detectorReady, error } = useFaceTracking(videoRef, true);

  // Mic volume
  const { volume } = useMicVolume(audioStream);

  // Report tracking status
  useEffect(() => {
    onTrackingStatus?.({ detectorReady, hasFace: tiltAngle !== null, error });
  }, [detectorReady, tiltAngle !== null, error, onTrackingStatus]);

  // Start/stop engine sound with game state
  useEffect(() => {
    if (gameState === 'playing') {
      engineSound.start();
    } else {
      engineSound.stop();
    }
    return () => engineSound.stop();
  }, [gameState, engineSound]);

  // Steering from tilt + touch fallback (touch handled in volumeRef)
  const steeringRef = useRef(0);
  if (tiltAngle !== null) {
    steeringRef.current = tiltSteering.update(tiltAngle);
  }

  // Game tick
  useTick(({ deltaTime }) => {
    const dt = deltaTime / 60;

    screenShake.update(dt);
    floatingTexts.update(dt);
    dust.update(dt);

    if (app?.stage) {
      app.stage.position.set(screenShake.offsetX, screenShake.offsetY);
    }

    if (gameState !== 'playing') return;

    const bike = bikeRef.current;
    const obstacles = obstaclesRef.current;
    const coins = coinsRef.current;
    const screenW = app?.screen.width ?? 400;
    const screenH = app?.screen.height ?? 800;

    // Update volume from mic (must come before speed calc)
    if (audioStream) {
      volumeRef.current = volume;
    }
    hasMicRef.current = audioStream !== null;

    // Calculate speed from volume — amplify mic input for responsiveness
    const ampVolume = Math.min(1, volumeRef.current * 3.5);
    const rawSpeed = BASE_SPEED + ampVolume * (MAX_SPEED - BASE_SPEED);
    const speed = rawSpeed * getSpeedMultiplier(bike);
    const speedNorm = (speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED);
    speedRef.current = Math.max(0, Math.min(1, speedNorm));

    // Update engine sound
    engineSound.setSpeed(speedRef.current);
    updateTopSpeed(speed);

    // Update bike steering
    updateBike(bike, steeringRef.current, dt);

    // Scroll road — high multiplier so speed difference is very visible
    scrollOffsetRef.current += speed * dt * 0.5;

    // Distance tracking (speed in px/s → convert to "meters")
    addDistance(speed * dt * 0.05);

    // Timer
    gameTimeRef.current += dt;
    const remaining = Math.max(0, GAME_DURATION - gameTimeRef.current);
    setTimeLeft(remaining);
    if (remaining <= 0) {
      setState('result');
      return;
    }

    // Spawn obstacles with increasing difficulty
    const progress = gameTimeRef.current / GAME_DURATION;
    const spawnInterval = OBSTACLE_SPAWN_START + (OBSTACLE_SPAWN_END - OBSTACLE_SPAWN_START) * progress;
    spawnTimerRef.current -= dt;
    if (spawnTimerRef.current <= 0) {
      obstacles.push(spawnObstacle());
      if (Math.random() < COIN_SPAWN_CHANCE) {
        coins.push(spawnCoin());
      }
      spawnTimerRef.current = spawnInterval;
    }

    // Update obstacles and coins
    for (const obs of obstacles) {
      if (obs.alive) updateObstacle(obs, speed, dt);
    }
    for (const coin of coins) {
      if (coin.alive) updateCoin(coin, speed, dt);
    }

    // Collision: obstacles
    if (bike.stunTimer <= 0) {
      const hitObs = checkObstacleCollision(bike, obstacles);
      if (hitObs) {
        hitObs.alive = false;
        crashBike(bike);
        screenShake.trigger(CRASH_SHAKE_INTENSITY, CRASH_SHAKE_DURATION);
        SFX.bomb();
        const pos = laneToScreen(hitObs.laneX, 0.85, screenW, screenH);
        floatingTexts.add('CRASH!', pos.x, pos.y - 30, '#FF5722');
      }
    }

    // Collision: coins
    const hitCoin = checkCoinCollision(bike, coins);
    if (hitCoin) {
      hitCoin.alive = false;
      addCoin();
      SFX.pop();
      const pos = laneToScreen(hitCoin.laneX, 0.85, screenW, screenH);
      floatingTexts.add(`+${COIN_SCORE}`, pos.x, pos.y - 20, '#FFD54F');
    }

    // Dust particles behind bike
    if (speedRef.current > 0.1) {
      const bikePos = laneToScreen(bike.laneX, BIKE_Y_RATIO, screenW, screenH);
      dust.emit(bikePos.x, bikePos.y + 5, speedRef.current);
    }

    // Cleanup dead objects
    if (obstacles.length > 30) {
      obstaclesRef.current = obstacles.filter((o) => o.alive && !isObstacleOffScreen(o));
    }
    if (coins.length > 20) {
      coinsRef.current = coins.filter((c) => c.alive && !isCoinOffScreen(c));
    }
  });

  // Reset on game start
  useEffect(() => {
    if (gameState === 'playing') {
      bikeRef.current = createBike();
      obstaclesRef.current = [];
      coinsRef.current = [];
      scrollOffsetRef.current = 0;
      gameTimeRef.current = 0;
      spawnTimerRef.current = 1.0;
    }
  }, [gameState]);

  return (
    <>
      <GameRenderer
        bike={bikeRef}
        obstacles={obstaclesRef}
        coins={coinsRef}
        scrollOffset={scrollOffsetRef}
        gameTime={gameTimeRef}
      />
      <DustRenderer dust={dust} />
    </>
  );
}

// ── Floating text HTML overlay ──
function FloatingTextOverlay({ texts }: { texts: FloatingTextSystem }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 16);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 60 }}>
      {texts.items.map((item, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: item.x,
            top: item.y,
            transform: `translate(-50%, -50%) scale(${item.scale})`,
            color: item.color,
            fontSize: 24,
            fontWeight: 900,
            opacity: item.alpha,
            textShadow: '0 2px 6px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}
        >
          {item.text}
        </div>
      ))}
    </div>
  );
}

// ── Touch throttle button (fallback when no mic) ──
function TouchThrottle({ onThrottleChange }: { onThrottleChange: (v: number) => void }) {
  return (
    <div
      onPointerDown={() => onThrottleChange(1)}
      onPointerUp={() => onThrottleChange(0)}
      onPointerLeave={() => onThrottleChange(0)}
      onPointerCancel={() => onThrottleChange(0)}
      style={{
        position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        width: 80, height: 80, borderRadius: '50%',
        background: 'rgba(255,87,34,0.7)', border: '3px solid rgba(255,255,255,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28, color: '#fff', fontWeight: 900,
        zIndex: 80, cursor: 'pointer', userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
      }}
    >
      🔥
    </div>
  );
}

// ── Main App ──
export function App() {
  const gameState = useGameStore((s) => s.state);
  const setState = useGameStore((s) => s.setState);
  const resetGame = useGameStore((s) => s.resetGame);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [trackingStatus, setTrackingStatus] = useState({ detectorReady: false, hasFace: false, error: null as string | null });
  const speedRef = useRef(0);
  const volumeRef = useRef(0);
  const hasMicRef = useRef(false);
  const touchVolumeRef = useRef(0);

  // Combined volume: mic volume or touch throttle
  const [displaySpeed, setDisplaySpeed] = useState(0);
  const [displayVolume, setDisplayVolume] = useState(0);

  // Poll refs for HUD display (60fps)
  useEffect(() => {
    let running = true;
    function loop() {
      if (!running) return;
      setDisplaySpeed(speedRef.current);
      setDisplayVolume(volumeRef.current);
      requestAnimationFrame(loop);
    }
    loop();
    return () => { running = false; };
  }, []);

  // Init camera + mic
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        // Separate audio stream
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          const audioOnly = new MediaStream(audioTracks);
          setAudioStream(audioOnly);
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          if (!cancelled) setCameraReady(true);
        }
      } catch (err: any) {
        // Try video-only if audio was denied
        if (!cancelled && err.name === 'NotAllowedError') {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
              audio: false,
            });
            if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              await videoRef.current.play();
              if (!cancelled) setCameraReady(true);
            }
          } catch {
            if (!cancelled) setCameraError('需要摄像头才能游戏，请授权后刷新页面。');
          }
        } else if (!cancelled) {
          setCameraError('需要摄像头才能游戏，请授权后刷新页面。');
        }
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  const handleTrackingStatus = useCallback((s: { detectorReady: boolean; hasFace: boolean; error: string | null }) => {
    setTrackingStatus(s);
  }, []);

  const handleStart = useCallback(() => {
    unlockAudio();
    SFX.start();
    setState('countdown');
  }, [setState]);

  const handleCountdownComplete = useCallback(() => {
    setState('playing');
    useGameStore.getState().setTimeLeft(GAME_DURATION);
  }, [setState]);

  const handleRestart = useCallback(() => {
    resetGame();
    setState('countdown');
  }, [resetGame, setState]);

  const handleTouchThrottle = useCallback((v: number) => {
    touchVolumeRef.current = v;
    volumeRef.current = v;
  }, []);

  const showTouchThrottle = !audioStream && gameState === 'playing';

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Application
        resizeTo={typeof window !== 'undefined' ? window : undefined}
        background="#4CAF50"
        antialias
      >
        <GameScene
          videoRef={videoRef}
          audioStream={audioStream}
          speedRef={speedRef}
          volumeRef={volumeRef}
          hasMicRef={hasMicRef}
          onTrackingStatus={handleTrackingStatus}
        />
      </Application>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'fixed', bottom: 12, right: 12,
          width: 120, height: 90, borderRadius: 12,
          objectFit: 'cover', transform: 'scaleX(-1)',
          opacity: 0.5, border: '2px solid rgba(255,255,255,0.3)',
          zIndex: 100, pointerEvents: 'none',
        }}
      />

      {gameState === 'idle' && (
        <StartScreen
          loading={!cameraReady || !trackingStatus.detectorReady}
          error={cameraError || trackingStatus.error}
          onStart={handleStart}
        />
      )}
      {gameState === 'countdown' && (
        <CountdownOverlay onComplete={handleCountdownComplete} />
      )}
      {gameState === 'playing' && (
        <HUD speed={displaySpeed} volume={displayVolume} hasMic={audioStream !== null} />
      )}
      {gameState === 'result' && <ResultScreen onRestart={handleRestart} />}

      {showTouchThrottle && <TouchThrottle onThrottleChange={handleTouchThrottle} />}

    </div>
  );
}
