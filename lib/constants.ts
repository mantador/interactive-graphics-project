export class Constants {
  public static nBodies = 40;
  private constructor() {}
  public static canvasWidth: number;
  public static canvasHeight: number;

  public static get resolution() {
    return Constants.canvasWidth / Constants.canvasHeight;
  }

  public static setCanvasDimensions(width: number, height: number) {
    Constants.canvasWidth = width;
    Constants.canvasHeight = height;
  }
}
