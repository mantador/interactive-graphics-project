import { Constants } from "./constants";
import { Sphere } from "./sphere";
import { checkGlExtensions, createWebglProgram } from "./utils";

const vsVelocities = /*glsl*/`
attribute vec4 position;
void main() {
  gl_Position = position;
}
`;

// ===============================

const fsVelocities = /*glsl*/`
precision mediump float;

uniform sampler2D positionTexture;
uniform sampler2D velocityTexture;
uniform vec2 dimensions;
uniform float DT;
uniform float G;

const float MAX_ITER=1000.0;

vec2 indexToTextureIndex(vec2 dimensions, float index) {
  float y = floor(index / dimensions.x);
  float x = mod(index, dimensions.x);
  return (vec2(x, y) + 0.5) / dimensions;
}

vec3 reflectVelocity(vec3 vel, vec3 normal) {
  float dotp = dot(vel.xyz, normal);
  float norm = dot(normal, normal);
  return vel.xyz - (2.0 * (dotp/norm) )*normal;
}

vec3 checkAndAdjustWallCollisions(vec4 pos, vec3 vel) {
  if (pos.x >= 1000.0) {
    vel = reflectVelocity(vel, vec3(-1, 0, 0));
  }

  if (pos.x <= 0.0) {
    vel = reflectVelocity(vel, vec3(1, 0, 0));
  }

  if (pos.y >= 1000.0) { // Collision on upper plane
    vel = reflectVelocity(vel, vec3(0, -1, 0));
  }
  if (pos.y <= 0.0) {
    vel = reflectVelocity(vel, vec3(0, 1, 0));
  }

  if (pos.z >= 1000.0) {
    vel = reflectVelocity(vel, vec3(0, 0, -1));
  }

  if (pos.z <= 0.0) {
    vel = reflectVelocity(vel, vec3(0, 0, 1));
  }

  return vel;
}

vec3 calculateCollisionVelocity(vec4 p1, vec4 p2, vec3 v1, vec3 v2) {
  // p1.w and p2.w represent both mass and radius
  // For proper physics, mass should scale with volume (r³)
  float m1 = p1.w * p1.w * p1.w;  // Mass of first sphere
  float m2 = p2.w * p2.w * p2.w;  // Mass of second sphere
  
  // Calculate the collision normal
  vec3 normal = normalize(p1.xyz - p2.xyz);
  
  // Calculate velocities along the normal
  float v1n = dot(v1, normal);
  float v2n = dot(v2, normal);
  
  // If spheres are moving apart, no collision needed
  if (v1n - v2n > 0.0) {
      return v1;
  }
  
  // Calculate new velocity along normal using conservation of momentum
  // and energy for a 1D collision
  float newV1n = (m1 * v1n + m2 * v2n - m2 * (v1n - v2n)) / (m1 + m2);
  
  // Calculate the change in normal velocity
  float deltaV1n = newV1n - v1n;
  
  // Apply the velocity change along the normal direction
  // Keep the tangential velocity component unchanged
  return v1 + deltaV1n * normal;
}


vec3 checkAndAdjustSphereCollisions(vec4 p1, vec3 v1) {
  vec3 newVel = v1;
  
  for(float i = 0.0; i < MAX_ITER; i++) {
      if (float(i) == floor(gl_FragCoord.x)) { continue; }
      if (float(i) == dimensions.x) { break; }
      
      vec2 index = indexToTextureIndex(dimensions, float(i));
      vec4 p2 = texture2D(positionTexture, index);
      vec4 v2 = texture2D(velocityTexture, index);
      
      float distance = length(p1.xyz - p2.xyz);
      float minDist = p1.w + p2.w;  // Sum of radii
      
      if (distance < minDist) {
          // Collision detected
          newVel = calculateCollisionVelocity(p1, p2, newVel, v2.xyz);
          
          // Add separation vector to prevent spheres from sticking
          vec3 separationNormal = normalize(p1.xyz - p2.xyz);
          float overlap = minDist - distance;
          newVel += separationNormal * overlap * 0.1; // Scale factor to prevent too strong separation
      }
  }
  
  return newVel;
}


void main() {
  vec2 texcoord = gl_FragCoord.xy / dimensions;
  vec3 force = vec3(0, 0, 0);
  vec4 p1 = texture2D(positionTexture, texcoord);
  vec4 v = texture2D(velocityTexture, texcoord);  
  
  vec3 totalForce = vec3(0, 0, 0);
  float m1 = pow(p1.w, 3.0);
  
  for(float i = 0.0; i < MAX_ITER; i++) {
    if (float(i) == floor(gl_FragCoord.x)) { continue; }
    if (float(i) == dimensions.x) { break; }
    
    vec2 index = indexToTextureIndex(dimensions, float(i));
    
    vec4 p2 = texture2D(positionTexture, index);
    float m2 = pow(p2.w, 3.0);
    vec3 diff = p2.xyz - p1.xyz;
    float distanc = pow(length(diff), 3.0);
    
    vec3 force = G*( (m1 * m2) / (distanc) )*diff;
    totalForce += force;
  }
  
  vec3 acc = totalForce/m1;
  
  vec3 deltaVel = acc*DT; // delta T
  vec3 vel = v.xyz + deltaVel;
  
  vec3 newVel;
  newVel = checkAndAdjustSphereCollisions(p1, vel);
  newVel = checkAndAdjustWallCollisions(p1, newVel);
  
  gl_FragColor = vec4(newVel, 0);
}
`;

