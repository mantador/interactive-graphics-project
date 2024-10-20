import { Sphere } from "./sphere";
import { checkGlExtensions, createWebglProgram } from "./utils";

const vsVelocities = /*glsl*/`
attribute vec4 position;
void main() {
  gl_Position = position;
}
`;

const fsVelocities = /*glsl*/`
precision mediump float;

uniform sampler2D positionTexture;
uniform sampler2D velocityTexture;
uniform vec2 dimensions;

void main() {
  vec2 texcoord = gl_FragCoord.xy / dimensions;
  vec4 positionValue = texture2D(positionTexture, texcoord);
  vec4 velocityValue = texture2D(velocityTexture, texcoord);

  gl_FragColor = positionValue + velocityValue;
}
`;

const vsPositions = /*glsl*/`
attribute vec4 position;
void main() {
  gl_Position = position;
}
`;

const fsPositions = /*glsl*/`
precision mediump float;

uniform sampler2D positionTexture;
uniform sampler2D velocityTexture;
uniform vec2 dimensions;

void main() {
  vec2 texcoord = gl_FragCoord.xy / dimensions;
  vec4 positionValue = texture2D(positionTexture, texcoord);
  vec4 velocityValue = texture2D(velocityTexture, texcoord);
  gl_FragColor = positionValue + velocityValue;
}
`;


export function initComputingProgram(gl: WebGLRenderingContext, spheres: Array<Sphere>) {

  const textureWidth = spheres.length;
  const textureHeight = 1;

  const ext = gl.getExtension('GMAN_debug_helper');

  const velocityProgram = createWebglProgram(gl, vsVelocities, fsVelocities);
  const positionProgram = createWebglProgram(gl, vsPositions, fsPositions);

  gl.useProgram(positionProgram);
  const positionProgramLocs = {
    position: gl.getAttribLocation(positionProgram, "position"),
    positionTexture: gl.getUniformLocation(positionProgram, "positionTexture"),
    velocityTexture: gl.getUniformLocation(positionProgram, "velocityTexture"),
    dimensions: gl.getUniformLocation(positionProgram, "dimensions"),
  }

  const velocityProgramLocs = {
    position: gl.getAttribLocation(velocityProgram, "position"),
    positionTexture: gl.getUniformLocation(velocityProgram, "positionTexture"),
    velocityTexture: gl.getUniformLocation(velocityProgram, "velocityTexture"),
    dimensions: gl.getUniformLocation(velocityProgram, "dimensions"),
  }

  // setup a full canvas clip space quad
  const spherePositions = new Float32Array(
    spheres.map((sphere) => sphere.getCoords()).flat(),
  );

  const sphereVelocities = new Float32Array(
    spheres.map((sphere) => sphere.velocity).flat()
  )

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );

  const inputPositionTex = createTexture(
    gl,
    spherePositions,
    textureWidth,
    textureHeight,
  );
  ext.tagObject(inputPositionTex, 'input-position-texture');

  /*  TEXTURE SETUP  */
  const inputVelocityTex = createTexture(
    gl,
    sphereVelocities,
    textureWidth,
    textureHeight
  )
  ext.tagObject(inputVelocityTex, 'input-velocity-texture');

  const outputPositionTex = createTexture(gl, null, textureWidth, textureHeight);
  ext.tagObject(outputPositionTex, 'output-position-texture');

  const outputVelocityTex = createTexture(
    gl,
    sphereVelocities,
    textureWidth,
    textureHeight
  )
  ext.tagObject(outputVelocityTex, 'output-velocity-texture');


  const inputPositionFb = createFramebuffer(gl, textureWidth, textureHeight, inputPositionTex);
  ext.tagObject(inputPositionFb, 'input-position-framebuf');

  const outputPositionFb = createFramebuffer(gl, textureWidth, textureHeight, outputPositionTex);
  ext.tagObject(outputPositionFb, 'output-position-framebuf');

  const inputVelocityFb = createFramebuffer(gl, textureWidth, textureHeight, inputVelocityTex);
  ext.tagObject(inputVelocityFb, 'input-velocity-framebuf')

  const outputVelocityFb = createFramebuffer(gl, textureWidth, textureHeight, outputVelocityTex);
  ext.tagObject(outputVelocityFb, 'output-velocity-framebuf')


  console.log(spherePositions)

  let dataBuffers = [
    {
      velocity: { 
        frameBuffer: outputVelocityFb,
        inputTexture: inputVelocityTex,
        outputTexture: outputVelocityTex,
      },
      position: { 
        frameBuffer: outputPositionFb,
        inputTexture: inputPositionTex,
        outputTexture: outputPositionTex,
      },
    },
    {
      velocity: { frameBuffer: inputVelocityFb, inputTexture: outputVelocityTex, outputTexture: outputVelocityTex },
      position: { frameBuffer: inputPositionFb, inputTexture: outputPositionTex, outputTexture: outputPositionTex },
    },
  ];

  function computeVelocities(dataBuffer) {
    gl.useProgram(velocityProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dataBuffer.position.inputTexture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, dataBuffer.velocity.inputTexture);

    gl.uniform1i(velocityProgramLocs.positionTexture, 0);
    gl.uniform1i(velocityProgramLocs.velocityTexture, 1);
    gl.uniform2f(velocityProgramLocs.dimensions, textureWidth, textureHeight)

    gl.bindFramebuffer(gl.FRAMEBUFFER, dataBuffer.velocity.frameBuffer);
    gl.viewport(0, 0, textureWidth, textureHeight);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionProgramLocs.position);
    gl.vertexAttribPointer(
      positionProgramLocs.position,
      2, // size (num components)
      gl.FLOAT, // type of data in buffer
      false, // normalize
      0, // stride (0 = auto)
      0, // offset
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    const results = new Float32Array(textureWidth * textureHeight * 4);
    gl.readPixels(
      0,
      0,
      textureWidth,
      textureHeight,
      gl.RGBA,
      gl.FLOAT,
      results,
    );
    // print the results
    console.log(results.length);
    console.log(results);
  }

  function computePositions(dataBuffer) {
    gl.useProgram(positionProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dataBuffer.position.inputTexture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, dataBuffer.velocity.outputTexture);

    gl.uniform1i(positionProgramLocs.positionTexture, 0);
    gl.uniform1i(positionProgramLocs.velocityTexture, 1);
    gl.uniform2f(positionProgramLocs.dimensions, textureWidth, textureHeight);

    gl.bindFramebuffer(gl.FRAMEBUFFER, dataBuffer.position.frameBuffer);
    gl.viewport(0, 0, textureWidth, textureHeight);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionProgramLocs.position);
    gl.vertexAttribPointer(
      positionProgramLocs.position,
      2, // size (num components)
      gl.FLOAT, // type of data in buffer
      false, // normalize
      0, // stride (0 = auto)
      0, // offset
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    // get the result
    const results = new Float32Array(textureWidth * textureHeight * 4);
    gl.readPixels(
      0,
      0,
      textureWidth,
      textureHeight,
      gl.RGBA,
      gl.FLOAT,
      results,
    );
    // print the results
    console.log(results.length);
    console.log(results);

  }

  return {
    dataBuffers,
    computeVelocities: computeVelocities,
    computePositions: (dataBuffer: any) => {
      computePositions(dataBuffer);
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

function createFramebuffer(gl, width, height, tex) {
  const fb = gl.createFramebuffer();
  gl.viewport(0, 0, width, height);
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
