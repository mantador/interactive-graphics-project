import { initComputingProgram } from "./computing";
import { initGraphicsProgram } from "./graphics";
import { Sphere } from "./sphere";
import { initCanvas } from "./utils";

function main() {
  const canvas = initCanvas();

  const gl = canvas.getContext("webgl");
  if (!gl) throw new Error("WebGL not enabled!");

  const spheres: Array<Sphere> = [];
  for (let i = 0; i < 3; i++) {
    spheres.push(Sphere.random(10, 10));
  }

  const p = initGraphicsProgram(gl, spheres);
  const comp = initComputingProgram(spheres);
  
  const counter = new Counter()
  
  comp.compute(true, comp.objects[counter.count]);
  counter.inc()
  comp.compute(true, comp.objects[counter.count]);
  counter.inc()
  comp.compute(true, comp.objects[counter.count]);
  counter.inc()
  comp.compute(true, comp.objects[counter.count]);
  counter.inc()
  comp.compute(true, comp.objects[counter.count]);
  counter.inc()
  comp.compute(true, comp.objects[counter.count]);
  counter.inc()
  
  p.render();
}

function Counter() {
  this.count = 0;
  this.inc = () => (this.count = (this.count + 1) % 2);
}

window.addEventListener("load", () => main());
