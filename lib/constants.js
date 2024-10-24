export class Constants {
  static nBodies = 8;
  static canvasWidth
  static canvasHeight
  static dt = 1.0;
  static log = false;
  static get resolution() {
    return Constants.canvasHeight / Constants.canvasWidth;
  }

  static setCanvasDimensions(width, height) {
    Constants.canvasWidth = width;
    Constants.canvasHeight = height;
  }
}
