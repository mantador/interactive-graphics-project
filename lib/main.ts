import { mat4 } from "gl-matrix";
import { createCProgram, resizeCanvasToDisplaySize } from "./utils";

const vs = `
attribute vec3 p;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uNormalMatrix;

varying vec3  pos;
varying vec3 normal;
uniform float radius;
uniform vec3 center;

void main()
{
	pos = p*radius;
	gl_Position = vec4(p,1);
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
gl_FragColor = vec4(0.4, 0.5, 0.3, 1.0);}
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
  const res = ch / cw;

  const s = new Sphere({
    center: { x: 0.1, y: 0.3, z: 0 },
    radius: 0.1,
    resolution: res,
  });

  //this uses the code for 3d spheres
  console.log(s.verteces);

  let pos = s.verteces;

  const pBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);

  const pLoc = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(pLoc);
  gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);

  const centerLoc = gl.getUniformLocation(program, "center");
  gl.uniform3fv(centerLoc, [0, 0, 0]);

  const radiusLoc = gl.getUniformLocation(program, "radius");
  gl.uniform1f(radiusLoc, 0.4);

  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.drawArrays(gl.TRIANGLES, 0, pos.length / 2);
}

window.addEventListener("load", () => main());

interface Point {
  x: number;
  y: number;
  z: number;
}

class Sphere {
  verteces: Array<number> = [];
  static DIV = 50;
  static PI2 = Math.PI * 2;
  static DRAD = Sphere.PI2 / Sphere.DIV;

  constructor(
    private conf: { center: Point; radius: number; resolution: number },
  ) {
    this.verteces = [];
    this.render();
  }

  render() {
    for (let i = 0; i < Sphere.DIV; i++) {
      this.verteces.push(this.conf.center.x, this.conf.center.y);

      const angle = (i * Sphere.DRAD) % Sphere.PI2;
      const sx1 = Math.sin(angle);
      const cx1 = Math.cos(angle);
      const v1x =
        this.conf.center.x + this.conf.radius * cx1 * this.conf.resolution;
      const v1y = this.conf.center.y + this.conf.radius * sx1;
      this.verteces.push(v1x, v1y);

      const angle2 = (angle + Sphere.DRAD) % Sphere.PI2;
      const sx2 = Math.sin(angle2);
      const cx2 = Math.cos(angle2);
      const v2x =
        this.conf.center.x + this.conf.radius * cx2 * this.conf.resolution;
      const v2y = this.conf.center.y + this.conf.radius * sx2;
      this.verteces.push(v2x, v2y);
    }
  }

  /**
   * @deprecated This method was used for early testing only
   *
   * @param dp the position change
   */
  move(dp: Point) {
    this.conf.center.x += dp.x;
    this.conf.center.y += dp.y;
    this.conf.center.z += dp.z;
    this.render();
  }
}
