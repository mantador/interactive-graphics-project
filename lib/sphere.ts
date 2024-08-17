import { Constants } from "./constants";

interface Point {
  x: number;
  y: number;
  z: number;
}

export class Sphere {
  verteces: Array<number> = [];
  static DIV = 50;
  static PI2 = Math.PI * 2;
  static DRAD = Sphere.PI2 / Sphere.DIV;

  constructor(private conf: { center: Point; radius: number }) {
    this.verteces = [];
    this.render();
  }

  static random(minRadius = 10, maxRadius = 15): Sphere {
    const r = Math.floor(Math.random() * (maxRadius - minRadius)) + minRadius;
    // Ensure that position + radius does not overflow the canvas
    let x = Math.floor(Math.random() * (1000 - 2 * r)) + r;
    let y = Math.floor(Math.random() * (1000 - 2 * r)) + r;
    return new Sphere({
      center: {
        x: x,
        y: y,
        z: 0,
      },
      radius: r,
    });
  }

  render() {
    const constants = Constants.instance();

    for (let i = 0; i < Sphere.DIV; i++) {
      this.verteces.push(this.conf.center.x, this.conf.center.y);

      const angle = (i * Sphere.DRAD) % Sphere.PI2;
      const sx1 = Math.sin(angle);
      const cx1 = Math.cos(angle);
      const v1x =
        this.conf.center.x + this.conf.radius * cx1 * constants.resolution;
      const v1y = this.conf.center.y + this.conf.radius * sx1;
      this.verteces.push(v1x, v1y);

      const angle2 = (angle + Sphere.DRAD) % Sphere.PI2;
      const sx2 = Math.sin(angle2);
      const cx2 = Math.cos(angle2);
      const v2x =
        this.conf.center.x + this.conf.radius * cx2 * constants.resolution;
      const v2y = this.conf.center.y + this.conf.radius * sx2;
      this.verteces.push(v2x, v2y);
    }
  }

  /**
   * @deprecated This method was used for early testing only
   *
   * @param dp the position change
   */
  move(dp: Point) {
    this.conf.center.x += dp.x;
    this.conf.center.y += dp.y;
    this.conf.center.z += dp.z;
    this.render();
  }
}
