import { Constants } from "./constants";
import { initGraphicsProgram } from "./graphics";
import { Sphere } from "./sphere";
import { createWebglProgram, initCanvas } from "./utils";

function main() {
  // const canvas = initCanvas();

  // const spheres: Array<Sphere> = [];
  // for (let i = 0; i < Constants.nBodies; i++) {
  //   spheres.push(Sphere.random(10, 10));
  // }

  // const p = initGraphicsProgram(canvas.getContext("webgl")!, spheres);
  // p.render();

  doGPGPU();
}

function doGPGPU() {
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

  const dstWidth = 6;
  const dstHeight = 1;

  // make a 3x2 canvas for 6 results
  const canvas = document.createElement('canvas');
  canvas.width = dstWidth;
  canvas.height = dstHeight;

  const gl = canvas.getContext('webgl');
  if (!gl) throw new DOMException()
  // check we can use floating point textures
  const ext1 = gl.getExtension('OES_texture_float');
  if (!ext1) {
    alert('Need OES_texture_float');
    return;
  }
  // check we can render to floating point textures
  const ext2 = gl.getExtension('WEBGL_color_buffer_float');
  if (!ext2) {
    alert('Need WEBGL_color_buffer_float');
    return;
  }
  // check we can use textures in a vertex shader
  if (gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) < 1) {
    alert('Can not use textures in vertex shaders');
    return;
  }

  const program = createWebglProgram(gl, vs, fs);
  const positionLoc = gl.getAttribLocation(program, 'position');
  const srcTexLoc = gl.getUniformLocation(program, 'srcTex');
  const srcDimensionsLoc = gl.getUniformLocation(program, 'srcDimensions');

  // setup a full canvas clip space quad
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
    1, -1,
    -1, 1,
    -1, 1,
    1, -1,
    1, 1,
  ]), gl.STATIC_DRAW);

  // setup our attributes to tell WebGL how to pull
  // the data from the buffer above to the position attribute
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(
    positionLoc,
    2,         // size (num components)
    gl.FLOAT,  // type of data in buffer
    false,     // normalize
    0,         // stride (0 = auto)
    0,         // offset
  );
  

  let res: Array<number> = []
  console.log(canvas.width*canvas.height)
  for (let i = 0; i < canvas.width*canvas.height*4; i++)
    res.push(Math.random()*10)
  const positions = new Float32Array(res);
  

  const inputTex = createTexture(gl, positions, canvas.width, canvas.height);
  const outputTex = createTexture(gl, null, canvas.width, canvas.height);

  // const inputFb = createFramebuffer(gl, canvas, inputTex);
  const outputFb = createFramebuffer(gl, canvas, outputTex);
  
  gl.bindFramebuffer(gl.FRAMEBUFFER, outputFb);
  
  gl.activeTexture(gl.TEXTURE0)
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
  console.log(results.length)
  console.log(results)

}


window.addEventListener("load", () => main());


function createTexture(gl, data, width, height) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,        // mip level
    gl.RGBA,  // internal format
    width,
    height,
    0,        // border
    gl.RGBA,  // format
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
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return fb;
}