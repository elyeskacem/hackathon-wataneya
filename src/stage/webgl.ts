/** True when this browser can create a WebGL context at all (checked once, before mounting the canvas). */
export const webglAvailable = (() => {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
})();
