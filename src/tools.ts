import { Scene, AbstractMesh, MeshBuilder, Vector3, Node, Matrix, Camera } from "@babylonjs/core";

export type ToolType = "Sword" | "Crossbow" | "Axe" | "Pickaxe";

export abstract class Tool {
    public mesh: AbstractMesh;
    public type: ToolType;

    constructor(scene: Scene, parent: Node, type: ToolType) {
        this.type = type;
        this.mesh = this.createMesh(scene);
        this.mesh.parent = parent;
        this.mesh.position = new Vector3(0.5, -0.5, 1); // Position relative to camera
        this.mesh.isVisible = false;
    }

    abstract createMesh(scene: Scene): AbstractMesh;

    public activate() {
        this.mesh.isVisible = true;
    }

    public deactivate() {
        this.mesh.isVisible = false;
    }

    public action(): void {
        const scene = this.mesh.getScene();
        const camera = this.mesh.parent as Camera;

        // Create ray from center of screen
        const ray = scene.createPickingRay(
            scene.getEngine().getRenderWidth() / 2,
            scene.getEngine().getRenderHeight() / 2,
            Matrix.Identity(),
            camera
        );

        const hit = scene.pickWithRay(ray);

        if (hit && hit.pickedMesh) {
            this.onHit(hit.pickedMesh);
        }
    }

    protected abstract onHit(mesh: AbstractMesh): void;
}

export class Sword extends Tool {
    constructor(scene: Scene, parent: Node) {
        super(scene, parent, "Sword");
    }
    createMesh(scene: Scene): AbstractMesh {
        const mesh = MeshBuilder.CreateBox("sword", { width: 0.1, height: 0.1, depth: 1 }, scene);
        return mesh;
    }
    onHit(mesh: AbstractMesh) {
        console.log("Hit with sword:", mesh.name);
        if (mesh.name.includes("enemy")) {
            mesh.dispose();
        }
    }
}

export class Crossbow extends Tool {
    constructor(scene: Scene, parent: Node) {
        super(scene, parent, "Crossbow");
    }
    createMesh(scene: Scene): AbstractMesh {
        const mesh = MeshBuilder.CreateBox("crossbow", { width: 0.5, height: 0.1, depth: 0.5 }, scene);
        return mesh;
    }
    onHit(mesh: AbstractMesh) {
        console.log("Shot with crossbow:", mesh.name);
        // Projectile logic would go here
    }
}

export class Axe extends Tool {
    constructor(scene: Scene, parent: Node) {
        super(scene, parent, "Axe");
    }
    createMesh(scene: Scene): AbstractMesh {
        const mesh = MeshBuilder.CreateCylinder("axe", { height: 1, diameter: 0.1 }, scene);
        mesh.rotation.x = Math.PI / 2;
        return mesh;
    }
    onHit(mesh: AbstractMesh) {
        console.log("Hit with axe:", mesh.name);
        if (mesh.name.includes("tree")) {
            mesh.dispose();
        }
    }
}

export class Pickaxe extends Tool {
    constructor(scene: Scene, parent: Node) {
        super(scene, parent, "Pickaxe");
    }
    createMesh(scene: Scene): AbstractMesh {
        const mesh = MeshBuilder.CreateCylinder("pickaxe", { height: 1, diameter: 0.1 }, scene);
        mesh.rotation.z = Math.PI / 2;
        return mesh;
    }
    onHit(mesh: AbstractMesh) {
        console.log("Hit with pickaxe:", mesh.name);
        if (mesh.name.includes("rock")) {
            mesh.dispose();
        }
    }
}
