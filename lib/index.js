import { Vector3 as h, Matrix4 as v, Quaternion as f } from "three";
import { XRDevice as w, metaQuest3 as b, P_SPACE as k, P_JOINT_SPACE as z } from "iwer";
const x = [
  "wrist",
  "thumb-metacarpal",
  "thumb-phalanx-proximal",
  "thumb-phalanx-distal",
  "thumb-tip",
  "index-finger-metacarpal",
  "index-finger-phalanx-proximal",
  "index-finger-phalanx-intermediate",
  "index-finger-phalanx-distal",
  "index-finger-tip",
  "middle-finger-metacarpal",
  "middle-finger-phalanx-proximal",
  "middle-finger-phalanx-intermediate",
  "middle-finger-phalanx-distal",
  "middle-finger-tip",
  "ring-finger-metacarpal",
  "ring-finger-phalanx-proximal",
  "ring-finger-phalanx-intermediate",
  "ring-finger-phalanx-distal",
  "ring-finger-tip",
  "pinky-finger-metacarpal",
  "pinky-finger-phalanx-proximal",
  "pinky-finger-phalanx-intermediate",
  "pinky-finger-phalanx-distal",
  "pinky-finger-tip"
], M = [0, 1, 2, 3, 4, -5, 5, 6, 7, 8, -9, 9, 10, 11, 12, -13, 13, 14, 15, 16, -17, 17, 18, 19, 20];
function E(d, t) {
  return Math.hypot(d.x - t.x, d.y - t.y, d.z - t.z);
}
function T(d, t, n, s = 0) {
  if (t.length < 21 || n.length < 21) return null;
  const e = t[0], i = Math.hypot(t[5].x - t[17].x, t[5].y - t[17].y), r = E(n[5], n[17]) / Math.max(i, 0.025) / (2 * Math.tan(Math.PI / 6)), c = Math.min(0.85, Math.max(0.25, r)), a = { x: -(e.x - 0.5) * 1.15, y: 1.35 - (e.y - 0.5) * 0.85, z: c - 1.1 - s }, m = n.map((l) => ({
    x: a.x - (l.x - n[0].x),
    y: a.y - (l.y - n[0].y),
    z: a.z + (l.z - n[0].z)
  })), p = M.map((l) => {
    if (l >= 0) return m[l];
    const u = m[-l];
    return { x: (a.x + u.x) / 2, y: (a.y + u.y) / 2, z: (a.z + u.z) / 2 };
  });
  return { handedness: d, joints: p, radius: 0.01 };
}
const C = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm", g = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
class H {
  video = document.createElement("video");
  reach = 0;
  landmarker = null;
  stream = null;
  frameId = 0;
  lastVideoTime = -1;
  lastInference = 0;
  generation = 0;
  onHands = () => {
  };
  onError = () => {
  };
  constructor() {
    this.video.autoplay = !0, this.video.muted = !0, this.video.playsInline = !0;
  }
  async start() {
    if (this.stream) return;
    const t = ++this.generation, n = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: !1 });
    if (t !== this.generation) {
      n.getTracks().forEach((s) => s.stop());
      return;
    }
    this.stream = n, this.video.srcObject = n;
    try {
      await this.video.play();
      const { FilesetResolver: s, HandLandmarker: e } = await import("@mediapipe/tasks-vision"), i = await s.forVisionTasks(C);
      if (t !== this.generation) return;
      const o = {
        baseOptions: { modelAssetPath: g, delegate: "GPU" },
        runningMode: "VIDEO",
        numHands: 2
      };
      let r;
      try {
        r = await e.createFromOptions(i, o);
      } catch {
        r = await e.createFromOptions(i, {
          ...o,
          baseOptions: { modelAssetPath: g, delegate: "CPU" }
        });
      }
      if (t !== this.generation) {
        r.close();
        return;
      }
      this.landmarker = r, this.frameId = requestAnimationFrame(this.tick);
    } catch (s) {
      if (t !== this.generation) return;
      throw this.stop(), s;
    }
  }
  stop() {
    this.generation += 1, cancelAnimationFrame(this.frameId), this.frameId = 0, this.lastVideoTime = -1, this.landmarker?.close(), this.landmarker = null, this.stream?.getTracks().forEach((t) => t.stop()), this.stream = null, this.video.srcObject = null, this.onHands([]);
  }
  tick = (t) => {
    if (!(!this.landmarker || !this.stream)) {
      if (this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && this.video.currentTime !== this.lastVideoTime && t - this.lastInference >= 33) {
        this.lastVideoTime = this.video.currentTime, this.lastInference = t;
        try {
          const n = this.landmarker.detectForVideo(this.video, t), s = [];
          for (let e = 0; e < n.landmarks.length; e += 1) {
            const i = n.handedness[e]?.[0]?.categoryName;
            if (i !== "Left" && i !== "Right") continue;
            const o = T(
              i.toLowerCase(),
              n.landmarks[e],
              n.worldLandmarks[e],
              this.reach
            );
            o && s.push(o);
          }
          this.onHands(s);
        } catch (n) {
          console.warn("[webcam-xr] Hand tracking stopped", n), this.stop(), this.onError(n);
          return;
        }
      }
      this.frameId = requestAnimationFrame(this.tick);
    }
  };
}
const j = [6, 2, 3, 4, 3, 6, 7, 8, 9, 8, 11, 12, 13, 14, 13, 16, 17, 18, 19, 18, 21, 22, 23, 24, 23], y = new h(0, 0, -1);
class A {
  device = new w(b);
  frames = { left: null, right: null };
  matrix = new v();
  from = new h();
  to = new h();
  wrist = new h();
  scale = new h(1, 1, 1);
  direction = new h();
  rotation = new f();
  inverseHand = new f();
  constructor() {
    this.device.primaryInputMode = "hand";
    for (const t of ["left", "right"]) {
      const n = this.device.hands[t];
      n.connected = !1, n.updateHandPose = () => this.writeJoints(n, this.frames[t]);
    }
    this.device.installRuntime({ forceInstall: !0 });
  }
  setHands(t) {
    for (const n of ["left", "right"]) {
      const s = t.find((i) => i.handedness === n) ?? null;
      this.frames[n] = s;
      const e = this.device.hands[n];
      if (e.connected = !!s, s) {
        const i = s.joints[0];
        e.position.set(i.x, i.y, i.z);
        const o = s.joints[4], r = s.joints[9];
        this.direction.set(r.x - i.x, r.y - i.y, r.z - i.z), this.direction.lengthSq() > 1e-6 && (this.rotation.setFromUnitVectors(y, this.direction.normalize()), e.quaternion.set(this.rotation.x, this.rotation.y, this.rotation.z, this.rotation.w));
        const c = Math.hypot(o.x - r.x, o.y - r.y, o.z - r.z) < 0.028;
        e.updatePinchValue(c ? 1 : 0);
      } else
        e.setPinchValueImmediate(0);
    }
  }
  stop() {
    this.setHands([]), this.device.activeSession?.end(), this.device.uninstallRuntime();
  }
  writeJoints(t, n) {
    if (!n) return;
    const s = n.joints[0];
    this.wrist.set(s.x, s.y, s.z), this.inverseHand.set(t.quaternion.x, t.quaternion.y, t.quaternion.z, t.quaternion.w).invert();
    for (let e = 0; e < x.length; e += 1) {
      const i = t.inputSource.hand?.get(x[e]);
      if (!i) continue;
      const o = n.joints[e], r = n.joints[j[e]];
      this.from.set(o.x, o.y, o.z), this.to.set(r.x, r.y, r.z), this.direction.subVectors(this.to, this.from), this.direction.lengthSq() > 1e-8 ? this.rotation.setFromUnitVectors(y, this.direction.normalize()) : this.rotation.identity(), this.from.sub(this.wrist).applyQuaternion(this.inverseHand), this.rotation.premultiply(this.inverseHand), this.matrix.compose(this.from, this.rotation, this.scale);
      const c = i[k].offsetMatrix;
      for (let a = 0; a < 16; a += 1) c[a] = this.matrix.elements[a];
      i[z].radius = n.radius;
    }
  }
}
class I {
  previous = {};
  update(t, n) {
    for (const s of ["left", "right"]) {
      const e = t.find((r) => r.handedness === s);
      if (!e) {
        delete this.previous[s];
        continue;
      }
      const i = this.previous[s];
      if (!i || n - i.time > 250 || i.joints.length !== e.joints.length) {
        this.previous[s] = { joints: e.joints.map((r) => ({ ...r })), time: n };
        continue;
      }
      const o = Math.max(8e-3, Math.min(0.1, (n - i.time) / 1e3));
      for (let r = 0; r < e.joints.length; r += 1) {
        const c = e.joints[r], a = i.joints[r], m = Math.hypot(c.x - a.x, c.y - a.y, c.z - a.z) / o, p = Math.max(0.018, 0.11 - m * 0.15), l = 1 - Math.exp(-o / p);
        a.x += (c.x - a.x) * l, a.y += (c.y - a.y) * l, a.z += (c.z - a.z) * l, c.x = a.x, c.y = a.y, c.z = a.z;
      }
      i.time = n;
    }
    return t;
  }
  reset() {
    this.previous = {};
  }
}
function O() {
  document.documentElement.dataset.webcamXr = "true";
  const d = new A(), t = new H(), n = new I();
  t.onHands = (a) => {
    d.setHands(n.update(a, performance.now())), i.textContent = a.length ? `${a.length} hand${a.length === 1 ? "" : "s"}` : "No hands";
  };
  const s = document.createElement("aside");
  s.setAttribute("aria-label", "Webcam hand tracking"), s.style.cssText = "position:fixed;right:12px;bottom:28vh;z-index:1001;display:flex;align-items:center;gap:9px;padding:7px 9px;border:1px solid #ffffff33;border-radius:12px;background:#191b20e8;color:white;font:12px system-ui;box-shadow:0 5px 22px #0004;";
  const e = document.createElement("button");
  e.type = "button", e.textContent = "Start webcam", e.title = "Use your webcam as WebXR hands", e.style.cssText = "border:0;border-radius:7px;background:#fff;color:#111;padding:6px 9px;font:inherit;cursor:pointer;";
  const i = document.createElement("span");
  i.setAttribute("role", "status"), i.textContent = "Off", i.style.minWidth = "52px";
  const o = document.createElement("input");
  o.type = "range", o.min = "-0.35", o.max = "0.35", o.step = "0.01", o.value = "0", o.title = "Move virtual hands toward or away from the scene", o.style.cssText = "width:64px;accent-color:#fff;", o.addEventListener("input", () => {
    t.reach = Number(o.value);
  });
  const r = document.createElement("label");
  r.textContent = "Distance", r.style.cssText = "display:flex;align-items:center;gap:6px;", r.append(o), t.video.style.cssText = "display:none;width:100px;height:75px;object-fit:cover;border-radius:6px;transform:scaleX(-1);", s.append(e, i, r, t.video), document.body.append(s), t.onError = () => {
    e.dataset.active = "false", e.textContent = "Start webcam", t.video.style.display = "none", i.textContent = "Tracking stopped";
  };
  let c = !1;
  return e.addEventListener("click", async () => {
    if (!c) {
      if (e.dataset.active === "true") {
        t.stop(), n.reset(), e.dataset.active = "false", e.textContent = "Start webcam", t.video.style.display = "none", i.textContent = "Off";
        return;
      }
      c = !0, e.disabled = !0, i.textContent = "Starting…";
      try {
        await t.start(), e.dataset.active = "true", e.textContent = "Stop webcam", t.video.style.display = "block", i.textContent = "No hands";
      } catch (a) {
        i.textContent = a instanceof DOMException && a.name === "NotAllowedError" ? "Camera denied" : "Unavailable", console.warn("[webcam-xr] Could not start camera", a);
      } finally {
        c = !1, e.disabled = !1;
      }
    }
  }), window.addEventListener("pagehide", () => t.stop(), { once: !0 }), window.__webcamXR = d, d;
}
export {
  I as HandSmoother,
  x as JOINT_NAMES,
  H as WebcamHands,
  A as WebcamXRDevice,
  T as handFromLandmarks,
  O as installWebcamXR
};
