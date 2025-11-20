

import React, { useRef, useEffect, useCallback } from 'react';
import { Duelist, Particle, Shockwave } from '../types';
import { playSaberClash, playSaberSwing, playForcePush, playHit } from '../utils/audio';

interface GameCanvasProps {
  onGameOver: (score: number, won: boolean) => void;
  setPlayerHealth: (h: number) => void;
  setEnemyHealth: (h: number) => void;
  setPlayerForce: (f: number) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ 
  onGameOver, 
  setPlayerHealth, 
  setEnemyHealth, 
  setPlayerForce 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const shakeRef = useRef<number>(0); // Screen shake magnitude
  
  // Game State Refs
  const playerRef = useRef<Duelist>({
    id: 'player',
    x: 200,
    y: 0, // Y will be set relative to floor horizon
    width: 60,
    height: 140,
    direction: 1,
    color: '#e2e8f0',
    saberColor: '#00ffff',
    health: 100,
    maxHealth: 100,
    force: 100,
    maxForce: 100,
    state: 'IDLE',
    stateTimer: 0,
    velocity: { x: 0, y: 0 },
    isPlayer: true,
    aiCooldown: 0,
    attackVariant: 0
  });

  const enemyRef = useRef<Duelist>({
    id: 'enemy',
    x: 600,
    y: 0,
    width: 60,
    height: 140,
    direction: -1,
    color: '#1a202c',
    saberColor: '#ff0000',
    health: 100,
    maxHealth: 100,
    force: 100,
    maxForce: 100,
    state: 'IDLE',
    stateTimer: 0,
    velocity: { x: 0, y: 0 },
    isPlayer: false,
    aiCooldown: 0,
    attackVariant: 0
  });

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const gameActive = useRef(true);
  
  // Perspective Constants
  const HORIZON_Y = 0.45; // 45% down the screen
  const FLOOR_Y = 0.9; // 90% down the screen (where feet are)

  const GRAVITY = 0.8;
  const MOVE_SPEED = 6;
  const ATTACK_DURATION = 25; // Slightly faster attacks for better feel
  const STUN_DURATION = 60; 

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      const floorLevel = canvas.height * FLOOR_Y;
      playerRef.current.y = floorLevel - playerRef.current.height;
      enemyRef.current.y = floorLevel - enemyRef.current.height;
      
