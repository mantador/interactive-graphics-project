import { mat4 } from "gl-matrix";
import { createCProgram, resizeCanvasToDisplaySize } from "./utils";
import { Constants } from "./constants";
import { Sphere } from "./sphere";

const vs = `
attribute vec3 p;
varying vec3 normal;

void main()
{
// Squash to clip space TODO use uniforms.
  gl_Position = vec4( (p/1000.0)*2.0 - 1.0 ,1);
	// normal = normalize(p);
}
  `;

const fs = `
precision mediump float;
// uniform samplerCube envMap;
// uniform Light       light;
// uniform vec3        campos;
// uniform Material    mtl;
// varying vec3        pos;
varying vec3        normal;
void main()
{
  // vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
  // float diffuse = max(dot(normal, lightDir), 0.0);
  // vec3 color = vec3(0, 0.5, 0) * (diffuse + 0.2);
  gl_FragColor = vec4(0.4, 0.5, 0.3, 1.0);
}
`;

function main() {
  const canvas: HTMLCanvasElement | null = document.querySelector("#canvas");
  if (!canvas) {
    return;
  }
  const gl = canvas.getContext("webgl");
  if (!gl) {
    console.error("No webgl here");
    return;
  }

  resizeCanvasToDisplaySize(canvas);

  const program = createCProgram(gl, vs, fs);
  gl.useProgram(program);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;

  const constants = Constants.setCanvasDimensions(ch, cw);

  const spheres: Array<Sphere> = [];
  const N = 40;

  for (let i = 0; i < Constants.nBodies; i++) {
    spheres.push(Sphere.random(10, 10));
  }

  const vertexes: Array<number> = [];

  for (let i = 0; i < spheres.length; i++) {
    for (let v = 0; v < spheres[i].verteces.length; v++) {
      vertexes.push(spheres[i].verteces[v]);
    }
  }
  console.log(vertexes.length);

  const pBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexes), gl.STATIC_DRAW);

  const pLoc = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(pLoc);
  gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);

  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.drawArrays(gl.TRIANGLES, 0, vertexes.length / 2);
}

window.addEventListener("load", () => main());
