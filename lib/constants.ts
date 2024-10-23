export class Constants {
  public static nBodies = 8;
  private constructor() {}
  public static canvasWidth: number;
  public static canvasHeight: number;
  public static dt = 1.0;
  public static log = false;

  public static get resolution() {
    return Constants.canvasHeight / Constants.canvasWidth;
  }

  public static setCanvasDimensions(width: number, height: number) {
    Constants.canvasWidth = width;
    Constants.canvasHeight = height;
  }
}
