import { initComputingProgram } from "./computing";
import { Constants } from "./constants";
import { initGraphicsProgram } from "./graphics";
import { Sphere } from "./sphere";
import { checkGlExtensions, createWebglProgram, initCanvas } from "./utils";

function main() {
  const canvas = initCanvas();

  const gl = canvas.getContext("webgl");
  if (!gl) throw new Error("WebGL not enabled!");

  const spheres: Array<Sphere> = [];
  for (let i = 0; i < 6; i++) {
    spheres.push(Sphere.random(10, 10));
  }

  const p = initGraphicsProgram(gl, spheres);
  p.render();

  doGPGPU(spheres);
  const comp = initComputingProgram(spheres);
  comp.compute(true);
}

function doGPGPU(spheres: Sphere[]) {
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

  const dstWidth = spheres.length;
  const dstHeight = 1;

  const canvas = document.createElement("canvas");
  canvas.width = dstWidth;
  canvas.height = dstHeight;

  const gl = canvas.getContext("webgl");
  if (!gl) throw new DOMException();

  checkGlExtensions(canvas);

  const program = createWebglProgram(gl, vs, fs);
  const positionLoc = gl.getAttribLocation(program, "position");
  const srcTexLoc = gl.getUniformLocation(program, "srcTex");
  const srcDimensionsLoc = gl.getUniformLocation(program, "srcDimensions");

  // setup a full canvas clip space quad
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );

  // setup our attributes to tell WebGL how to pull
  // the data from the buffer above to the position attribute
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(
    positionLoc,
    2, // size (num components)
    gl.FLOAT, // type of data in buffer
    false, // normalize
    0, // stride (0 = auto)
    0, // offset
  );

  const positions = new Float32Array(
    spheres.map((sphere) => sphere.getCoords()).flat(),
  );

  const inputTex = createTexture(gl, positions, canvas.width, canvas.height);
  const outputTex = createTexture(gl, null, canvas.width, canvas.height);

  // const inputFb = createFramebuffer(gl, canvas, inputTex);
  const outputFb = createFramebuffer(gl, canvas, outputTex);

  gl.bindFramebuffer(gl.FRAMEBUFFER, outputFb);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, inputTex);

  gl.useProgram(program);
  gl.uniform1i(srcTexLoc, 0);
  gl.uniform2f(srcDimensionsLoc, canvas.width, canvas.height);

  gl.drawArrays(gl.TRIANGLES, 0, canvas.height * canvas.width);

  // get the result
  const results = new Float32Array(canvas.width * canvas.height * 4);
  gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.FLOAT, results);

  // print the results
  console.log(positions);
  console.log(results.length);
  console.log(results);
}

window.addEventListener("load", () => main());

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
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    tex,
    0,
  );
  return fb;
}
