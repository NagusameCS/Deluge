import { AbstractMesh, Color3, MeshBuilder, Scene, StandardMaterial, Vector3 } from "@babylonjs/core";
import { InteractionSystem } from "./interaction";

export type CreatureKind = "mob" | "animal";

interface MobConfig {
    name: string;
    kind: CreatureKind;
    color: Color3;
    speed: number;
    hp: number;
    reward: Record<string, number>;
    skillPoints: number;
    size?: number;
}

interface MobState {
    mesh: AbstractMesh;
    dir: Vector3;
    speed: number;
    changeTimer: number;
    kind: CreatureKind;
}

export class MobManager {
    private mobs: MobState[] = [];
    private terrainHalfSize: number;
    private scene: Scene;
    private interaction: InteractionSystem;

    constructor(scene: Scene, interaction: InteractionSystem, terrainSize: number) {
        this.scene = scene;
        this.interaction = interaction;
        this.terrainHalfSize = terrainSize / 2 - 8;
        this.scene.onBeforeRenderObservable.add(() => this.update());
    }

    spawn(config: MobConfig, position?: Vector3) {
        const size = config.size ?? 1.2;
        const mesh = MeshBuilder.CreateCapsule(config.name + Math.random().toString(16).slice(2), {
            height: size * 1.6,
            radius: size * 0.4,
        }, this.scene);
        mesh.position = position || new Vector3(this.randomCoord(), 2, this.randomCoord());
        mesh.checkCollisions = true;

        const mat = new StandardMaterial(config.name + "Mat", this.scene);
        mat.diffuseColor = config.color;
        mat.specularColor = new Color3(0.05, 0.05, 0.05);
        mesh.material = mat;

        this.interaction.register(mesh, {
            kind: config.kind,
            hp: config.hp,
            reward: config.reward,
            skillPoints: config.skillPoints,
        });

        this.mobs.push({
            mesh,
            dir: this.randomDir(),
            speed: config.speed,
            changeTimer: 1.5 + Math.random() * 2,
            kind: config.kind,
        });
    }

    private update() {
        const delta = this.scene.getEngine().getDeltaTime() / 1000;
        this.mobs = this.mobs.filter((mob) => !mob.mesh.isDisposed());
        for (const mob of this.mobs) {
            mob.changeTimer -= delta;
            if (mob.changeTimer <= 0) {
                mob.dir = this.randomDir();
                mob.changeTimer = 1.5 + Math.random() * 2;
            }

            const move = mob.dir.scale(mob.speed * delta);
            mob.mesh.moveWithCollisions(move);

            // Keep inside terrain bounds
            const pos = mob.mesh.position;
            pos.x = Math.min(this.terrainHalfSize, Math.max(-this.terrainHalfSize, pos.x));
            pos.z = Math.min(this.terrainHalfSize, Math.max(-this.terrainHalfSize, pos.z));
            mob.mesh.position = pos;
        }
    }

    private randomDir() {
        const v = new Vector3(Math.random() - 0.5, 0, Math.random() - 0.5);
        v.normalize();
        return v;
    }

    private randomCoord() {
        return Math.random() * this.terrainHalfSize * 2 - this.terrainHalfSize;
    }
}

export function spawnCreatures(scene: Scene, interaction: InteractionSystem, terrainSize: number) {
    const manager = new MobManager(scene, interaction, terrainSize);

    // Hostile mobs
    manager.spawn({
        name: "Brute",
        kind: "mob",
        color: new Color3(0.4, 0.1, 0.1),
        speed: 4.5,
        hp: 80,
        reward: { "Hide": 2, "Meat": 1 },
        skillPoints: 2,
        size: 1.1,
    });
    manager.spawn({
        name: "Crawler",
        kind: "mob",
        color: new Color3(0.15, 0.25, 0.4),
        speed: 3.8,
        hp: 60,
        reward: { "Hide": 1, "Stone": 1 },
        skillPoints: 2,
        size: 1,
    });

    // Passive animals
    for (let i = 0; i < 4; i++) {
        manager.spawn({
            name: "Deer",
            kind: "animal",
            color: new Color3(0.65, 0.45, 0.28),
            speed: 2.5,
            hp: 40,
            reward: { "Meat": 2, "Hide": 1 },
            skillPoints: 1,
            size: 1.2,
        });
    }

    return manager;
}
