import { Constants } from "./constants";

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
  throw new Error(gl.getShaderInfoLog(shader) || "No message available");
}

export function createWebglProgram(gl, sourceVS, sourceFS) {
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

export function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
  // Lookup the size the browser is displaying the canvas in CSS pixels.
  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;

  // Check if the canvas is not the same size.
  const needResize =
    canvas.width !== displayWidth || canvas.height !== displayHeight;

  if (needResize) {
    // Make the canvas the same size
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }

  return needResize;
}

export function checkGlExtensions(canvas: HTMLCanvasElement) {

  const gl = canvas.getContext("webgl");
  if (!gl) {
    throw new Error("No webgl here");
  }

  // check we can use floating point textures
  const ext1 = gl.getExtension('OES_texture_float');
  if (!ext1) {
    throw ('Need OES_texture_float');
  }
  // check we can render to floating point textures
  const ext2 = gl.getExtension('WEBGL_color_buffer_float');
  if (!ext2) {
    throw ('Need WEBGL_color_buffer_float');
  }
  // check we can use textures in a vertex shader
  if (gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) < 1) {
    throw ('Can not use textures in vertex shaders');
  }

  const ext = gl.getExtension('GMAN_debug_helper');

}

export function initCanvas(): HTMLCanvasElement {
  const canvas: HTMLCanvasElement | null = document.querySelector("#canvas");
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
