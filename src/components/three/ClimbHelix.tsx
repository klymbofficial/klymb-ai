"use client";

import {
  AmbientLight, BoxGeometry, Color, DirectionalLight, Group, Mesh, MeshStandardMaterial,
  PerspectiveCamera, PointLight, Scene, WebGLRenderer,
} from "three";
import { useEffect, useRef } from "react";

const DAYS = 30;
const EASE_OUT = (t: number) => 1 - Math.pow(1 - t, 4);

/**
 * The 30 days as a spiral staircase, in Three.js: one step per day, the four
 * checkpoint days in brand maroon, Day 30 glowing at the top. Steps rise into
 * place once, then the stair turns slowly and leans towards the pointer on a
 * spring, never snapping.
 *
 * Decorative, so: aria-hidden, renders only while on screen and the tab is
 * visible, device pixel ratio capped, everything disposed on unmount.
 */
export function ClimbHelix({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.opacity = "0";
    renderer.domElement.style.transition = "opacity 900ms cubic-bezier(0.23, 1, 0.32, 1)";

    const scene = new Scene();
    const camera = new PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 4.2, 12);
    camera.lookAt(0, 2.1, 0);

    scene.add(new AmbientLight(0xffffff, 1.1));
    const key = new DirectionalLight(0xffffff, 1.6);
    key.position.set(4, 8, 6);
    scene.add(key);
    const glow = new PointLight(new Color("#f0868b"), 30, 8, 2);
    scene.add(glow);

    const stair = new Group();
    scene.add(stair);
    const geo = new BoxGeometry(1.25, 0.16, 0.5);
    const plain = new MeshStandardMaterial({ color: "#d9d2d2", roughness: 0.45, metalness: 0.1 });
    const checkpoint = new MeshStandardMaterial({ color: "#83050b", roughness: 0.35, metalness: 0.1 });
    const summit = new MeshStandardMaterial({ color: "#f0868b", emissive: new Color("#83050b"), emissiveIntensity: 1.4, roughness: 0.3 });

    const steps: { mesh: Mesh; y: number }[] = [];
    for (let i = 0; i < DAYS; i++) {
      const day = i + 1;
      const mat = day === DAYS ? summit : day % 7 === 0 ? checkpoint : plain;
      const mesh = new Mesh(geo, mat);
      const a = i * 0.46;
      const y = i * 0.15;
      mesh.position.set(Math.cos(a) * 1.55, y, Math.sin(a) * 1.55);
      mesh.rotation.y = -a;
      stair.add(mesh);
      steps.push({ mesh, y });
    }
    glow.position.set(steps[DAYS - 1].mesh.position.x, steps[DAYS - 1].y + 0.6, steps[DAYS - 1].mesh.position.z);

    // Size to the host box.
    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // Pointer lean, followed by a critically damped spring.
    const target = { x: 0, y: 0 };
    const lean = { x: 0, y: 0, vx: 0, vy: 0 };
    const onMove = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 0.5;
      target.y = (e.clientY / window.innerHeight - 0.5) * 0.18;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(el);

    const start = performance.now();
    let last = start;
    let raf = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - start) / 1000;

      // Steps rise into place, staggered 45ms apart.
      for (let i = 0; i < steps.length; i++) {
        const p = Math.min(1, Math.max(0, (t - 0.15 - i * 0.045) / 0.7));
        const k = EASE_OUT(p);
        steps[i].mesh.position.y = steps[i].y - (1 - k) * 0.9;
        steps[i].mesh.scale.setScalar(0.9 + 0.1 * k);
      }

      for (const axis of ["x", "y"] as const) {
        const v = axis === "x" ? "vx" : "vy";
        lean[v] += ((target[axis] - lean[axis]) * 60 - lean[v] * 14) * dt;
        lean[axis] += lean[v] * dt;
      }
      stair.rotation.y = t * 0.12 + lean.x;
      stair.rotation.x = lean.y;
      glow.intensity = 26 + Math.sin(t * 2) * 6;

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);
    requestAnimationFrame(() => { renderer.domElement.style.opacity = "1"; });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      geo.dispose();
      plain.dispose();
      checkpoint.dispose();
      summit.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} aria-hidden="true" className={className} />;
}
