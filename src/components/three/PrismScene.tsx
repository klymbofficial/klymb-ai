"use client";

import {
  AdditiveBlending, CanvasTexture, Color, CylinderGeometry, DirectionalLight, DoubleSide, EdgesGeometry, Group,
  LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, PerspectiveCamera, PlaneGeometry,
  PMREMGenerator, Scene, WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useEffect, useRef } from "react";

/** The five roles the light splits into, warm and on brand rather than a rainbow. */
const RAYS = ["#ffffff", "#ffd9d4", "#f0868b", "#f2b46a", "#ffb3a7"];

/**
 * "Your title is the liability. Your domain knowledge is the asset." as an
 * object: one white beam (the title) enters a glass prism and leaves as five
 * warm rays (the roles it can become). The prism turns slowly and leans toward
 * the pointer on a spring; the rays breathe.
 *
 * Decorative: aria-hidden, renders only on screen with the tab visible, pixel
 * ratio capped, everything disposed on unmount.
 */
export function PrismScene({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, { opacity: "0", transition: "opacity 900ms cubic-bezier(0.23, 1, 0.32, 1)" });

    const scene = new Scene();
    const pmrem = new PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;

    const camera = new PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(-0.6, 0.4, 9);
    camera.lookAt(0.5, 0, 0);

    const key = new DirectionalLight(0xffffff, 2);
    key.position.set(-3, 4, 5);
    scene.add(key);

    // The prism: a triangular glass bar, standing on its edge.
    const prismGeo = new CylinderGeometry(1.05, 1.05, 2.1, 3, 1);
    // A crystal rather than true glass: on a transparent canvas there is nothing
    // behind it to refract, so bright reflective faces and white edges carry it.
    const glass = new MeshPhysicalMaterial({
      color: new Color("#ffffff"), metalness: 0.1, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.04,
      iridescence: 1, iridescenceIOR: 1.35, envMapIntensity: 2.2, transparent: true, opacity: 0.42, side: DoubleSide,
      depthWrite: false,
    });
    const prism = new Mesh(prismGeo, glass);
    const edgesGeo = new EdgesGeometry(prismGeo);
    const edgeMat = new LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.85 });
    prism.add(new LineSegments(edgesGeo, edgeMat));
    prism.rotation.z = Math.PI / 2;
    const rig = new Group();
    rig.add(prism);
    scene.add(rig);

    // Light fades along its length, like real light, instead of stopping at an edge.
    const fade = (() => {
      const c = document.createElement("canvas");
      c.width = 256; c.height = 1;
      const g = c.getContext("2d")!;
      const grad = g.createLinearGradient(0, 0, 256, 0);
      grad.addColorStop(0, "#fff");
      grad.addColorStop(1, "#000");
      g.fillStyle = grad;
      g.fillRect(0, 0, 256, 1);
      return new CanvasTexture(c);
    })();
    const rayGeo = new PlaneGeometry(1, 1);
    rayGeo.translate(0.5, 0, 0); // grows outward from its start point

    // Light in: one white beam (the title), brightest where it meets the prism.
    const beamMat = new MeshBasicMaterial({ color: "#ffffff", alphaMap: fade, transparent: true, opacity: 0.95, blending: AdditiveBlending, depthWrite: false, side: DoubleSide });
    const beam = new Mesh(rayGeo, beamMat);
    beam.scale.set(2.4, 0.045, 1);
    beam.position.set(-0.45, 0.02, 0);
    beam.rotation.z = Math.PI + 0.06; // points left, so its bright end sits at the prism

    // Light out: five warm rays (the roles), fanning right and fading.
    const rays = RAYS.map((c, i) => {
      const mat = new MeshBasicMaterial({ color: c, alphaMap: fade, transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false, side: DoubleSide });
      const ray = new Mesh(rayGeo, mat);
      ray.position.set(0.5, 0, 0);
      ray.rotation.z = 0.22 - i * 0.11;
      ray.scale.set(3.4, 0.07, 1);
      scene.add(ray);
      return { ray, mat, phase: i * 0.9 };
    });
    scene.add(beam);

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      Object.assign(renderer.domElement.style, { width: "100%", height: "100%" });
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // Pointer lean on a damped spring.
    const target = { x: 0, y: 0 };
    const lean = { x: 0, y: 0, vx: 0, vy: 0 };
    const onMove = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 0.6;
      target.y = (e.clientY / window.innerHeight - 0.5) * 0.3;
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

      for (const axis of ["x", "y"] as const) {
        const v = axis === "x" ? "vx" : "vy";
        lean[v] += ((target[axis] - lean[axis]) * 60 - lean[v] * 14) * dt;
        lean[axis] += lean[v] * dt;
      }
      rig.rotation.y = t * 0.35 + lean.x;
      rig.rotation.x = lean.y;
      // The rays draw out from the prism on arrival, then breathe.
      const arrive = Math.min(1, t / 1.2);
      for (const r of rays) {
        r.ray.scale.x = 3.4 * (1 - Math.pow(1 - arrive, 3));
        r.mat.opacity = 0.65 + Math.sin(t * 1.6 + r.phase) * 0.2;
      }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);
    requestAnimationFrame(() => { renderer.domElement.style.opacity = "1"; });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      prismGeo.dispose();
      edgesGeo.dispose();
      edgeMat.dispose();
      rayGeo.dispose();
      fade.dispose();
      glass.dispose();
      beamMat.dispose();
      rays.forEach((r) => r.mat.dispose());
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} aria-hidden="true" className={className} />;
}
