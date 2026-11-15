import * as THREE from 'three';

export function createDemoScene(renderer: THREE.WebGLRenderer): { scene: THREE.Scene; target: DemoTarget } {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101723);
  scene.fog = new THREE.Fog(0x101723, 2.5, 7);
  scene.add(new THREE.HemisphereLight(0xb7d9f5, 0x243042, 1.6));

  const key = new THREE.DirectionalLight(0xffe7d0, 2.8);
  key.position.set(-1.2, 3.2, 1.4);
  key.target.position.set(0, 0.9, -0.7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -2;
  key.shadow.camera.right = 2;
  key.shadow.camera.top = 2;
  key.shadow.camera.bottom = -2;
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far = 7;
  key.shadow.bias = -0.0002;
  key.shadow.radius = 3;
  scene.add(key, key.target);

  const fill = new THREE.PointLight(0x69a7ef, 9, 3);
  fill.position.set(1, 1.7, -0.4);
  scene.add(fill);

  // An elevated stage keeps the cast shadow visible in the desktop XR view.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8),
    new THREE.MeshStandardMaterial({ color: 0x263449, roughness: 0.92, metalness: 0 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.72;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(8, 32, 0x435a72, 0x304255);
  grid.position.y = 0.723;
  scene.add(grid);

  const target = new DemoTarget(scene);
  return { scene, target };
}

export class DemoTarget {
  readonly group = new THREE.Group();
  readonly material = new THREE.MeshStandardMaterial({
    color: 0x8dd9e7, metalness: 0.25, roughness: 0.34, flatShading: true,
    emissive: 0x33647b, emissiveIntensity: 0.22,
  });
  activeHand = -1;
  private readonly lastPoint = new THREE.Vector3();
  private spin = 0;

  constructor(scene: THREE.Scene) {
    this.group.name = 'DemoTarget';
    this.group.position.set(0, 1.35, -0.6);
    this.group.rotation.x = 0.2;
    const shape = new THREE.Mesh(new THREE.IcosahedronGeometry(0.19, 1), this.material);
    shape.castShadow = true;
    this.group.add(shape);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.192, 0)),
      new THREE.LineBasicMaterial({ color: 0xd9f4ff, transparent: true, opacity: 0.35 }),
    );
    this.group.add(edges);
    scene.add(this.group);
  }

  update(dt: number, pinches: readonly (THREE.Vector3 | null)[]): void {
    const step = Math.min(dt, 0.05);
    const held = this.activeHand >= 0 ? pinches[this.activeHand] : null;
    if (this.activeHand >= 0 && !held) this.activeHand = -1;
    if (this.activeHand < 0) {
      for (let i = 0; i < pinches.length; i += 1) {
        const point = pinches[i];
        if (point && point.distanceToSquared(this.group.position) < 0.32 ** 2) {
          this.activeHand = i;
          this.lastPoint.copy(point);
          break;
        }
      }
    } else if (held) {
      const dx = held.x - this.lastPoint.x;
      const dy = held.y - this.lastPoint.y;
      this.group.rotation.y += dx * 7;
      this.group.rotation.x += dy * 7;
      this.spin = step > 0 ? THREE.MathUtils.clamp(dx * 3 / step, -4, 4) : 0;
      this.lastPoint.copy(held);
    }
    if (this.activeHand < 0) {
      this.group.rotation.y += (0.28 + this.spin) * step;
      this.spin *= Math.exp(-3 * step);
    }
    const active = this.activeHand >= 0;
    this.material.emissiveIntensity += ((active ? 0.7 : 0.22) - this.material.emissiveIntensity) * Math.min(1, step * 12);
    this.group.scale.setScalar(THREE.MathUtils.lerp(this.group.scale.x, active ? 1.08 : 1, Math.min(1, step * 10)));
  }
}
