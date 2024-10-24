import { initComputingProgram } from "./computing";
import { initGraphicsProgram as initRenderingProgram } from "./graphics";
import { Sphere } from "./sphere";
import { initCanvas } from "./utils";

function main() {
  const canvas = initCanvas();

  const gl = canvas.getContext("webgl");
  if (!gl) throw new Error("WebGL not enabled!");

  const spheres = [];
  for (let i = 0; i < 10; i++) {
    spheres.push(Sphere.random(10));
  }
  // spheres.push(new Sphere({ center: {x: 500, y: 500, z: 500}, velocity: {x: 3, y: 2, z: 4}, mass: 20 }))

  const counter = new Counter()
  const compute = initComputingProgram(gl, spheres);
  const render = initRenderingProgram(gl, spheres);

  function renderStep() {
    compute.computeVelocities(compute.dataBuffers[counter.count])
    compute.computePositions(compute.dataBuffers[counter.count]);
    render.render(compute.dataBuffers[counter.count])
    counter.inc();
    requestAnimationFrame(renderStep);
  }
  requestAnimationFrame(renderStep);

}

function Counter() {
  this.count = 0;
  this.inc = () => (this.count = (this.count + 1) % 2);
}

window.addEventListener("load", () => main());
