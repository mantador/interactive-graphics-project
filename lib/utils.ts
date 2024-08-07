function createCShader(gl: WebGLRenderingContext, source: string, type: any) {
  var shader = gl.createShader(type);
  if (shader == null) throw new DOMException("Compiled shader is null");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }

  console.error(gl.getShaderInfoLog(shader));
}

export function createCProgram(gl, sourceVS, sourceFS) {
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
