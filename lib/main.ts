import { initComputingProgram } from "./computing";
import { initGraphicsProgram } from "./graphics";
import { Sphere } from "./sphere";
import { initCanvas } from "./utils";

function main() {
  const canvas = initCanvas();

  const gl = canvas.getContext("webgl");
  if (!gl) throw new Error("WebGL not enabled!");

  const spheres: Array<Sphere> = [];
  // for (let i = 0; i < 1; i++) {
    for (let i = 0; i < 50; i++) {
    spheres.push(Sphere.random(10));
  }
  
  const counter = new Counter()
  const comp = initComputingProgram(gl, spheres);
  const p = initGraphicsProgram(gl, spheres);
  
  comp.computePositions(true, comp.dataBuffers[counter.count]);
  // p.render(comp.dataBuffers[counter.count]);
  // counter.inc()
}

function Counter() {
  this.count = 0;
  this.inc = () => (this.count = (this.count + 1) % 2);
}

window.addEventListener("load", () => main());
