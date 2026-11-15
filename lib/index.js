import { Vector3 as m, Matrix4 as v, Quaternion as f } from "three";
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
function E(l, n) {
  return Math.hypot(l.x - n.x, l.y - n.y, l.z - n.z);
}
function T(l, n, t, s = 0) {
  if (n.length < 21 || t.length < 21) return null;
  const a = n[0], e = Math.hypot(n[5].x - n[17].x, n[5].y - n[17].y), i = E(t[5], t[17]) / Math.max(e, 0.025) / (2 * Math.tan(Math.PI / 6)), c = Math.min(0.85, Math.max(0.25, i)), o = { x: -(a.x - 0.5) * 1.15, y: 1.35 - (a.y - 0.5) * 0.85, z: c - 1.1 - s }, d = t.map((h) => ({
    x: o.x - (h.x - t[0].x),
    y: o.y - (h.y - t[0].y),
    z: o.z + (h.z - t[0].z)
  })), p = M.map((h) => {
    if (h >= 0) return d[h];
    const u = d[-h];
    return { x: (o.x + u.x) / 2, y: (o.y + u.y) / 2, z: (o.z + u.z) / 2 };
  });
  return { handedness: l, joints: p, radius: 0.01 };
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
    const n = ++this.generation, t = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: !1 });
    if (n !== this.generation) {
      t.getTracks().forEach((s) => s.stop());
      return;
    }
    this.stream = t, this.video.srcObject = t;
    try {
      await this.video.play();
      const { FilesetResolver: s, HandLandmarker: a } = await import("@mediapipe/tasks-vision"), e = await s.forVisionTasks(C);
      if (n !== this.generation) return;
      const r = {
        baseOptions: { modelAssetPath: g, delegate: "GPU" },
        runningMode: "VIDEO",
        numHands: 2
      };
      let i;
      try {
        i = await a.createFromOptions(e, r);
      } catch {
        i = await a.createFromOptions(e, {
          ...r,
          baseOptions: { modelAssetPath: g, delegate: "CPU" }
        });
      }
      if (n !== this.generation) {
        i.close();
        return;
      }
      this.landmarker = i, this.frameId = requestAnimationFrame(this.tick);
    } catch (s) {
      if (n !== this.generation) return;
      throw this.stop(), s;
    }
  }
  stop() {
    this.generation += 1, cancelAnimationFrame(this.frameId), this.frameId = 0, this.lastVideoTime = -1, this.landmarker?.close(), this.landmarker = null, this.stream?.getTracks().forEach((n) => n.stop()), this.stream = null, this.video.srcObject = null, this.onHands([]);
  }
  tick = (n) => {
    if (!(!this.landmarker || !this.stream)) {
      if (this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && this.video.currentTime !== this.lastVideoTime && n - this.lastInference >= 33) {
        this.lastVideoTime = this.video.currentTime, this.lastInference = n;
        try {
          const t = this.landmarker.detectForVideo(this.video, n), s = [];
          for (let a = 0; a < t.landmarks.length; a += 1) {
            const e = t.handedness[a]?.[0]?.categoryName;
            if (e !== "Left" && e !== "Right") continue;
            const r = T(
              e.toLowerCase(),
              t.landmarks[a],
              t.worldLandmarks[a],
              this.reach
            );
            r && s.push(r);
          }
          this.onHands(s);
        } catch (t) {
          console.warn("[webcam-xr] Hand tracking stopped", t), this.stop(), this.onError(t);
          return;
        }
      }
      this.frameId = requestAnimationFrame(this.tick);
    }
  };
}
const j = [6, 2, 3, 4, 3, 6, 7, 8, 9, 8, 11, 12, 13, 14, 13, 16, 17, 18, 19, 18, 21, 22, 23, 24, 23], y = new m(0, 0, -1);
class S {
  device = new w(b);
  frames = { left: null, right: null };
  matrix = new v();
  from = new m();
  to = new m();
  wrist = new m();
  scale = new m(1, 1, 1);
  direction = new m();
  rotation = new f();
  inverseHand = new f();
  constructor() {
    this.device.primaryInputMode = "hand";
    for (const n of ["left", "right"]) {
      const t = this.device.hands[n];
      t.connected = !1, t.updateHandPose = () => this.writeJoints(t, this.frames[n]);
    }
    this.device.installRuntime({ forceInstall: !0 });
  }
  setHands(n) {
    for (const t of ["left", "right"]) {
      const s = n.find((e) => e.handedness === t) ?? null;
      this.frames[t] = s;
      const a = this.device.hands[t];
      if (a.connected = !!s, s) {
        const e = s.joints[0];
        a.position.set(e.x, e.y, e.z);
        const r = s.joints[4], i = s.joints[9];
        this.direction.set(i.x - e.x, i.y - e.y, i.z - e.z), this.direction.lengthSq() > 1e-6 && (this.rotation.setFromUnitVectors(y, this.direction.normalize()), a.quaternion.set(this.rotation.x, this.rotation.y, this.rotation.z, this.rotation.w));
        const c = Math.hypot(r.x - i.x, r.y - i.y, r.z - i.z) < 0.028;
        a.updatePinchValue(c ? 1 : 0);
      } else
        a.setPinchValueImmediate(0);
    }
  }
  stop() {
    this.setHands([]), this.device.activeSession?.end(), this.device.uninstallRuntime();
  }
  writeJoints(n, t) {
    if (!t) return;
    const s = t.joints[0];
    this.wrist.set(s.x, s.y, s.z), this.inverseHand.set(n.quaternion.x, n.quaternion.y, n.quaternion.z, n.quaternion.w).invert();
    for (let a = 0; a < x.length; a += 1) {
      const e = n.inputSource.hand?.get(x[a]);
      if (!e) continue;
      const r = t.joints[a], i = t.joints[j[a]];
      this.from.set(r.x, r.y, r.z), this.to.set(i.x, i.y, i.z), this.direction.subVectors(this.to, this.from), this.direction.lengthSq() > 1e-8 ? this.rotation.setFromUnitVectors(y, this.direction.normalize()) : this.rotation.identity(), this.from.sub(this.wrist).applyQuaternion(this.inverseHand), this.rotation.premultiply(this.inverseHand), this.matrix.compose(this.from, this.rotation, this.scale);
      const c = e[k].offsetMatrix;
      for (let o = 0; o < 16; o += 1) c[o] = this.matrix.elements[o];
      e[z].radius = t.radius;
    }
  }
}
class A {
  previous = {};
  update(n, t) {
    for (const s of ["left", "right"]) {
      const a = n.find((i) => i.handedness === s);
      if (!a) {
        delete this.previous[s];
        continue;
      }
      const e = this.previous[s];
      if (!e || t - e.time > 250 || e.joints.length !== a.joints.length) {
        this.previous[s] = { joints: a.joints.map((i) => ({ ...i })), time: t };
        continue;
      }
      const r = Math.max(8e-3, Math.min(0.1, (t - e.time) / 1e3));
      for (let i = 0; i < a.joints.length; i += 1) {
        const c = a.joints[i], o = e.joints[i], d = Math.hypot(c.x - o.x, c.y - o.y, c.z - o.z) / r, p = Math.max(0.018, 0.11 - d * 0.15), h = 1 - Math.exp(-r / p);
        o.x += (c.x - o.x) * h, o.y += (c.y - o.y) * h, o.z += (c.z - o.z) * h, c.x = o.x, c.y = o.y, c.z = o.z;
      }
      e.time = t;
    }
    return n;
  }
  reset() {
    this.previous = {};
  }
}
function O(l = {}) {
  document.documentElement.dataset.webcamXr = "true";
  const n = new S(), t = new H(), s = new A();
  t.onHands = (d) => {
    n.setHands(s.update(d, performance.now())), r.textContent = d.length ? `${d.length} hand${d.length === 1 ? "" : "s"}` : "No hands";
  };
  const a = document.createElement("aside");
  a.setAttribute("aria-label", "Webcam hand tracking"), a.style.cssText = "position:fixed;right:12px;bottom:28vh;z-index:1001;display:flex;align-items:center;gap:9px;padding:7px 9px;border:1px solid #ffffff33;border-radius:12px;background:#191b20e8;color:white;font:12px system-ui;box-shadow:0 5px 22px #0004;";
  const e = document.createElement("button");
  e.type = "button", e.textContent = "Start webcam", e.title = "Use your webcam as WebXR hands", e.style.cssText = "border:0;border-radius:7px;background:#fff;color:#111;padding:6px 9px;font:inherit;cursor:pointer;";
  const r = document.createElement("span");
  r.setAttribute("role", "status"), r.textContent = "Off", r.style.minWidth = "52px";
  const i = document.createElement("input");
  i.type = "range", i.min = "-0.35", i.max = "0.35", i.step = "0.01", i.value = "0", i.title = "Move virtual hands toward or away from the scene", i.style.cssText = "width:64px;accent-color:#fff;", i.addEventListener("input", () => {
    t.reach = Number(i.value);
  });
  const c = document.createElement("label");
  c.textContent = "Distance", c.style.cssText = "display:flex;align-items:center;gap:6px;", c.append(i), t.video.style.cssText = "display:none;width:100px;height:75px;object-fit:cover;border-radius:6px;transform:scaleX(-1);", a.append(e, r, c, t.video), document.body.append(a), t.onError = () => {
    e.dataset.active = "false", e.textContent = "Start webcam", t.video.style.display = "none", r.textContent = "Tracking stopped", l.onStopped?.();
  };
  let o = !1;
  return e.addEventListener("click", async () => {
    if (!o) {
      if (e.dataset.active === "true") {
        t.stop(), s.reset(), e.dataset.active = "false", e.textContent = "Start webcam", t.video.style.display = "none", r.textContent = "Off", l.onStopped?.();
        return;
      }
      o = !0, e.disabled = !0, r.textContent = "Starting…";
      try {
        await t.start(), e.dataset.active = "true", e.textContent = "Stop webcam", t.video.style.display = "block", r.textContent = "No hands", l.onStarted?.();
      } catch (d) {
        r.textContent = d instanceof DOMException && d.name === "NotAllowedError" ? "Camera denied" : "Unavailable", console.warn("[webcam-xr] Could not start camera", d);
      } finally {
        o = !1, e.disabled = !1;
      }
    }
  }), window.addEventListener("pagehide", () => t.stop(), { once: !0 }), window.__webcamXR = n, n;
}
export {
  A as HandSmoother,
  x as JOINT_NAMES,
  H as WebcamHands,
  S as WebcamXRDevice,
  T as handFromLandmarks,
  O as installWebcamXR
};
