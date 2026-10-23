"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeHeroScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) {
      return undefined;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0, 7.5);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    group.rotation.set(-0.18, 0.28, 0.12);
    scene.add(group);

    const orb = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.42, 2),
      new THREE.MeshBasicMaterial({
        color: 0xf0b54b,
        wireframe: true,
        transparent: true,
        opacity: 0.78
      })
    );
    group.add(orb);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.98, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0x1b4d3e,
        transparent: true,
        opacity: 0.42
      })
    );
    group.add(core);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffe2a9,
      transparent: true,
      opacity: 0.52,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.018, 8, 96), ringMaterial);
    ring.rotation.set(0.7, 0.25, -0.35);
    group.add(ring);

    const points = new THREE.BufferGeometry();
    const positions = new Float32Array(180 * 3);
    for (let index = 0; index < positions.length; index += 3) {
      const radius = 2.2 + Math.random() * 1.8;
      const angle = Math.random() * Math.PI * 2;
      positions[index] = Math.cos(angle) * radius;
      positions[index + 1] = (Math.random() - 0.5) * 3.8;
      positions[index + 2] = Math.sin(angle) * radius * 0.55;
    }
    points.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(
      points,
      new THREE.PointsMaterial({ color: 0xffe2a9, size: 0.025, transparent: true, opacity: 0.85 })
    );
    scene.add(stars);

    const resize = () => {
      const width = mount.clientWidth || 1;
      const height = mount.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    let frameId;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animate = (time) => {
      const elapsed = time * 0.00035;
      group.rotation.y = 0.28 + elapsed;
      group.rotation.x = -0.18 + Math.sin(elapsed * 1.8) * 0.06;
      orb.rotation.z = elapsed * 1.4;
      stars.rotation.y = -elapsed * 0.35;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    if (prefersReducedMotion) {
      renderer.render(scene, camera);
    } else {
      frameId = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      renderer.dispose();
      orb.geometry.dispose();
      orb.material.dispose();
      core.geometry.dispose();
      core.material.dispose();
      ring.geometry.dispose();
      ring.material.dispose();
      points.dispose();
      stars.material.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} aria-hidden="true" className="three-hero-scene" />;
}
