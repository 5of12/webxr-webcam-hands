import type { DemoVideoCard } from './demo-video-card';

export function mountDemoControls(panel: HTMLElement, card: DemoVideoCard): void {
  const button = panel.querySelector('button')!;
  const status = panel.querySelector<HTMLElement>('[role="status"]')!;
  const distance = panel.querySelector('label')!;
  const video = panel.querySelector('video')!;
  for (const element of [panel, button, status, distance, distance.querySelector('input')!, video]) {
    element.removeAttribute('style');
  }
  video.style.display = 'none';
  panel.className = 'demo-controls';

  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'demo-controls-handle';
  handle.textContent = 'Webcam hands';
  handle.title = 'Drag controls';
  handle.setAttribute('aria-label', 'Drag webcam controls');

  const actions = document.createElement('div');
  actions.className = 'demo-controls-actions';
  actions.append(button, status);

  const mode = document.createElement('button');
  mode.type = 'button';
  mode.className = 'demo-controls-mode';
  mode.textContent = 'Move video to scene';
  mode.setAttribute('aria-pressed', 'false');
  mode.addEventListener('click', () => {
    const cardMode = mode.getAttribute('aria-pressed') !== 'true';
    mode.setAttribute('aria-pressed', String(cardMode));
    mode.textContent = cardMode ? 'Dock video' : 'Move video to scene';
    panel.classList.toggle('video-card-mode', cardMode);
    card.setMode(cardMode ? 'card' : 'dock');
  });

  const opacity = document.createElement('label');
  opacity.className = 'demo-controls-opacity';
  opacity.textContent = 'Video opacity';
  const opacityInput = document.createElement('input');
  opacityInput.type = 'range';
  opacityInput.min = '0';
  opacityInput.max = '1';
  opacityInput.step = '0.05';
  opacityInput.value = '0.55';
  opacityInput.addEventListener('input', () => card.setOpacity(Number(opacityInput.value)));
  opacity.append(opacityInput);
  distance.className = 'demo-controls-distance';
  panel.replaceChildren(handle, actions, mode, distance, opacity, video);
  card.setOpacity(Number(opacityInput.value));

  let dragX = 0;
  let dragY = 0;
  function placePanel(left: number, top: number): void {
    panel.style.left = `${Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, left))}px`;
    panel.style.top = `${Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, top))}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.transform = 'none';
  }
  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || window.matchMedia('(max-width: 600px)').matches) return;
    const bounds = panel.getBoundingClientRect();
    placePanel(bounds.left, bounds.top);
    dragX = event.clientX - bounds.left;
    dragY = event.clientY - bounds.top;
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointermove', (event) => {
    if (!handle.hasPointerCapture(event.pointerId)) return;
    placePanel(event.clientX - dragX, event.clientY - dragY);
  });
  handle.addEventListener('pointerup', (event) => {
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
  });
  handle.addEventListener('keydown', (event) => {
    if (window.matchMedia('(max-width: 600px)').matches) return;
    const movement: Record<string, [number, number]> = {
      ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12],
    };
    const delta = movement[event.key];
    if (!delta) return;
    event.preventDefault();
    const bounds = panel.getBoundingClientRect();
    placePanel(bounds.left + delta[0], bounds.top + delta[1]);
  });
}
