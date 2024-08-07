import { createCProgram } from "./utils";

const vs = `
attribute vec3 p;
// uniform mat4  mvp;
uniform vec3  center;
uniform float radius;

varying vec3  pos;
varying vec3 normal;
void main()
{
	pos = p*radius + center;
	gl_Position = vec4(p,1);
  // gl_Position = mvp * vec4(pos,1);
	normal = normalize(p);
}
  `;

const fs = `
precision mediump float;
struct Material {
	vec3  k_d;	// diffuse coefficient
	vec3  k_s;	// specular coefficient
	float n;	// specular exponent
};
struct Light {
	vec3 position;
	vec3 intensity;
};

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
gl_FragColor = vec4(0, 0.5, 0, 1.0);}
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

  const program = createCProgram(gl, vs, fs);
  gl.useProgram(program);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // Bind the spheres centers
  const positions = new Float32Array([
    0.1, 0.2, -0.2, -1, 1, 1, -1, -0.5, 0, 0, 0.4, -0.8,
  ]);

  const pBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const pLoc = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(pLoc);
  gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);

  const centerLoc = gl.getUniformLocation(program, "center");
  gl.uniform3fv(centerLoc, [0, 0, 0]);

  const radiusLoc = gl.getUniformLocation(program, "radius");
  gl.uniform1f(radiusLoc, 0.4);

  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  requestAnimationFrame(() => {
    console.log("AAAAAAAAAA");
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  });
  // gl.drawElements(gl.TRIANGLES, positions.length, gl.UNSIGNED_SHORT, 0);
}

window.addEventListener("load", () => main());
