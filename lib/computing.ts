import { Sphere } from "./sphere";
import { checkGlExtensions, createWebglProgram } from "./utils";

const vsPositions = /*glsl*/`
attribute vec4 position;
void main() {
  gl_Position = position;
}
`;

const fsPositions = /*glsl*/`
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

const vsVelocities = /*glsl*/`
attribute vec4 position;
void main() {
  gl_Position = position;
}
`;

const fsVelocities = /*glsl*/`
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

export function initComputingProgram(gl: WebGLRenderingContext, spheres: Array<Sphere>) {

  const textureWidth = spheres.length;
  const textureHeight = 1;

  const ext = gl.getExtension('GMAN_debug_helper');

  const velocityProgram = createWebglProgram(gl, vsVelocities, fsVelocities);
  const positionProgram = createWebglProgram(gl, vsPositions, fsPositions);

  gl.useProgram(positionProgram);
  const positionProgramLocs = {
    positionLoc: gl.getAttribLocation(positionProgram, "position"),
    srcTexLoc: gl.getUniformLocation(positionProgram, "srcTex"),
    srcDimensionsLoc: gl.getUniformLocation(positionProgram, "srcDimensions"),
  }

  // setup a full canvas clip space quad
  const spherePositions = new Float32Array(
    spheres.map((sphere) => sphere.getCoords()).flat(),
  );

  const sphereVelocities = new Float32Array(
    spheres.map((sphere) => sphere.velocity).flat()
  )

  const sphereBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
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

  const inputVelocityTex = createTexture(
    gl,
    sphereVelocities,
    textureWidth,
    textureHeight
  )
  ext.tagObject(inputVelocityTex, 'velocity-texture');

  const outputPositionTex = createTexture(gl, null, textureWidth, textureHeight);
  ext.tagObject(outputPositionTex, 'output-position-texture');

  const outputVelocityTex = createTexture(
    gl,
    sphereVelocities,
    textureWidth,
    textureHeight
  )
  ext.tagObject(outputVelocityTex, 'velocity-texture');


  const inputFb = createFramebuffer(gl, textureWidth, textureHeight, inputPositionTex);
  ext.tagObject(inputFb, 'input-position-framebuf');

  const outputFb = createFramebuffer(gl, textureWidth, textureHeight, outputPositionTex);
  ext.tagObject(outputFb, 'output-position-framebuf');

  const inputVelocityFb = createFramebuffer(gl, textureWidth, textureHeight, inputVelocityTex);
  ext.tagObject(inputVelocityFb, 'input-velocity-framebuf')

  const outputVelocityFb = createFramebuffer(gl, textureWidth, textureHeight, outputVelocityTex);
  ext.tagObject(outputVelocityFb, 'input-velocity-framebuf')

  gl.uniform1i(positionProgramLocs.srcTexLoc, 0);
  gl.uniform2f(positionProgramLocs.srcDimensionsLoc, textureWidth, textureHeight);
  console.log(spherePositions);

  let dataBuffers = [
    {
      position: { frameBuffer: outputFb, texture: inputPositionTex },
      velocity: { frameBuffer: outputVelocityFb, texture: inputVelocityTex }
    },
    {
      position: { frameBuffer: inputFb, texture: outputPositionTex },
      velocity: { frameBuffer: inputVelocityFb, texture: outputVelocityTex }
    },
  ];

  return {
    dataBuffers,
    computePositions: (log: boolean, dataBuffer: any) => {
      gl.useProgram(positionProgram);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, dataBuffer.position.texture);

      gl.bindFramebuffer(gl.FRAMEBUFFER, dataBuffer.position.frameBuffer);
      gl.viewport(0, 0, textureWidth, textureHeight);

      gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
      gl.enableVertexAttribArray(positionProgramLocs.positionLoc);
      gl.vertexAttribPointer(
        positionProgramLocs.positionLoc,
        2, // size (num components)
        gl.FLOAT, // type of data in buffer
        false, // normalize
        0, // stride (0 = auto)
        0, // offset
      );
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      // get the result
      if (log) {
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
