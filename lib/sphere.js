import { Constants } from "./constants";


export class Sphere {
  verteces = [];
  static DIV = 50;
  static PI2 = Math.PI * 2;
  static DRAD = Sphere.PI2 / Sphere.DIV;

  constructor(conf) {
    this.verteces = [];
    this._center = conf.center;
    this.mass = conf.mass;
    this._velocity = conf.velocity;
  }

  get velocity() { return [this._velocity.x, this._velocity.y, this._velocity.z, 0]; }

  get center() { return [this._center.x, this._center.y, this._center.z, this.mass ]; }

  static randomPosition(r) {
    return Math.floor(Math.random() * (1000 - 2 * r)) + r;
  }

  static random(minRadius = 10, maxRadius = 40) {
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
}
