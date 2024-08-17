interface ConstantsParams {
  canvasWidth: number;
  canvasHeight: number;
}
export class Constants {
  resolution: number;
  nBodies = 40;
  private constructor() {}
  private static _instance: Constants;
  public static instance(conf?: ConstantsParams) {
    if (!Constants._instance) {
      if (!conf) throw Error("You must provide a conf at initialization");
      Constants._instance = new Constants();
      Constants._instance.resolution = conf.canvasHeight / conf.canvasWidth;
    }

    return Constants._instance;
  }
}
