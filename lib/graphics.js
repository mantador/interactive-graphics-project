import { Constants } from "./constants";
import { Sphere } from "./sphere";
import { createWebglProgram } from "./utils";


export function initGraphicsProgram(
  gl,
  spheres,
) {
  const vs = /*glsl*/`
  const mediump float;
  attribute float index;
  uniform sampler2D positionTexture;
  uniform vec2 dimensions;
  uniform mat4 matrix;
  uniform vec3 cameraPosition;
  
  varying vec3 vPos;
  varying float vRad;
  varying vec3 cameraPos;
  
  vec2 indexToTextureIndex(vec2 dimensions, float index) {
    float y = floor(index / dimensions.x);
    float x = mod(index, dimensions.x);
    return (vec2(x, y) + 0.5) / dimensions;
  }

  void main() {
    vec4 position = texture2D(positionTexture, indexToTextureIndex(dimensions, index));
    vPos = position.xyz;
    vRad = position.w;
    cameraPos = cameraPosition;
    
    gl_Position = matrix*vec4(position.xyz, 1.0);
    vec4 viewSpace = vec4(position.xyz - cameraPosition, 1.0);
    float distanceFromCamera = length(viewSpace.xyz);
    
    float perspectiveScale = 1000.0 / distanceFromCamera;
    gl_PointSize = position.w * perspectiveScale;
  }
  `;
  
  const fs = /*glsl*/`
  precision mediump float;

  varying vec3 vPos;
  varying float vRad;
  varying vec3 cameraPos;
  
  uniform vec3 lightPos;

  void main() {
    vec2 centerToPixel = 2.0 * gl_PointCoord - 1.0;
    float r_2 = dot(centerToPixel, centerToPixel);
    
    if (r_2 > 1.0) {
        discard;
      }
      
    float z = sqrt(1.0 - r_2);
    vec3 normal = normalize(vec3(centerToPixel.x, -centerToPixel.y, z));

    vec3 fragPos = vPos + vRad * normal;
    vec3 lightDir = normalize(lightPos - fragPos);
    vec3 viewDir = normalize(cameraPos - fragPos);
    vec3 halfDir = normalize(lightDir + viewDir);
    
    float ambient = 0.2;
    
    float diff = max(dot(normal, lightDir), 0.0);
    
    float spec = pow(max(dot(normal, halfDir), 0.0), 2.0);
    
    vec3 sphereColor = vec3(1.0, 1.0, 1.0);
    vec3 finalColor = sphereColor * (ambient + diff + 0.5 * spec);

    gl_FragColor = vec4(finalColor, 1.0);
  }
  `;

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
    throw new Error("Nope...")
  }

  const cameraPosition = Constants.cameraPosition;
  gl.uniform3f(cameraLoc, cameraPosition[0], cameraPosition[1], cameraPosition[2]);
  const pBuffer = gl.createBuffer();
  
  
  let ids = new Array(spheres.length).fill(0).map((_, i) => i);
  gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(ids),
    gl.STATIC_DRAW,
  );
  
  return {
    render: (dataBuffer, matrix) => {
      gl.useProgram(program);
      gl.uniformMatrix4fv(
        matrixLoc, false,
        matrix
      )
      gl.enable(gl.DEPTH_TEST);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      
      gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
      gl.enableVertexAttribArray(indexLoc);
      gl.vertexAttribPointer(indexLoc, 1, gl.FLOAT, false, 0, 0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, dataBuffer.position.outputTexture);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);



      gl.drawArrays(gl.POINTS, 0, ids.length);
    },
  };
}
