import * as THREE from 'three';

export class DemoVideoCard {
  readonly group = new THREE.Group();
  readonly material: THREE.MeshBasicMaterial;
  private active = false;
  private mode: 'dock' | 'card' = 'dock';
  private opacity = 0.55;

  constructor(scene: THREE.Scene, private readonly video: HTMLVideoElement) {
    this.group.name = 'WebcamVideoCard';
    this.group.position.set(0, 1.9, -1.65);
    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.repeat.x = -1;
    texture.offset.x = 1;
    this.material = new THREE.MeshBasicMaterial({
      map: texture, transparent: true, opacity: this.opacity,
      depthWrite: false, side: THREE.DoubleSide,
    });
    const geometry = new THREE.PlaneGeometry(1.1, 0.825);
    this.group.add(new THREE.Mesh(geometry, this.material));
    const border = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({ color: 0xd9f4ff, transparent: true, opacity: 0.35 }),
    );
    border.position.z = 0.002;
    this.group.add(border);
    this.group.visible = false;
    scene.add(this.group);
  }

  setActive(active: boolean): void {
    this.active = active;
    this.sync();
  }

  setMode(mode: 'dock' | 'card'): void {
    this.mode = mode;
    this.sync();
  }

  setOpacity(opacity: number): void {
    this.opacity = opacity;
    this.material.opacity = opacity;
    this.video.style.opacity = String(opacity);
  }

  private sync(): void {
    this.group.visible = this.active && this.mode === 'card';
    this.video.style.display = this.active ? 'block' : 'none';
  }
}
