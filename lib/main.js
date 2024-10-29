import { initComputingProgram } from "./computing";
import { Constants } from "./constants";
import { initGraphicsProgram as initRenderingProgram } from "./graphics";
import { Sphere } from "./sphere";
import { initCanvas } from "./utils";
import { Scenarios } from "./scenarios";
import { BoxDrawer } from "./box";
import { MatrixStorage } from "./utils"

function main(spheres) {
  const canvas = initCanvas();

  const gl = canvas.getContext("webgl");
  if (!gl) throw new Error("WebGL not enabled!");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const counter = new Counter()
  const matrixStorage = MatrixStorage(gl);
  const compute = initComputingProgram(gl, spheres);
  const render = initRenderingProgram(gl, spheres);
  const box = new BoxDrawer(gl)

  var rotx = 0, roty = 0;

  function renderStep() {
    compute.computeVelocities(compute.dataBuffers[counter.count])
    compute.computePositions(compute.dataBuffers[counter.count]);
    
    const matrix = matrixStorage.getMatrix(rotx, roty);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    box.draw(matrix)
    render.render(compute.dataBuffers[counter.count], matrix)
    counter.inc();
    requestAnimationFrame(renderStep);
  }
  requestAnimationFrame(renderStep);


  canvas.onmousedown = function (event) {
    var cx = event.clientX;
    var cy = event.clientY;
    console.log(cx);

    canvas.onmousemove = function (event) {
      roty += (cx - event.clientX) / canvas.width * 5;
      rotx += (cy - event.clientY) / canvas.height * 5;
      cx = event.clientX;
      cy = event.clientY;
    }
  }
  canvas.onmouseup = canvas.onmouseleave = function () {
    canvas.onmousemove = null;
  }
}

function Counter() {
  this.count = 0;
  this.inc = () => (this.count = (this.count + 1) % 2);
}



const minRadiusInput = document.getElementById('minRadius');
const maxRadiusInput = document.getElementById('maxRadius');
const nbodies = document.getElementById('number');

document.getElementById('random')
  .addEventListener('click', () => main(Scenarios.random(Number(minRadiusInput.value), Number(maxRadiusInput.value), Number(nbodies.value))))
window.addEventListener('load', () => main(Scenarios.random(Number(minRadiusInput.value), Number(maxRadiusInput.value), Number(nbodies.value))))