import { initComputingProgram } from "./computing";
import { Constants } from "./constants";
import { initGraphicsProgram as initRenderingProgram } from "./graphics";
import { Sphere } from "./sphere";
import { initCanvas } from "./utils";
import { BoxDrawer } from './box'

function main() {
  const canvas = initCanvas();

  const gl = canvas.getContext("webgl");
  if (!gl) throw new Error("WebGL not enabled!");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const spheres = [];
  for (let i = 0; i < Constants.nBodies; i++) {
    spheres.push(Sphere.random());
  }
  // spheres.push(new Sphere({ center: {x: 500, y: 500, z: 500}, velocity: {x: 3, y: 2, z: 4}, mass: 20 }))
  var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  var projectionMatrix =
    m4.perspective(60 * Math.PI / 180, aspect, 1, 2000);
  var cameraPosition = Constants.cameraPosition;
  var target = Constants.cameraTarget;
  var up = [0, 1, 0];
  var cameraMatrix = m4.lookAt(cameraPosition, target, up, m4.identity());

  // Make a view matrix from the camera matrix.
  var viewMatrix = m4.inverse(cameraMatrix);

  var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
  
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
