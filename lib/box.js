import { createWebglProgram } from "./utils";

export class BoxDrawer {

	constructor(gl) {
		this.gl = gl;

		this.prog = createWebglProgram(gl, boxVS, boxFS);

		this.mvp = gl.getUniformLocation(this.prog, 'mvp');

		this.vertPos = gl.getAttribLocation(this.prog, 'pos');

		this.vertbuffer = gl.createBuffer();
		var pos = [
			0, 0, 0,
			0, 0, 1000,
			0, 1000, 0,
			0, 1000, 1000,
			1000, 0, 0,
			1000, 0, 1000,
			1000, 1000, 0,
			1000, 1000, 1000];
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);

		this.linebuffer = gl.createBuffer();
		var line = [
			0, 1, 1, 3, 3, 2, 2, 0,
			4, 5, 5, 7, 7, 6, 6, 4,
			0, 4, 1, 5, 3, 7, 2, 6];
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.linebuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(line), gl.STATIC_DRAW);
	}
	draw(trans) {
		// Draw the line segments
		this.gl.useProgram(this.prog);
		this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
		this.gl.enable(this.gl.DEPTH_TEST);
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
		// this.gl.clearColor(0, 0, 0, 1);
		// this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
		this.gl.uniformMatrix4fv(this.mvp, false, trans);
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertbuffer);
		this.gl.vertexAttribPointer(this.vertPos, 3, this.gl.FLOAT, false, 0, 0);
		this.gl.enableVertexAttribArray(this.vertPos);
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.linebuffer);
		this.gl.drawElements(this.gl.LINES, 24, this.gl.UNSIGNED_BYTE, 0);
	}
}
// Vertex shader source code
var boxVS = `
	attribute vec3 pos;
	uniform mat4 mvp;
	void main()
	{
		gl_Position = mvp * vec4(pos,1);
	}
`;
// Fragment shader source code
var boxFS = `
	precision mediump float;
	void main()
	{
		gl_FragColor = vec4(1,1,1,1);
	}
`;
