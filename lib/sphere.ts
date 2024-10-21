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

  constructor(private conf: { center: Point, velocity: Point, mass: number }) {
    this.verteces = [];
    this.render();
  }

  get center() { return this.conf.center; }
  get velocity() { return [this.conf.velocity.x, this.conf.velocity.y, this.conf.velocity.z, 0]; }

  public getCoords() { return [this.center.x, this.center.y, this.center.z, this.conf.mass ]; }

  private static randomPosition(r) {
    return Math.floor(Math.random() * (1000 - 2 * r)) + r;
  }

  static random(minRadius = 10, maxRadius = 40): Sphere {
    const r = Math.floor(Math.random() * (maxRadius - minRadius)) + minRadius;
    // Ensure that position + radius does not overflow the canvas
    let x = Sphere.randomPosition(r);
    let y = Sphere.randomPosition(r);
    let z = Sphere.randomPosition(r);
    return new Sphere({
      center: {
        x: x,
        y: y,
        z: z,
      },
      velocity: {
        x: 0,
        y: 0,
        z: 0,
      }, 
      mass: r,
    });
  }

  render() {
    for (let i = 0; i < Sphere.DIV; i++) {
      this.verteces.push(this.conf.center.x, this.conf.center.y);

      const angle = (i * Sphere.DRAD) % Sphere.PI2;
      const sx1 = Math.sin(angle);
      const cx1 = Math.cos(angle);
      const v1x =
        this.conf.center.x + this.conf.mass * cx1 * Constants.resolution;
      const v1y = this.conf.center.y + this.conf.mass * sx1;
      this.verteces.push(v1x, v1y);

      const angle2 = (angle + Sphere.DRAD) % Sphere.PI2;
      const sx2 = Math.sin(angle2);
      const cx2 = Math.cos(angle2);
      const v2x =
        this.conf.center.x + this.conf.mass * cx2 * Constants.resolution;
      const v2y = this.conf.center.y + this.conf.mass * sx2;
      this.verteces.push(v2x, v2y);
    }
  }
}
