import { Sphere } from "./sphere";
import { checkGlExtensions, createWebglProgram } from "./utils";

const vs = `
attribute vec4 position;
void main() {
  gl_Position = position;
}
`;

const fs = `
precision mediump float;

uniform sampler2D srcTex;
uniform vec2 srcDimensions;

void main() {
  vec2 texcoord = gl_FragCoord.xy / srcDimensions;
  vec4 value = texture2D(srcTex, texcoord);
  //value.x = 20.0;
  gl_FragColor = value * 2.0;
}
`;

export function initComputingProgram(spheres: Array<Sphere>) {
  const N = spheres.length;
  const height = 1;
  
  const canvas = document.createElement("canvas");
  canvas.width = N;
  canvas.height = height;
  
  const gl = canvas.getContext("webgl");
  if (!gl) throw new DOMException();
  const ext = gl.getExtension('GMAN_debug_helper');

  checkGlExtensions(canvas);

  const program = createWebglProgram(gl, vs, fs);
  const positionLoc = gl.getAttribLocation(program, "position");
  const srcTexLoc = gl.getUniformLocation(program, "srcTex");
  const srcDimensionsLoc = gl.getUniformLocation(program, "srcDimensions");

  gl.useProgram(program);

  // setup a full canvas clip space quad
  const spherePositions = new Float32Array(
    spheres.map((sphere) => sphere.getCoords()).flat(),
  );
  const sphereBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );

  const inputTex = createTexture(
    gl,
    spherePositions,
    canvas.width,
    canvas.height,
  );

  ext.tagObject(inputTex, 'input-texture');
  
  const outputTex = createTexture(gl, null, canvas.width, canvas.height);
  ext.tagObject(outputTex, 'output-texture');
  
  const inputFb = createFramebuffer(gl, canvas, inputTex);
  ext.tagObject(inputFb, 'input-framebuf');
  const outputFb = createFramebuffer(gl, canvas, outputTex);
  ext.tagObject(outputFb, 'output-framebuf');

  gl.uniform1i(srcTexLoc, 0);
  gl.uniform2f(srcDimensionsLoc, canvas.width, canvas.height);
  console.log(spherePositions);

  let count = 0;

  function incCount() { count = (count+1)%2; }

  return {
    compute: (log: boolean) => {
      let frameBuffer;
      gl.activeTexture(gl.TEXTURE0);
      if (count) {
        gl.bindTexture(gl.TEXTURE_2D, outputTex);
        frameBuffer = inputFb;
      } else {
        gl.bindTexture(gl.TEXTURE_2D, inputTex);
        frameBuffer = outputFb;
      }
      incCount();
      gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      // gl.clearColor(0, 0, 0, 0);
      // gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
      gl.enableVertexAttribArray(positionLoc);
      gl.vertexAttribPointer(
        positionLoc,
        2, // size (num components)
        gl.FLOAT, // type of data in buffer
        false, // normalize
        0, // stride (0 = auto)
        0, // offset
      );
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      // get the result
      if (log) {
        const results = new Float32Array(canvas.width * canvas.height * 4);
        gl.readPixels(
          0,
          0,
          canvas.width,
          canvas.height,
          gl.RGBA,
          gl.FLOAT,
          results,
        );
        // print the results
        console.log(results.length);
        console.log(results);
      }
    },
  };
}

function createTexture(gl, data, width, height) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0, // mip level
    gl.RGBA, // internal format
    width,
    height,
    0, // border
    gl.RGBA, // format
    gl.FLOAT, // type
    data,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return tex;
}

function createFramebuffer(gl, canvas, tex) {
  const fb = gl.createFramebuffer();
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    tex,
    0,
  );
  return fb;
}
