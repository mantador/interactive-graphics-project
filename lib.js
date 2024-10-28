(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // lib/constants.js
  var Constants = class {
  };
  __publicField(Constants, "nBodies", 50);
  __publicField(Constants, "dt", 0.1);
  // approx of 1/60
  __publicField(Constants, "G", 0.05);
  __publicField(Constants, "log", false);
  __publicField(Constants, "defaultMinRadius", 10);
  __publicField(Constants, "defaultMaxRadius", 30);
  __publicField(Constants, "lightPosition", [300, 200, 1500]);
  __publicField(Constants, "cameraPosition", [500, 500, 2e3]);
  __publicField(Constants, "cameraTarget", [500, 500, 500]);

  // lib/sphere.js
  var _Sphere = class _Sphere {
    constructor(conf) {
      __publicField(this, "verteces", []);
      this.verteces = [];
      this._center = conf.center;
      this.mass = conf.mass;
      this._velocity = conf.velocity;
    }
    get velocity() {
      return [this._velocity.x, this._velocity.y, this._velocity.z, 0];
    }
    get center() {
      return [this._center.x, this._center.y, this._center.z, this.mass];
    }
    static randomPosition(r) {
      return Math.floor(Math.random() * (1e3 - 2 * r)) + r;
    }
    static random(minRadius = 10, maxRadius = 40) {
      const r = Math.floor(Math.random() * (maxRadius - minRadius)) + minRadius;
      let x = _Sphere.randomPosition(r);
      let y = _Sphere.randomPosition(r);
      let z = _Sphere.randomPosition(r);
      return new _Sphere({
        center: {
          x,
          y,
          z
        },
        velocity: {
          x: 0,
          y: 0,
          z: 0
        },
        mass: r
      });
    }
  };
  __publicField(_Sphere, "DIV", 50);
  __publicField(_Sphere, "PI2", Math.PI * 2);
  __publicField(_Sphere, "DRAD", _Sphere.PI2 / _Sphere.DIV);
  var Sphere = _Sphere;

  // lib/utils.js
  function createCShader(gl, source, type) {
    var shader = gl.createShader(type);
    if (shader == null) throw new DOMException("Compiled shader is null");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
      return shader;
    }
    console.error(gl.getShaderInfoLog(shader));
    throw new Error(gl.getShaderInfoLog(shader) || "No message available");
  }
  function createWebglProgram(gl, sourceVS, sourceFS) {
    const vertexShader = createCShader(gl, sourceVS, gl.VERTEX_SHADER);
    const fragmentShader = createCShader(gl, sourceFS, gl.FRAGMENT_SHADER);
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
      return program;
    }
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
  }
  function resizeCanvasToDisplaySize(canvas) {
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    const needResize = canvas.width !== displayWidth || canvas.height !== displayHeight;
    if (needResize) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }
    return needResize;
  }
  function checkGlExtensions(canvas) {
    const gl = canvas.getContext("webgl");
    if (!gl) {
      throw new Error("No webgl here");
    }
    const ext1 = gl.getExtension("OES_texture_float");
    if (!ext1) {
      throw "Need OES_texture_float";
    }
    const ext2 = gl.getExtension("WEBGL_color_buffer_float");
    if (!ext2) {
      throw "Need WEBGL_color_buffer_float";
    }
    if (gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) < 1) {
      throw "Can not use textures in vertex shaders";
    }
    const ext = gl.getExtension("GMAN_debug_helper");
  }
  function initCanvas() {
    const canvas = document.querySelector("#canvas");
    if (!canvas) {
      throw new Error("Canvas not found");
    }
    checkGlExtensions(canvas);
    resizeCanvasToDisplaySize(canvas);
    return canvas;
  }

  // lib/computing.js
  var vsVelocities = (
    /*glsl*/
    "\nattribute vec4 position;\nvoid main() {\n  gl_Position = position;\n}\n"
  );
  var fsVelocities = (
    /*glsl*/
    "\nprecision mediump float;\n\nuniform sampler2D positionTexture;\nuniform sampler2D velocityTexture;\nuniform vec2 dimensions;\nuniform float DT;\nuniform float G;\n\nconst float MAX_ITER=1000.0;\n\nvec2 indexToTextureIndex(vec2 dimensions, float index) {\n  float y = floor(index / dimensions.x);\n  float x = mod(index, dimensions.x);\n  return (vec2(x, y) + 0.5) / dimensions;\n}\n\nvec3 reflectVelocity(vec3 vel, vec3 normal) {\n  float dotp = dot(vel.xyz, normal);\n  float norm = dot(normal, normal);\n  return vel.xyz - (2.0 * (dotp/norm) )*normal;\n}\n\nvec3 checkAndAdjustWallCollisions(vec4 pos, vec3 vel) {\n  if (pos.x >= 1000.0) {\n    vel = reflectVelocity(vel, vec3(-1, 0, 0));\n  }\n\n  if (pos.x <= 0.0) {\n    vel = reflectVelocity(vel, vec3(1, 0, 0));\n  }\n\n  if (pos.y >= 1000.0) { // Collision on upper plane\n    vel = reflectVelocity(vel, vec3(0, -1, 0));\n  }\n  if (pos.y <= 0.0) {\n    vel = reflectVelocity(vel, vec3(0, 1, 0));\n  }\n\n  if (pos.z >= 1000.0) {\n    vel = reflectVelocity(vel, vec3(0, 0, -1));\n  }\n\n  if (pos.z <= 0.0) {\n    vel = reflectVelocity(vel, vec3(0, 0, 1));\n  }\n\n  return vel;\n}\n\nvec3 calculateCollisionVelocity(vec4 p1, vec4 p2, vec3 v1, vec3 v2) {\n  // p1.w and p2.w represent both mass and radius\n  // For proper physics, mass should scale with volume (r\xB3)\n  float m1 = p1.w * p1.w * p1.w;  // Mass of first sphere\n  float m2 = p2.w * p2.w * p2.w;  // Mass of second sphere\n  \n  // Calculate the collision normal\n  vec3 normal = normalize(p1.xyz - p2.xyz);\n  \n  // Calculate velocities along the normal\n  float v1n = dot(v1, normal);\n  float v2n = dot(v2, normal);\n  \n  // If spheres are moving apart, no collision needed\n  if (v1n - v2n > 0.0) {\n      return v1;\n  }\n  \n  // Calculate new velocity along normal using conservation of momentum\n  // and energy for a 1D collision\n  float newV1n = (m1 * v1n + m2 * v2n - m2 * (v1n - v2n)) / (m1 + m2);\n  \n  // Calculate the change in normal velocity\n  float deltaV1n = newV1n - v1n;\n  \n  // Apply the velocity change along the normal direction\n  // Keep the tangential velocity component unchanged\n  return v1 + deltaV1n * normal;\n}\n\n\nvec3 checkAndAdjustSphereCollisions(vec4 p1, vec3 v1) {\n  vec3 newVel = v1;\n  \n  for(float i = 0.0; i < MAX_ITER; i++) {\n      if (float(i) == floor(gl_FragCoord.x)) { continue; }\n      if (float(i) == dimensions.x) { break; }\n      \n      vec2 index = indexToTextureIndex(dimensions, float(i));\n      vec4 p2 = texture2D(positionTexture, index);\n      vec4 v2 = texture2D(velocityTexture, index);\n      \n      float distance = length(p1.xyz - p2.xyz);\n      float minDist = p1.w + p2.w;  // Sum of radii\n      \n      if (distance < minDist) {\n          // Collision detected\n          newVel = calculateCollisionVelocity(p1, p2, newVel, v2.xyz);\n          \n          // Add separation vector to prevent spheres from sticking\n          vec3 separationNormal = normalize(p1.xyz - p2.xyz);\n          float overlap = minDist - distance;\n          newVel += separationNormal * overlap * 0.1; // Scale factor to prevent too strong separation\n      }\n  }\n  \n  return newVel;\n}\n\n\nvoid main() {\n  vec2 texcoord = gl_FragCoord.xy / dimensions;\n  vec3 force = vec3(0, 0, 0);\n  vec4 p1 = texture2D(positionTexture, texcoord);\n  vec4 v = texture2D(velocityTexture, texcoord);  \n  \n  vec3 totalForce = vec3(0, 0, 0);\n  float m1 = pow(p1.w, 3.0);\n  \n  for(float i = 0.0; i < MAX_ITER; i++) {\n    if (float(i) == floor(gl_FragCoord.x)) { continue; }\n    if (float(i) == dimensions.x) { break; }\n    \n    vec2 index = indexToTextureIndex(dimensions, float(i));\n    \n    vec4 p2 = texture2D(positionTexture, index);\n    float m2 = pow(p2.w, 3.0);\n    vec3 diff = p2.xyz - p1.xyz;\n    float distanc = pow(length(diff), 3.0);\n    \n    vec3 force = G*( (m1 * m2) / (distanc) )*diff;\n    totalForce += force;\n  }\n  \n  vec3 acc = totalForce/m1;\n  \n  vec3 deltaVel = acc*DT; // delta T\n  vec3 vel = v.xyz + deltaVel;\n  \n  vec3 newVel;\n  newVel = checkAndAdjustSphereCollisions(p1, vel);\n  newVel = checkAndAdjustWallCollisions(p1, newVel);\n  \n  gl_FragColor = vec4(newVel, 0);\n}\n"
  );
  var vsPositions = (
    /*glsl*/
    "\nattribute vec4 position;\n\nvoid main() {\n  gl_Position = position;\n}\n"
  );
  var fsPositions = (
    /*glsl*/
    "\nprecision mediump float;\n\nuniform sampler2D positionTexture;\nuniform sampler2D velocityTexture;\nuniform vec2 dimensions;\nuniform float DT;\n\nvoid main() {\n  vec2 texcoord = gl_FragCoord.xy / dimensions;\n  vec4 positionValue = texture2D(positionTexture, texcoord);\n  vec4 velocityValue = texture2D(velocityTexture, texcoord);\n  gl_FragColor = positionValue + velocityValue*DT; // deltaT\n}\n"
  );
  function initComputingProgram(gl, spheres) {
    const textureWidth = spheres.length;
    const textureHeight = 1;
    const ext = gl.getExtension("GMAN_debug_helper");
    const velocityProgram = createWebglProgram(gl, vsVelocities, fsVelocities);
    ext.tagObject(velocityProgram, "velocity-computation-program");
    const positionProgram = createWebglProgram(gl, vsPositions, fsPositions);
    ext.tagObject(positionProgram, "position-computation-program");
    gl.useProgram(positionProgram);
    const positionProgramLocs = {
      position: gl.getAttribLocation(positionProgram, "position"),
      positionTexture: gl.getUniformLocation(positionProgram, "positionTexture"),
      velocityTexture: gl.getUniformLocation(positionProgram, "velocityTexture"),
      dimensions: gl.getUniformLocation(positionProgram, "dimensions"),
      dt: gl.getUniformLocation(positionProgram, "DT")
    };
    const velocityProgramLocs = {
      position: gl.getAttribLocation(velocityProgram, "position"),
      positionTexture: gl.getUniformLocation(velocityProgram, "positionTexture"),
      velocityTexture: gl.getUniformLocation(velocityProgram, "velocityTexture"),
      dimensions: gl.getUniformLocation(velocityProgram, "dimensions"),
      dt: gl.getUniformLocation(velocityProgram, "DT"),
      G: gl.getUniformLocation(velocityProgram, "G")
    };
    const spherePositions = new Float32Array(
      spheres.map((sphere) => sphere.center).flat()
    );
    const sphereVelocities = new Float32Array(
      spheres.map((sphere) => sphere.velocity).flat()
    );
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    const inputPositionTex = createTexture(
      gl,
      spherePositions,
      textureWidth,
      textureHeight
    );
    ext.tagObject(inputPositionTex, "input-position-texture");
    inputPositionTex.id = "input-position-tex";
    const inputVelocityTex = createTexture(
      gl,
      sphereVelocities,
      textureWidth,
      textureHeight
    );
    ext.tagObject(inputVelocityTex, "input-velocity-texture");
    inputVelocityTex.id = "input-velocity-tex";
    const outputPositionTex = createTexture(gl, null, textureWidth, textureHeight);
    ext.tagObject(outputPositionTex, "output-position-texture");
    outputPositionTex.id = "output-position-tex";
    const outputVelocityTex = createTexture(
      gl,
      sphereVelocities,
      textureWidth,
      textureHeight
    );
    ext.tagObject(outputVelocityTex, "output-velocity-texture");
    outputVelocityTex.id = "output-velocity-tex";
    const inputPositionFb = createFramebuffer(gl, textureWidth, textureHeight, inputPositionTex);
    ext.tagObject(inputPositionFb, "input-position-framebuf");
    const outputPositionFb = createFramebuffer(gl, textureWidth, textureHeight, outputPositionTex);
    ext.tagObject(outputPositionFb, "output-position-framebuf");
    outputPositionFb.texture = outputPositionTex;
    const inputVelocityFb = createFramebuffer(gl, textureWidth, textureHeight, inputVelocityTex);
    ext.tagObject(inputVelocityFb, "input-velocity-framebuf");
    const outputVelocityFb = createFramebuffer(gl, textureWidth, textureHeight, outputVelocityTex);
    ext.tagObject(outputVelocityFb, "output-velocity-framebuf");
    console.log(spherePositions);
    let dataBuffers = [
      {
        velocity: { frameBuffer: outputVelocityFb, inputTexture: inputVelocityTex, outputTexture: outputVelocityTex },
        position: { frameBuffer: outputPositionFb, inputTexture: inputPositionTex, outputTexture: outputPositionTex }
      },
      {
        velocity: { frameBuffer: inputVelocityFb, inputTexture: outputVelocityTex, outputTexture: inputVelocityTex },
        position: { frameBuffer: inputPositionFb, inputTexture: outputPositionTex, outputTexture: inputPositionTex }
      }
    ];
    function computeVelocities(dataBuffer) {
      gl.useProgram(velocityProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, dataBuffer.position.inputTexture);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, dataBuffer.velocity.inputTexture);
      gl.uniform1i(velocityProgramLocs.positionTexture, 0);
      gl.uniform1i(velocityProgramLocs.velocityTexture, 1);
      gl.uniform2f(velocityProgramLocs.dimensions, textureWidth, textureHeight);
      gl.uniform1f(velocityProgramLocs.dt, Constants.dt);
      gl.uniform1f(velocityProgramLocs.G, Constants.G);
      gl.bindFramebuffer(gl.FRAMEBUFFER, dataBuffer.velocity.frameBuffer);
      gl.viewport(0, 0, textureWidth, textureHeight);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(positionProgramLocs.position);
      gl.vertexAttribPointer(
        positionProgramLocs.position,
        2,
        // size (num components)
        gl.FLOAT,
        // type of data in buffer
        false,
        // normalize
        0,
        // stride (0 = auto)
        0
        // offset
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
          results
        );
        console.log("VELOCITIES");
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
        2,
        // size (num components)
        gl.FLOAT,
        // type of data in buffer
        false,
        // normalize
        0,
        // stride (0 = auto)
        0
        // offset
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
          results
        );
        console.log("POSITIONS");
        console.log(results);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    return {
      dataBuffers,
      computeVelocities,
      computePositions
    };
  }
  function createTexture(gl, data, width, height) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      // mip level
      gl.RGBA,
      // internal format
      width,
      height,
      0,
      // border
      gl.RGBA,
      // format
      gl.FLOAT,
      // type
      data
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
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      tex,
      0
    );
    return fb;
  }

  // lib/graphics.js
  function initGraphicsProgram(gl, spheres) {
    const vs = (
      /*glsl*/
      "\n  const mediump float;\n  attribute float index;\n  varying vec3 normal;\n  uniform sampler2D positionTexture;\n  uniform vec2 dimensions;\n  uniform mat4 matrix;\n  uniform vec3 cameraPosition;\n  \n  varying vec3 vPos;\n  varying float vRad;\n  varying vec3 cameraPos;\n  \n  vec2 indexToTextureIndex(vec2 dimensions, float index) {\n    float y = floor(index / dimensions.x);\n    float x = mod(index, dimensions.x);\n    return (vec2(x, y) + 0.5) / dimensions;\n  }\n\n  void main() {\n    vec4 position = texture2D(positionTexture, indexToTextureIndex(dimensions, index));\n    vPos = position.xyz;\n    vRad = position.w;\n    cameraPos = cameraPosition;\n    \n    gl_Position = matrix*vec4(position.xyz, 1.0);\n    vec4 viewSpace = vec4(position.xyz - cameraPosition, 1.0);\n    float distanceFromCamera = length(viewSpace.xyz);\n    \n    float perspectiveScale = 1000.0 / distanceFromCamera;\n    gl_PointSize = position.w * perspectiveScale;\n  }\n  "
    );
    const fs = (
      /*glsl*/
      "\n  precision mediump float;\n\n  varying vec3 vPos;\n  varying float vRad;\n  varying vec3 cameraPos;\n  \n  uniform vec3 lightPos;\n\n  void main() {\n    vec2 centerToPixel = 2.0 * gl_PointCoord - 1.0;\n    float r2 = dot(centerToPixel, centerToPixel);\n    \n    if (r2 > 1.0) {\n        discard;\n      }\n      \n    float z = sqrt(1.0 - r2);\n    vec3 normal = normalize(vec3(centerToPixel.x, -centerToPixel.y, z));\n\n    vec3 fragPos = vPos + vRad * normal;\n    vec3 lightDir = normalize(lightPos - fragPos);\n    vec3 viewDir = normalize(cameraPos - fragPos);\n    vec3 halfDir = normalize(lightDir + viewDir);\n    \n    float ambient = 0.2;\n    \n    float diff = max(dot(normal, lightDir), 0.0);\n    \n    float spec = pow(max(dot(normal, halfDir), 0.0), 2.0);\n    \n    vec3 sphereColor = vec3(1.0, 1.0, 1.0);\n    vec3 finalColor = sphereColor * (ambient + diff + 0.5 * spec);\n\n    gl_FragColor = vec4(finalColor, 1.0);\n  }\n  "
    );
    const program = createWebglProgram(gl, vs, fs);
    gl.useProgram(program);
    const indexLoc = gl.getAttribLocation(program, "index");
    const textureLoc = gl.getUniformLocation(program, "positionTexture");
    const dimensionsLoc = gl.getUniformLocation(program, "dimensions");
    const matrixLoc = gl.getUniformLocation(program, "matrix");
    const cameraLoc = gl.getUniformLocation(program, "cameraPosition");
    const lightLoc = gl.getUniformLocation(program, "lightPos");
    gl.uniform1i(textureLoc, 0);
    gl.uniform2f(dimensionsLoc, spheres.length, 1);
    const lightPosition = Constants.lightPosition;
    gl.uniform3f(lightLoc, lightPosition[0], lightPosition[1], lightPosition[2]);
    if (gl.canvas instanceof OffscreenCanvas) {
      throw new Error("Nope...");
    }
    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    var projectionMatrix = m4.perspective(60 * Math.PI / 180, aspect, 1, 3e3);
    var cameraPosition = Constants.cameraPosition;
    var target = Constants.cameraTarget;
    var up = [0, 1, 0];
    var cameraMatrix = m4.lookAt(cameraPosition, target, up, m4.identity());
    var viewMatrix = m4.inverse(cameraMatrix);
    var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
    gl.uniformMatrix4fv(
      matrixLoc,
      false,
      viewProjectionMatrix
    );
    gl.uniform3f(cameraLoc, cameraPosition[0], cameraPosition[1], cameraPosition[2]);
    const pBuffer = gl.createBuffer();
    let ids = new Array(spheres.length).fill(0).map((_, i) => i);
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(ids),
      gl.STATIC_DRAW
    );
    return {
      render: (dataBuffer) => {
        gl.useProgram(program);
        gl.enable(gl.DEPTH_TEST);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
        gl.enableVertexAttribArray(indexLoc);
        gl.vertexAttribPointer(indexLoc, 1, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, dataBuffer.position.outputTexture);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, ids.length);
      }
    };
  }

  // lib/scenarios.js
  var Scenarios = {
    twoSpheresFacing: () => [
      new Sphere({ center: { x: 200, y: 300, z: 500 }, velocity: { x: 3, y: 3, z: 0 }, mass: 20 }),
      new Sphere({ center: { x: 800, y: 300, z: 500 }, velocity: { x: -3, y: 0, z: 0 }, mass: 80 })
    ],
    random: (m, M, count) => {
      const spheres = [];
      for (let i = 0; i < count; i++) {
        spheres.push(Sphere.random(m, M));
      }
      return spheres;
    },
    depthMovement: () => {
      return [
        new Sphere({ center: { x: 500, y: 500, z: 500 }, velocity: { x: 0, y: 0, z: 10 }, mass: 80 })
      ];
    }
  };

  // lib/main.js
  function main(spheres) {
    const canvas = initCanvas();
    const gl = canvas.getContext("webgl");
    if (!gl) throw new Error("WebGL not enabled!");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const counter = new Counter();
    const compute = initComputingProgram(gl, spheres);
    const render = initGraphicsProgram(gl, spheres);
    function renderStep() {
      compute.computeVelocities(compute.dataBuffers[counter.count]);
      compute.computePositions(compute.dataBuffers[counter.count]);
      render.render(compute.dataBuffers[counter.count]);
      counter.inc();
      requestAnimationFrame(renderStep);
    }
    requestAnimationFrame(renderStep);
  }
  function Counter() {
    this.count = 0;
    this.inc = () => this.count = (this.count + 1) % 2;
  }
  var minRadiusInput = document.getElementById("minRadius");
  var maxRadiusInput = document.getElementById("maxRadius");
  var nbodies = document.getElementById("number");
  document.getElementById("twospheres").addEventListener("click", () => main(Scenarios.twoSpheresFacing()));
  document.getElementById("random").addEventListener("click", () => main(Scenarios.random(Number(minRadiusInput.value), Number(maxRadiusInput.value), Number(nbodies.value))));
  document.getElementById("depthmovement").addEventListener("click", () => main(Scenarios.depthMovement()));
})();
//# sourceMappingURL=lib.js.map
