import { Sphere } from "./sphere";
import { createWebglProgram } from "./utils";

export function initGraphicsProgram(
  gl: WebGLRenderingContext,
  spheres: Array<Sphere>,
) {
  const vs = `
attribute vec3 p;
varying vec3 normal;

void main()
{
  gl_Position = vec4( (p/1000.0)*2.0 - 1.0 ,1);
}
  `;

  const fs = `
precision mediump float;

varying vec3        normal;
void main()
{
  gl_FragColor = vec4(0.4, 0.5, 0.3, 1.0);
}
`;
  const program = createWebglProgram(gl, vs, fs);
  gl.useProgram(program);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  return {
    gl,
    program,
    spheres,
    render: () => {
      const vertexes: Array<number> = [];
      for (let i = 0; i < spheres.length; i++) {
        for (let v = 0; v < spheres[i].verteces.length; v++) {
          vertexes.push(spheres[i].verteces[v]);
        }
      }

      const pBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(vertexes),
        gl.STATIC_DRAW,
      );

      const pLoc = gl.getAttribLocation(program, "p");
      gl.enableVertexAttribArray(pLoc);
      gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);

      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.drawArrays(gl.TRIANGLES, 0, vertexes.length / 2);
    },
  };
}
