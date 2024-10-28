import { initComputingProgram } from "./computing";
import { Constants } from "./constants";
import { initGraphicsProgram as initRenderingProgram } from "./graphics";
import { Sphere } from "./sphere";
import { initCanvas } from "./utils";
import { Scenarios } from "./scenarios";
import { BoxDrawer } from "./box";

function main(spheres) {
  const canvas = initCanvas();

  const gl = canvas.getContext("webgl");
  if (!gl) throw new Error("WebGL not enabled!");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  var projectionMatrix =
    m4.perspective(60 * Math.PI / 180, aspect, 1, 3000);
  var cameraPosition = Constants.cameraPosition;
  var target = Constants.cameraTarget;
  var up = [0, 1, 0];
  var cameraMatrix = m4.lookAt(cameraPosition, target, up, m4.identity());
  var viewMatrix = m4.inverse(cameraMatrix);
  var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

  const counter = new Counter()
  const compute = initComputingProgram(gl, spheres);
  const render = initRenderingProgram(gl, spheres, viewProjectionMatrix);
  const box = new BoxDrawer(gl)
  
  function renderStep() {
    compute.computeVelocities(compute.dataBuffers[counter.count])
    compute.computePositions(compute.dataBuffers[counter.count]);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    box.draw(viewProjectionMatrix)
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
window.addEventListener('load', () => main(Scenarios.random(Number(minRadiusInput.value), Number(maxRadiusInput.value), Number(nbodies.value))))