(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // lib/constants.ts
  var _Constants = class _Constants {
    constructor() {
    }
    static get resolution() {
      return _Constants.canvasHeight / _Constants.canvasWidth;
    }
    static setCanvasDimensions(width, height) {
      _Constants.canvasWidth = width;
      _Constants.canvasHeight = height;
    }
  };
  __publicField(_Constants, "nBodies", 8);
  __publicField(_Constants, "canvasWidth");
  __publicField(_Constants, "canvasHeight");
  var Constants = _Constants;

  // lib/utils.ts
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
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    Constants.setCanvasDimensions(cw, ch);
    return canvas;
  }

  // lib/computing.ts
  var vsVelocities = (
    /*glsl*/
    "\nattribute vec4 position;\nvoid main() {\n  gl_Position = position;\n}\n"
  );
  var fsVelocities = (
    /*glsl*/
    "\nprecision mediump float;\n\nuniform sampler2D positionTexture;\nuniform sampler2D velocityTexture;\nuniform vec2 dimensions;\n\nconst float MAX_ITER=1000.0;\n\nvec2 indexToTextureIndex(vec2 dimensions, float index) {\n  float y = floor(index / dimensions.x);\n  float x = mod(index, dimensions.x);\n  return (vec2(x, y) + 0.5) / dimensions;\n}\n\nvec3 reflectVelocity(vec3 vel, vec3 normal) {\n  float dotp = dot(vel.xyz, normal);\n  float norm = dot(normal, normal);\n  return vel.xyz - (2.0 * (dotp/norm) )*normal;\n}\n\n\nvoid main() {\n  vec2 texcoord = gl_FragCoord.xy / dimensions;\n  vec3 force = vec3(0, 0, 0);\n  vec4 p1 = texture2D(positionTexture, texcoord);\n  vec4 v = texture2D(velocityTexture, texcoord);  \n  \n  float G = 1.0;\n\n  vec3 totalForce = vec3(0, 0, 0);\n\n  for(float i = 0.0; i < MAX_ITER; i++) {\n    if (float(i) == floor(gl_FragCoord.x)) { continue; }\n    if (float(i) == dimensions.x) { break; }\n\n    vec2 index = indexToTextureIndex(dimensions, float(i));\n\n    vec4 p2 = texture2D(positionTexture, index);\n    vec3 diff = p2.xyz - p1.xyz;\n    float distanc = pow(length(diff), 3.0);\n\n    vec3 force = G*( (p1.w * p2.w) / (distanc) )*diff;\n    totalForce += force;\n  }\n\n  vec3 acc = totalForce/p1.w;\n\n  vec3 deltaVel = acc*10.0; // delta T\n  vec3 vel = v.xyz + deltaVel;\n  \n  if (p1.x >= 1000.0) {\n    // vel.x = 999.0;\n    vel = reflectVelocity(vel, vec3(-1, 0, 0));\n  }\n\n  if (p1.x <= 0.0) {\n    // vel.x = 999.0;\n    vel = reflectVelocity(vel, vec3(1, 0, 0));\n  }\n\n  if (p1.y >= 1000.0) { // Collision on upper plane\n    // vel. = 999.0;\n    vel = reflectVelocity(vel, vec3(0, -1, 0));\n  }\n  if (p1.y <= 0.0) {\n    vel = reflectVelocity(vel, vec3(0, 1, 0));\n  }\n\n  if (p1.z >= 1000.0) {\n    vel = reflectVelocity(vel, vec3(0, 0, -1));\n  }\n\n  if (p1.z <= 0.0) {\n    vel = reflectVelocity(vel, vec3(0, 0, 1));\n  }\n  \n\n  gl_FragColor = vec4(vel, 0);\n}\n"
  );
  var vsPositions = (
    /*glsl*/
    "\nattribute vec4 position;\nvoid main() {\n  gl_Position = position;\n}\n"
  );
  var fsPositions = (
    /*glsl*/
    "\nprecision mediump float;\n\nuniform sampler2D positionTexture;\nuniform sampler2D velocityTexture;\nuniform vec2 dimensions;\n\nvoid main() {\n  vec2 texcoord = gl_FragCoord.xy / dimensions;\n  vec4 positionValue = texture2D(positionTexture, texcoord);\n  vec4 velocityValue = texture2D(velocityTexture, texcoord);\n  gl_FragColor = positionValue + velocityValue*10.0; // deltaT\n}\n"
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
      dimensions: gl.getUniformLocation(positionProgram, "dimensions")
    };
    const velocityProgramLocs = {
      position: gl.getAttribLocation(velocityProgram, "position"),
      positionTexture: gl.getUniformLocation(velocityProgram, "positionTexture"),
      velocityTexture: gl.getUniformLocation(velocityProgram, "velocityTexture"),
      dimensions: gl.getUniformLocation(velocityProgram, "dimensions")
    };
    const spherePositions = new Float32Array(
      spheres.map((sphere) => sphere.getCoords()).flat()
    );
    const sphereVelocities = new Float32Array(
      spheres.map((sphere) => sphere.velocity).flat()
    );
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1, 1, 1]),
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
        velocity: {
          frameBuffer: outputVelocityFb,
          inputTexture: inputVelocityTex,
          outputTexture: outputVelocityTex
        },
        position: {
          frameBuffer: outputPositionFb,
          inputTexture: inputPositionTex,
          outputTexture: outputPositionTex
        }
      },
      {
        velocity: { frameBuffer: inputVelocityFb, inputTexture: outputVelocityTex, outputTexture: inputVelocityTex },
        position: { frameBuffer: inputPositionFb, inputTexture: outputPositionTex, outputTexture: outputPositionTex }
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

  // lib/graphics.ts
  function initGraphicsProgram(gl, spheres) {
    const vs = (
      /*glsl*/
      "\n  const mediump float;\n  attribute float index;\n  varying vec3 normal;\n  uniform sampler2D positionTexture;\n  uniform vec2 dimensions;\n  uniform mat4 matrix;\n\n  vec2 indexToTextureIndex(vec2 dimensions, float index) {\n    float y = floor(index / dimensions.x);\n    float x = mod(index, dimensions.x);\n    return (vec2(x, y) + 0.5) / dimensions;\n  }\n\n  void main() {\n    vec4 position = texture2D(positionTexture, indexToTextureIndex(dimensions, index));\n    gl_Position = matrix*vec4(position.xyz, 1.0);\n    gl_PointSize = position.w;\n  }\n  "
    );
    const fs = (
      /*glsl*/
      "\n  precision mediump float;\n  void main() {\n      vec2 centerToPixel = 2.0 * gl_PointCoord - 1.0;\n      if (dot(centerToPixel, centerToPixel) > 1.0) {\n          discard;\n      }\n      gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); \n  }\n  "
    );
    const program = createWebglProgram(gl, vs, fs);
    gl.useProgram(program);
    const indexLoc = gl.getAttribLocation(program, "index");
    const textureLoc = gl.getUniformLocation(program, "positionTexture");
    const dimensionsLoc = gl.getUniformLocation(program, "dimensions");
    const matrixLoc = gl.getUniformLocation(program, "matrix");
    gl.uniform1i(textureLoc, 0);
    gl.uniform2f(dimensionsLoc, spheres.length, 1);
    if (gl.canvas instanceof OffscreenCanvas) {
      throw new Error("Nope...");
    }
    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    var projectionMatrix = m4.perspective(60 * Math.PI / 180, aspect, 1, 2e3);
    var cameraPosition = [500, 500, 1e3];
    var target = [500, 500, 500];
    var up = [0, 1, 0];
    var cameraMatrix = m4.lookAt(cameraPosition, target, up, m4.identity());
    var viewMatrix = m4.inverse(cameraMatrix);
    var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
    gl.uniformMatrix4fv(
      matrixLoc,
      false,
      viewProjectionMatrix
      // m4.orthographic(0, gl.canvas.width, 0, gl.canvas.height, -1, 1)
    );
    const pBuffer = gl.createBuffer();
    let ids = new Array(spheres.length).fill(0).map((_, i) => i);
    return {
      render: (dataBuffer) => {
        gl.useProgram(program);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(ids),
          gl.STATIC_DRAW
        );
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

  // lib/sphere.ts
  var _Sphere = class _Sphere {
    constructor(conf) {
      this.conf = conf;
      __publicField(this, "verteces", []);
      this.verteces = [];
      this.render();
    }
    get center() {
      return this.conf.center;
    }
    get velocity() {
      return [this.conf.velocity.x, this.conf.velocity.y, this.conf.velocity.z, 0];
    }
    getCoords() {
      return [this.center.x, this.center.y, this.center.z, this.conf.mass];
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
    render() {
      for (let i = 0; i < _Sphere.DIV; i++) {
        this.verteces.push(this.conf.center.x, this.conf.center.y);
        const angle = i * _Sphere.DRAD % _Sphere.PI2;
        const sx1 = Math.sin(angle);
        const cx1 = Math.cos(angle);
        const v1x = this.conf.center.x + this.conf.mass * cx1 * Constants.resolution;
        const v1y = this.conf.center.y + this.conf.mass * sx1;
        this.verteces.push(v1x, v1y);
        const angle2 = (angle + _Sphere.DRAD) % _Sphere.PI2;
        const sx2 = Math.sin(angle2);
        const cx2 = Math.cos(angle2);
        const v2x = this.conf.center.x + this.conf.mass * cx2 * Constants.resolution;
        const v2y = this.conf.center.y + this.conf.mass * sx2;
        this.verteces.push(v2x, v2y);
      }
    }
  };
  __publicField(_Sphere, "DIV", 50);
  __publicField(_Sphere, "PI2", Math.PI * 2);
  __publicField(_Sphere, "DRAD", _Sphere.PI2 / _Sphere.DIV);
  var Sphere = _Sphere;

  // lib/main.ts
  function main() {
    const canvas = initCanvas();
    const gl = canvas.getContext("webgl");
    if (!gl) throw new Error("WebGL not enabled!");
    const spheres = [];
    for (let i = 0; i < 10; i++) {
      spheres.push(Sphere.random(10));
    }
    const counter = new Counter();
    const comp = initComputingProgram(gl, spheres);
    const p = initGraphicsProgram(gl, spheres);
    function renderStep() {
      comp.computeVelocities(comp.dataBuffers[counter.count]);
      comp.computePositions(comp.dataBuffers[counter.count]);
      p.render(comp.dataBuffers[counter.count]);
      counter.inc();
      requestAnimationFrame(renderStep);
    }
    requestAnimationFrame(renderStep);
  }
  function Counter() {
    this.count = 0;
    this.inc = () => this.count = (this.count + 1) % 2;
  }
  window.addEventListener("load", () => main());
})();
//# sourceMappingURL=lib.js.map
