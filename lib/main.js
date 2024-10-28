import { initComputingProgram } from "./computing";
import { Constants } from "./constants";
import { initGraphicsProgram as initRenderingProgram } from "./graphics";
import { Sphere } from "./sphere";
import { initCanvas } from "./utils";
import { Scenarios } from "./scenarios";

function main(spheres) {
  const canvas = initCanvas();

  const gl = canvas.getContext("webgl");
  if (!gl) throw new Error("WebGL not enabled!");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

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

const minRadiusInput = document.getElementById('minRadius');
const maxRadiusInput = document.getElementById('maxRadius');
const nbodies = document.getElementById('number');

document.getElementById('twospheres')
        .addEventListener('click', () => main(Scenarios.twoSpheresFacing()))
document.getElementById('random')
        .addEventListener('click', () => main(Scenarios.random(Number(minRadiusInput.value), Number(maxRadiusInput.value), Number(nbodies.value))))
