import { Sphere } from "./sphere";
import { createWebglProgram } from "./utils";

export function initGraphicsProgram(
  gl,
  spheres,
) {
  const vs = /*glsl*/`
  const mediump float;
  attribute float index;
  varying vec3 normal;
  uniform sampler2D positionTexture;
  uniform vec2 dimensions;
  uniform mat4 matrix;

  void main() {
    // pull the position from the texture
    // vec4 position = getValueFrom2DTextureAs1DArray(positionTexture, dimensions, index);
    vec4 position = texture2D(positionTexture, (vec2(index, 1.0)+0.5)/dimensions);
    // do the common matrix math
    gl_Position = matrix*vec4(position.xyz, 1.0);
    gl_PointSize = position.w;
  }
  `;

  const fs = /*glsl*/`
  precision mediump float;
  void main() {
      vec2 centerToPixel = 2.0 * gl_PointCoord - 1.0;
      if (dot(centerToPixel, centerToPixel) > 1.0) {
          discard;
      }
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);  // Red color
  }
  `;

  const program = createWebglProgram(gl, vs, fs);
  gl.useProgram(program);

  const indexLoc = gl.getAttribLocation(program, "index");
  const textureLoc = gl.getUniformLocation(program, "positionTexture");
  const dimensionsLoc = gl.getUniformLocation(program, "dimensions");
  const matrixLoc = gl.getUniformLocation(program, "matrix");
  gl.uniform1i(textureLoc, 0);
  gl.uniform2f(dimensionsLoc, spheres.length, 1);

  if (gl.canvas instanceof OffscreenCanvas) {
    throw new Error("Nope...")
  }

  var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  var projectionMatrix =
    m4.perspective(30 * Math.PI / 180, aspect, 1, 2000);
  var cameraPosition = [0, 0, 500];
  var target = [500, 500, 0];
  var up = [0, 1, 0];
  var cameraMatrix = m4.lookAt(cameraPosition, target, up, m4.identity());

  // Make a view matrix from the camera matrix.
  var viewMatrix = m4.inverse(cameraMatrix);

  var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

  gl.uniformMatrix4fv(
    matrixLoc, false,
    viewProjectionMatrix
    // m4.orthographic(0, gl.canvas.width, 0, gl.canvas.height, -1, 1)
  )
  const pBuffer = gl.createBuffer();

  let ids = new Array(spheres.length).fill(0).map((_, i) => i);

  return {
    render: (dataBuffer: any) => {
      gl.useProgram(program);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.CULL_FACE);
      gl.enable(gl.DEPTH_TEST);

      gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(ids),
        gl.STATIC_DRAW,
      );
      gl.enableVertexAttribArray(indexLoc);
      gl.vertexAttribPointer(indexLoc, 1, gl.FLOAT, false, 0, 0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, dataBuffer.position.texture);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);


      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.drawArrays(gl.POINTS, 0, ids.length);
    },
  };
}
