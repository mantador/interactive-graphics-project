
export const Scenarios = {
    twoSpheresFacing: () => [
        new Sphere({ center: { x: 200, y: 300, z: 500 }, velocity: { x: 3, y: 0.3, z: 0 }, mass: 20 }),
        new Sphere({ center: { x: 800, y: 300, z: 500 }, velocity: { x: -3, y: 0, z: 0 }, mass: 80 }),
    ],
    random: () => {
        const spheres = [];
        for (let i = 0; i < Constants.nBodies; i++) {
            spheres.push(Sphere.random());
        }
    }
};