      // Reset positions if out of bounds
      if (playerRef.current.x > canvas.width) playerRef.current.x = 100;
      if (enemyRef.current.x > canvas.width) enemyRef.current.x = canvas.width - 200;
    };
    window.addEventListener('resize', resize);
    resize();

    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    requestRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createParticles = (x: number, y: number, color: string, count: number = 10, speed: number = 10) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        life: 1.0,
        color,
        size: Math.random() * 4 + 2
      });
    }
  };

  const createShockwave = (x: number, y: number, color: string) => {
    shockwavesRef.current.push({
      x,
      y,
      radius: 20,
      maxRadius: 400,
      color,
      opacity: 0.8,
      width: 15
    });
  };

  const triggerShake = (amount: number) => {
    shakeRef.current = amount;
  };

  const updateDuelist = (duelist: Duelist, opponent: Duelist, canvasWidth: number) => {
    if (duelist.health <= 0) return;

    // 1. State Management
    if (duelist.state !== 'IDLE' && duelist.state !== 'MOVING') {
      duelist.stateTimer--;
      if (duelist.stateTimer <= 0) {
        // AI Vulnerability Window after attacking
        if (!duelist.isPlayer && duelist.state === 'ATTACKING') {
            duelist.aiCooldown = 50; // Increased vulnerability window
        }
        duelist.state = 'IDLE';
      }
    }

    // AI Cooldown Tick
    if (duelist.aiCooldown > 0) duelist.aiCooldown--;

    // 2. Movement & Physics
    if (duelist.state === 'IDLE' || duelist.state === 'MOVING') {
      if (duelist.isPlayer) {
        // Player Input
        duelist.velocity.x = 0;
        if (keysPressed.current['KeyA'] || keysPressed.current['ArrowLeft']) duelist.velocity.x = -MOVE_SPEED;
        if (keysPressed.current['KeyD'] || keysPressed.current['ArrowRight']) duelist.velocity.x = MOVE_SPEED;
        
        // Update state based on velocity
        if (Math.abs(duelist.velocity.x) > 0) duelist.state = 'MOVING';
        else duelist.state = 'IDLE';

        // Actions
        if (keysPressed.current['KeyJ']) {
          duelist.state = 'ATTACKING';
          duelist.stateTimer = ATTACK_DURATION;
          // Cycle attack variants: 0 -> 1 -> 2 -> 0
          duelist.attackVariant = (duelist.attackVariant + 1) % 3;
          playSaberSwing();
        } else if (keysPressed.current['KeyS']) {
          duelist.state = 'BLOCKING';
          duelist.stateTimer = 5; // Sustain block while held
        } else if (keysPressed.current['KeyK'] && duelist.force > 30) {
           // Force Push
           duelist.force -= 30;
           playForcePush();
           createShockwave(duelist.x + (duelist.direction * 50), duelist.y + duelist.height/2, '#00ffff');
           createParticles(duelist.x + (duelist.direction * 50), duelist.y + duelist.height/2, '#00ffff', 20, 10);
           triggerShake(10);
           
           // Simple Push Logic
           if (Math.abs(duelist.x - opponent.x) < 500 && opponent.state !== 'BLOCKING') {
               opponent.velocity.x = duelist.direction * 30; // Heavy Knockback
               opponent.state = 'STUNNED';
               opponent.stateTimer = STUN_DURATION;
               playHit();
           } else if (Math.abs(duelist.x - opponent.x) < 500 && opponent.state === 'BLOCKING') {
               // Blocked force push
               opponent.velocity.x = duelist.direction * 8;
               playSaberClash();
           }
        }
      } else {
        // --- AI LOGIC ---
        const dist = duelist.x - opponent.x;
        const absDist = Math.abs(dist);
        
        // Face player
        duelist.direction = dist > 0 ? -1 : 1;

        // AI is exhausted/recovering
        if (duelist.aiCooldown > 0) {
            // Retreat slowly while recovering
            if (absDist < 300) {
                 duelist.velocity.x = duelist.direction * -3; 
                 duelist.state = 'MOVING';
            } else {
                 duelist.state = 'IDLE';
                 duelist.velocity.x = 0;
            }
        } 
        // AI Active Logic
        else if (opponent.state === 'ATTACKING' && absDist < 200) {
           // Defensive
           // 25% chance to block
           if (Math.random() < 0.25) { 
               duelist.state = 'BLOCKING';
               duelist.stateTimer = 15;
           } else {
               // Panic backstep
               duelist.velocity.x = duelist.direction * -MOVE_SPEED;
               duelist.state = 'MOVING';
           }
        } else if (absDist > 120) {
           // Move closer
           duelist.velocity.x = duelist.direction * (MOVE_SPEED * 0.6); // Slower AI movement
           duelist.state = 'MOVING';
        } else {
           // Attack chance
           if (Math.random() < 0.015) {
             duelist.state = 'ATTACKING';
             duelist.stateTimer = ATTACK_DURATION;
             // Random attack variant for AI
             duelist.attackVariant = Math.floor(Math.random() * 3);
             playSaberSwing();
           } else {
             duelist.state = 'IDLE';
             duelist.velocity.x = 0;
           }
        }
      }
    }

    // Apply Velocity
    duelist.x += duelist.velocity.x;
    // Friction
    if (duelist.state === 'STUNNED') {
        duelist.velocity.x *= 0.9;
    }

    // Bounds
    duelist.x = Math.max(50, Math.min(canvasWidth - duelist.width - 50, duelist.x));

    // Regen Force
    if (duelist.force < duelist.maxForce) duelist.force += 0.3;

    // Face opponent automatically if idle
    if (duelist.state === 'IDLE' || duelist.state === 'MOVING') {
        duelist.direction = opponent.x > duelist.x ? 1 : -1;
    }
  };

  const checkCollisions = () => {
    const p = playerRef.current;
    const e = enemyRef.current;

    // Attack Hitbox Logic
    // Hit occurs at 40% through the animation
    const hitFrame = Math.floor(ATTACK_DURATION * 0.6);

    const handleAttack = (attacker: Duelist, defender: Duelist) => {
      if (attacker.state === 'ATTACKING' && attacker.stateTimer === hitFrame) {
        const range = 180; 
        const dist = Math.abs(attacker.x - defender.x);
        
        // Check range and direction
        const facingTarget = (attacker.direction === 1 && defender.x > attacker.x) || 
                             (attacker.direction === -1 && defender.x < attacker.x);

        if (dist < range && facingTarget) {
          if (defender.state === 'BLOCKING') {
            // Blocked!
            createParticles((attacker.x + defender.x)/2 + 30, attacker.y + 50, '#ffff00', 15, 12);
            playSaberClash();
            triggerShake(5);
            attacker.state = 'STUNNED'; // Recoil
            attacker.stateTimer = 20; 
            defender.force = Math.max(0, defender.force - 10);
            defender.aiCooldown = 20; 
          } else if (defender.state === 'ATTACKING') {
             // Clash! Both hit
             createParticles((attacker.x + defender.x)/2 + 30, attacker.y + 50, '#ffffff', 30, 15);
             playSaberClash();
             triggerShake(15);
             attacker.state = 'STUNNED';
             attacker.stateTimer = 30;
             defender.state = 'STUNNED';
             defender.stateTimer = 30;
          } else {
            // Hit!
            const damage = attacker.isPlayer ? 15 : 10;
            defender.health -= damage;
            defender.state = 'HIT';
            defender.stateTimer = 20;
            defender.velocity.x = attacker.direction * 20; // Knockback
            createParticles(defender.x + defender.width/2, defender.y + 50, defender.saberColor, 20, 8);
            playHit();
            triggerShake(10);
          }
        }
      }
    };

    handleAttack(p, e);
    handleAttack(e, p);
  };

  const gameLoop = useCallback(() => {
    if (!canvasRef.current) return;
    if (!gameActive.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Screen Shake
    if (shakeRef.current > 0) {
        const dx = (Math.random() - 0.5) * shakeRef.current;
        const dy = (Math.random() - 0.5) * shakeRef.current;
        ctx.save();
        ctx.translate(dx, dy);
        shakeRef.current *= 0.9; // Damping
        if (shakeRef.current < 0.5) shakeRef.current = 0;
    }

    // Draw 2.5D Environment
    drawPerspectiveFloor(ctx, canvas.width, canvas.height);

    // Update Logic
    if (playerRef.current.health > 0 && enemyRef.current.health > 0) {
        updateDuelist(playerRef.current, enemyRef.current, canvas.width);
        updateDuelist(enemyRef.current, playerRef.current, canvas.width);
        checkCollisions();
    } else {
        // Game Over Check
        if (gameActive.current) {
             gameActive.current = false;
             setTimeout(() => {
                 const won = playerRef.current.health > 0;
                 onGameOver(Math.floor(playerRef.current.health * 10), won);
             }, 2000); // Slow motion finish delay
        }
    }

    // Draw Effects (Back)
    drawShockwaves(ctx);

    // Draw Characters (Order based on Z - simplified to just drawing both)
    drawDuelist(ctx, playerRef.current);
    drawDuelist(ctx, enemyRef.current);

    // Draw Particles (Front)
    updateAndDrawParticles(ctx);

    // UI Updates
    setPlayerHealth(playerRef.current.health);
    setEnemyHealth(enemyRef.current.health);
    setPlayerForce(playerRef.current.force);

    if (shakeRef.current > 0) ctx.restore(); // Restore shake

    requestRef.current = requestAnimationFrame(gameLoop);
  }, [onGameOver, setPlayerHealth, setEnemyHealth, setPlayerForce]);

  const drawPerspectiveFloor = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const horizonY = h * HORIZON_Y;
      
      // Sky/Space Background
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, '#0a0a12'); // Deep space
      gradient.addColorStop(HORIZON_Y, '#1a1a2e'); // Horizon glow
      gradient.addColorStop(1, '#000');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // Floor Grid (Death Star style)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(w, horizonY);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.clip();

      ctx.fillStyle = '#111';
      ctx.fillRect(0, horizonY, w, h - horizonY);

      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;

      // Vertical perspective lines
      const centerX = w / 2;
      for (let i = -10; i <= 10; i++) {
          const x = centerX + (i * 100); 
          ctx.beginPath();
          ctx.moveTo(x, horizonY); 
          // Project outwards to create perspective
          const spread = (x - centerX) * 4; 
          ctx.lineTo(x + spread, h);
          ctx.stroke();
      }

      // Horizontal lines
      for (let i = 0; i < 10; i++) {
          const y = horizonY + Math.pow(i / 10, 2) * (h - horizonY);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
      }
      ctx.restore();
  };

  const drawShockwaves = (ctx: CanvasRenderingContext2D) => {
      for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
          const wave = shockwavesRef.current[i];
          wave.radius += 15;
          wave.opacity *= 0.92;
          
          ctx.beginPath();
          ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0, 255, 255, ${wave.opacity})`;
          ctx.lineWidth = wave.width;
          ctx.stroke();

          if (wave.opacity < 0.01) {
              shockwavesRef.current.splice(i, 1);
          }
      }
  };

  const updateAndDrawParticles = (ctx: CanvasRenderingContext2D) => {
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.05;
      p.vy += GRAVITY * 0.2; // Slight gravity

      if (p.life <= 0) {
        particlesRef.current.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  };

  const drawDuelist = (ctx: CanvasRenderingContext2D, d: Duelist) => {
    ctx.save();
    
    // Shadow (Projected on floor)
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.ellipse(d.x + d.width/2, d.y + d.height - 5, 30, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pivot at center bottom for drawing
    const centerX = d.x + d.width/2;
    const centerY = d.y + d.height;
    ctx.translate(centerX, centerY); 
    ctx.scale(d.direction, 1); // Flip based on direction

    // --- ANIMATION VARIABLES ---
    const isMoving = d.state === 'MOVING';
    const walkCycle = isMoving ? Math.sin(Date.now() / 150) : 0;
    const breathe = Math.sin(Date.now() / 500) * 2;
    
    // Colors
    const tunicColor = d.isPlayer ? '#e2e8f0' : '#1a1a1a';
    const robeColor = d.isPlayer ? '#785c3c' : '#000000'; // Brown vs Black
    const skinColor = d.isPlayer ? '#f5d0b0' : '#333333';
    const beltColor = '#4a3b2a';

    // --- LEGS ---
    const legLength = 50;
    const hipY = -65;
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 16;
    ctx.strokeStyle = robeColor;

    // Back Leg
    ctx.beginPath();
    ctx.moveTo(0, hipY);
    const backLegAngle = isMoving ? -walkCycle * 0.5 : 0.1;
    ctx.lineTo(Math.sin(backLegAngle) * 20, hipY + legLength); // Knee (simplified to foot for thick line)
    ctx.stroke();

    // Front Leg
    ctx.beginPath();
    ctx.moveTo(0, hipY);
    const frontLegAngle = isMoving ? walkCycle * 0.5 : -0.1;
    ctx.lineTo(Math.sin(frontLegAngle) * 20, hipY + legLength);
    ctx.stroke();

    // --- TORSO ---
    ctx.fillStyle = tunicColor;
    const torsoWidth = 34;
    const torsoHeight = 60;
    ctx.fillRect(-torsoWidth/2, hipY - torsoHeight, torsoWidth, torsoHeight);

    // Robe Vest (Outer layer)
    ctx.fillStyle = robeColor;
    ctx.beginPath();
    ctx.moveTo(-torsoWidth/2 - 4, hipY - torsoHeight);
    ctx.lineTo(torsoWidth/2 + 4, hipY - torsoHeight);
    ctx.lineTo(torsoWidth/2 + 2, hipY);
    ctx.lineTo(-torsoWidth/2 - 2, hipY);
    ctx.fill();

    // Belt
    ctx.fillStyle = beltColor;
    ctx.fillRect(-torsoWidth/2 - 2, hipY - 25, torsoWidth + 4, 10);
    // Belt buckle
    ctx.fillStyle = '#silver';
    ctx.fillRect(-5, hipY - 25, 10, 10);

    // --- HEAD ---
    const headY = hipY - torsoHeight - 2;
    
    // Hood/Helmet Back
    if (!d.isPlayer) {
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(0, headY - 8, 22, 0, Math.PI*2); // Hood volume
        ctx.fill();
    }

    // Face/Head
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(0, headY - 10 + breathe, 14, 0, Math.PI * 2);
    ctx.fill();

    // Hood Front / Hair
    if (d.isPlayer) {
        // Hair
        ctx.fillStyle = '#5d4037';
        ctx.beginPath();
        ctx.arc(0, headY - 14 + breathe, 14, Math.PI, 0);
        ctx.fill();
    } else {
        // Sith Hood
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.moveTo(-16, headY - 20 + breathe);
        ctx.quadraticCurveTo(0, headY - 40 + breathe, 16, headY - 20 + breathe);
        ctx.lineTo(18, headY + breathe);
        ctx.lineTo(-18, headY + breathe);
        ctx.fill();
        // Red eyes glow
        ctx.fillStyle = '#f00';
        ctx.shadowColor = '#f00';
        ctx.shadowBlur = 5;
        ctx.fillRect(-6, headY - 10 + breathe, 4, 2);
        ctx.fillRect(2, headY - 10 + breathe, 4, 2);
        ctx.shadowBlur = 0;
    }

    // --- ARMS ---
    const shoulderY = headY + 15;
    const shoulderX = 0;

    // Back Arm (Non-dominant)
    ctx.strokeStyle = tunicColor;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(shoulderX - 10, shoulderY + breathe);
    const backArmAngle = isMoving ? walkCycle : 0.2;
    const backHandX = (shoulderX - 10) + Math.sin(backArmAngle) * 30;
    const backHandY = (shoulderY + breathe) + Math.cos(backArmAngle) * 30;
    ctx.lineTo(backHandX, backHandY);
    ctx.stroke();
    // Hand
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(backHandX, backHandY, 6, 0, Math.PI*2);
    ctx.fill();

    // Front Arm (Saber Arm) logic
    let armAngle = 0.5; // Default resting
    let elbowBend = 0.5;
    let saberAngle = -Math.PI / 3; 

    if (d.state === 'ATTACKING') {
        const progress = 1 - (d.stateTimer / ATTACK_DURATION);
        
        if (d.attackVariant === 0) {
            // Variant 0: Overhead Chop (Big vertical swing)
            // Starts high back (-PI), ends low front (PI/4)
            saberAngle = -Math.PI/1.2 + (progress * Math.PI * 1.3); 
            armAngle = -Math.PI/1.5 + (progress * Math.PI / 1.4);
            elbowBend = 0.1 + (progress * 0.4);
        } else if (d.attackVariant === 1) {
            // Variant 1: Horizontal Swing (Wide side slash)
            // Flat horizontal plane
            saberAngle = -Math.PI + (progress * Math.PI * 1.4); 
            armAngle = -Math.PI/2 + (progress * Math.PI / 2);
            elbowBend = 0.5;
        } else {
            // Variant 2: Uppercut/Thrust (Low to High)
            // Starts low forward, ends high back
            saberAngle = Math.PI/3 - (progress * Math.PI * 1.2);
            armAngle = 0 - (progress * Math.PI / 1.5);
            elbowBend = 0.2;
        }

    } else if (d.state === 'BLOCKING') {
        saberAngle = -Math.PI / 4; 
        armAngle = -Math.PI / 1.8;
        elbowBend = 1.8; // Tight guard
    } else if (d.state === 'MOVING') {
        armAngle = 0.5 + (Math.sin(Date.now() / 150) * 0.5);
        saberAngle = -Math.PI / 3 + (Math.cos(Date.now() / 150) * 0.2);
    }

    // Draw Front Arm (Two segments: Upper Arm, Forearm)
    ctx.strokeStyle = tunicColor;
    ctx.lineWidth = 12;
    
    const upperArmLen = 25;
    const foreArmLen = 25;

    // Shoulder pos
    const sX = shoulderX + 10;
    const sY = shoulderY + breathe;

    // Elbow pos (Simple IK approximation)
    const eX = sX + Math.sin(armAngle) * upperArmLen;
    const eY = sY + Math.cos(armAngle) * upperArmLen;

    // Hand pos
    const hX = eX + Math.sin(armAngle + elbowBend) * foreArmLen;
    const hY = eY + Math.cos(armAngle + elbowBend) * foreArmLen;

    // Draw Arm
    ctx.beginPath();
    ctx.moveTo(sX, sY);
    ctx.lineTo(eX, eY);
    ctx.lineTo(hX, hY);
    ctx.stroke();

    // Hand
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(hX, hY, 7, 0, Math.PI*2);
    ctx.fill();

    // --- LIGHTSABER ---
    // Calculate tip position based on saber angle relative to hand
    const hiltLen = 20;
    const bladeLen = 90;

    // The saber angle needs to be relative to the hand/arm flow roughly, or independent
    // We use the calculated saberAngle from state
    const tipX = hX + Math.cos(saberAngle) * (hiltLen + bladeLen);
    const tipY = hY + Math.sin(saberAngle) * (hiltLen + bladeLen);
    const hiltEndX = hX + Math.cos(saberAngle) * hiltLen;
    const hiltEndY = hY + Math.sin(saberAngle) * hiltLen;

    // Hilt
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(hX, hY);
    ctx.lineTo(hiltEndX, hiltEndY);
    ctx.stroke();

    // Glow Effect
    ctx.globalCompositeOperation = 'screen'; 
    
    ctx.shadowBlur = 30;
    ctx.shadowColor = d.saberColor;
    ctx.strokeStyle = d.saberColor;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(hiltEndX, hiltEndY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    ctx.shadowBlur = 15;
    ctx.lineWidth = 6;
    ctx.stroke();

    // Core
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#fff';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(hiltEndX, hiltEndY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    ctx.restore();
  };

  return <canvas ref={canvasRef}