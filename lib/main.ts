import { initComputingProgram } from "./computing";
import { Constants } from "./constants";
import { initGraphicsProgram } from "./graphics";
import { Sphere } from "./sphere";
import { checkGlExtensions, createWebglProgram, initCanvas } from "./utils";

function main() {
  const canvas = initCanvas();

  const gl = canvas.getContext("webgl");
  if (!gl) throw new Error("WebGL not enabled!");

  const spheres: Array<Sphere> = [];
  for (let i = 0; i < 3; i++) {
    spheres.push(Sphere.random(10, 10));
  }

  const p = initGraphicsProgram(gl, spheres);
  p.render();
  const comp = initComputingProgram(spheres);
  let res = comp.compute(true, comp.objects);

  res = comp.compute(true, res);
  res = comp.compute(true, res);
  res = comp.compute(true, res);
  res = comp.compute(true, res);
  res = comp.compute(true, res);

}

window.addEventListener("load", () => main());
