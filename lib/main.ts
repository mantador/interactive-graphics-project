import { mat4 } from "gl-matrix";
import { resizeCanvasToDisplaySize } from "./utils";
import { Constants } from "./constants";
import { Sphere } from "./sphere";
import { initGraphicsProgram } from "./graphics";

function main() {
  const canvas = initCanvas();

  const spheres: Array<Sphere> = [];
  for (let i = 0; i < Constants.nBodies; i++) {
    spheres.push(Sphere.random(10, 10));
  }

  const p = initGraphicsProgram(canvas, spheres, canvas.getContext("webgl")!);
  p.render();
}
function initCanvas() {
  const canvas: HTMLCanvasElement | null = document.querySelector("#canvas");
  if (!canvas) {
    throw new Error("Canvas not found");
  }
  const gl = canvas.getContext("webgl");
  if (!gl) {
    throw new Error("No webgl here");
  }

  resizeCanvasToDisplaySize(canvas);

  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;

  Constants.setCanvasDimensions(cw, ch);
  return canvas;
}

window.addEventListener("load", () => main());