// ===============================

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
uniform float DT;

void main() {
  vec2 texcoord = gl_FragCoord.xy / dimensions;
  vec4 positionValue = texture2D(positionTexture, texcoord);
  vec4 velocityValue = texture2D(velocityTexture, texcoord);
  gl_FragColor = positionValue + velocityValue*DT; // deltaT
}
`;


export function initComputingProgram(gl, spheres) {

  const textureWidth = spheres.length;
  const textureHeight = 1;

  const ext = gl.getExtension('GMAN_debug_helper');

  const velocityProgram = createWebglProgram(gl, vsVelocities, fsVelocities);
  ext.tagObject(velocityProgram, 'velocity-computation-program');
  const positionProgram = createWebglProgram(gl, vsPositions, fsPositions);
  ext.tagObject(positionProgram, 'position-computation-program');

  gl.useProgram(positionProgram);
  const positionProgramLocs = {
    position: gl.getAttribLocation(positionProgram, "position"),
    positionTexture: gl.getUniformLocation(positionProgram, "positionTexture"),
    velocityTexture: gl.getUniformLocation(positionProgram, "velocityTexture"),
    dimensions: gl.getUniformLocation(positionProgram, "dimensions"),
    dt: gl.getUniformLocation(positionProgram, "DT"),
  }

  const velocityProgramLocs = {
    position: gl.getAttribLocation(velocityProgram, "position"),
    positionTexture: gl.getUniformLocation(velocityProgram, "positionTexture"),
    velocityTexture: gl.getUniformLocation(velocityProgram, "velocityTexture"),
    dimensions: gl.getUniformLocation(velocityProgram, "dimensions"),
    dt: gl.getUniformLocation(velocityProgram, "DT"),
    G: gl.getUniformLocation(velocityProgram, "G"),
  }

  // setup a full canvas clip space quad
  const spherePositions = new Float32Array(
    spheres.map((sphere) => sphere.center).flat(),
  );

  const sphereVelocities = new Float32Array(
    spheres.map((sphere) => sphere.velocity).flat()
  )

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );

  const inputPositionTex = createTexture(
    gl,
    spherePositions,
    textureWidth,
    textureHeight,
  );
  ext.tagObject(inputPositionTex, 'input-position-texture');
  inputPositionTex.id = "input-position-tex";

  const inputVelocityTex = createTexture(
    gl,
    sphereVelocities,
    textureWidth,
    textureHeight
  )
  ext.tagObject(inputVelocityTex, 'input-velocity-texture');
  inputVelocityTex.id = "input-velocity-tex";


  const outputPositionTex = createTexture(gl, null, textureWidth, textureHeight);
  ext.tagObject(outputPositionTex, 'output-position-texture');
  outputPositionTex.id = "output-position-tex";

  const outputVelocityTex = createTexture(
    gl,
    sphereVelocities,
    textureWidth,
    textureHeight
  )
  ext.tagObject(outputVelocityTex, 'output-velocity-texture');
  outputVelocityTex.id = "output-velocity-tex";

  const inputPositionFb = createFramebuffer(gl, textureWidth, textureHeight, inputPositionTex);
  ext.tagObject(inputPositionFb, 'input-position-framebuf');

  const outputPositionFb = createFramebuffer(gl, textureWidth, textureHeight, outputPositionTex);
  ext.tagObject(outputPositionFb, 'output-position-framebuf');
  outputPositionFb.texture = outputPositionTex;

  const inputVelocityFb = createFramebuffer(gl, textureWidth, textureHeight, inputVelocityTex);
  ext.tagObject(inputVelocityFb, 'input-velocity-framebuf')

  const outputVelocityFb = createFramebuffer(gl, textureWidth, textureHeight, outputVelocityTex);
  ext.tagObject(outputVelocityFb, 'output-velocity-framebuf')


  console.log(spherePositions)

  let dataBuffers = [
    {
      velocity: { frameBuffer: outputVelocityFb, inputTexture: inputVelocityTex, outputTexture: outputVelocityTex },
      position: { frameBuffer: outputPositionFb, inputTexture: inputPositionTex, outputTexture: outputPositionTex },
    },
    {
      velocity: { frameBuffer: inputVelocityFb, inputTexture: outputVelocityTex, outputTexture: inputVelocityTex },
      position: { frameBuffer: inputPositionFb, inputTexture: outputPositionTex, outputTexture: inputPositionTex },
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
    gl.uniform1f(velocityProgramLocs.dt, Constants.dt);
    gl.uniform1f(velocityProgramLocs.G, Constants.G);

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

    if (Constants.log) {
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
      console.log('VELOCITIES');
      console.log(results);
    }
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
    gl.uniform1f(positionProgramLocs.dt, Constants.dt);

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

    if (Constants.log) {
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
      console.log("POSITIONS")
      console.log(results);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  }

  return {
    dataBuffers,
    computeVelocities,
    computePositions,
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
