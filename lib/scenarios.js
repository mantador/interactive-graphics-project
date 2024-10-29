import { Sphere } from "./sphere";

export const Scenarios = {
    random: (m, M, count) => {
        const spheres = [];
        for (let i = 0; i < count; i++) {
            spheres.push(Sphere.random(m, M));
        }
        return spheres;
    }
};
