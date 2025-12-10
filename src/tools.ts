import { Scene, AbstractMesh, MeshBuilder, Vector3, Node, Matrix, Camera, StandardMaterial, Color3 } from "@babylonjs/core";
import { InteractionSystem } from "./interaction";

export type ToolType = "Sword" | "Crossbow" | "Axe" | "Pickaxe";

export abstract class Tool {
    public mesh: AbstractMesh;
    public type: ToolType;
    protected interaction?: InteractionSystem;

    constructor(scene: Scene, parent: Node, type: ToolType, interaction?: InteractionSystem) {
        this.type = type;
        this.mesh = this.createMesh(scene);
        this.mesh.parent = parent;
        this.mesh.position = new Vector3(0.5, -0.5, 1); // Position relative to camera
        this.mesh.isVisible = false;
        this.interaction = interaction;
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
            if (this.interaction) {
                this.interaction.handleHit(hit.pickedMesh, 12);
            }
        }
    }

    protected abstract onHit(mesh: AbstractMesh): void;
}

export class Sword extends Tool {
    constructor(scene: Scene, parent: Node, interaction?: InteractionSystem) {
        super(scene, parent, "Sword", interaction);
    }
    createMesh(scene: Scene): AbstractMesh {
        const blade = MeshBuilder.CreateBox("sword_blade", { width: 0.08, height: 0.14, depth: 1.35 }, scene);
        blade.position.z = 0.6;

        const tip = MeshBuilder.CreateBox("sword_tip", { width: 0.06, height: 0.12, depth: 0.25 }, scene);
        tip.position.z = 1.25;
        tip.parent = blade;

        const guard = MeshBuilder.CreateBox("sword_guard", { width: 0.4, height: 0.1, depth: 0.12 }, scene);
        guard.position.z = -0.05;
        guard.parent = blade;

        const grip = MeshBuilder.CreateCylinder("sword_grip", { height: 0.45, diameter: 0.1 }, scene);
        grip.rotation.x = Math.PI / 2;
        grip.position.z = -0.4;
        grip.parent = blade;

        const pommel = MeshBuilder.CreateSphere("sword_pommel", { diameter: 0.14 }, scene);
        pommel.position.z = -0.7;
        pommel.parent = blade;

        const bladeMat = new StandardMaterial("bladeMat", scene);
        bladeMat.diffuseColor = new Color3(0.9, 0.92, 0.96);
        bladeMat.specularColor = new Color3(0.9, 0.9, 0.9);
        blade.material = bladeMat;
        tip.material = bladeMat;

        const guardMat = new StandardMaterial("guardMat", scene);
        guardMat.diffuseColor = new Color3(0.65, 0.55, 0.25);
        guard.material = guardMat;
        pommel.material = guardMat;

        const gripMat = new StandardMaterial("gripMat", scene);
        gripMat.diffuseColor = new Color3(0.28, 0.16, 0.12);
        grip.material = gripMat;

        return blade;
    }
    onHit(mesh: AbstractMesh) {
        console.log("Hit with sword:", mesh.name);
    }
}

export class Crossbow extends Tool {
    constructor(scene: Scene, parent: Node, interaction?: InteractionSystem) {
        super(scene, parent, "Crossbow", interaction);
    }
    createMesh(scene: Scene): AbstractMesh {
        const stock = MeshBuilder.CreateBox("crossbow_stock", { width: 0.4, height: 0.14, depth: 0.9 }, scene);
        stock.position.z = 0.2;

        const riser = MeshBuilder.CreateBox("crossbow_riser", { width: 0.2, height: 0.12, depth: 0.2 }, scene);
        riser.position.z = 0.65;
        riser.parent = stock;

        const limb = MeshBuilder.CreateBox("crossbow_limb", { width: 0.8, height: 0.06, depth: 0.08 }, scene);
        limb.position.z = 0.75;
        limb.parent = stock;

        const bowString = MeshBuilder.CreateCylinder("crossbow_string", { height: 0.82, diameter: 0.015 }, scene);
        bowString.rotation.z = Math.PI / 2;
        bowString.position.z = 0.74;
        bowString.parent = stock;

        const grip = MeshBuilder.CreateBox("crossbow_grip", { width: 0.18, height: 0.3, depth: 0.16 }, scene);
        grip.position.z = 0;
        grip.position.y = -0.2;
        grip.parent = stock;

        const wood = new StandardMaterial("crossbowWood", scene);
        wood.diffuseColor = new Color3(0.45, 0.28, 0.14);
        const metal = new StandardMaterial("crossbowMetal", scene);
        metal.diffuseColor = new Color3(0.65, 0.65, 0.7);
        metal.specularColor = new Color3(0.7, 0.7, 0.7);

        stock.material = wood;
        riser.material = metal;
        limb.material = metal;
        bowString.material = metal;
        grip.material = wood;

        return stock;
    }
    onHit(mesh: AbstractMesh) {
        console.log("Shot with crossbow:", mesh.name);
        // Projectile logic would go here
    }
}

export class Axe extends Tool {
    constructor(scene: Scene, parent: Node, interaction?: InteractionSystem) {
        super(scene, parent, "Axe", interaction);
    }
    createMesh(scene: Scene): AbstractMesh {
        const haft = MeshBuilder.CreateCylinder("axe_handle", { height: 1.25, diameter: 0.08 }, scene);
        haft.rotation.x = Math.PI / 2;
        haft.position.z = 0.1;

        const head = MeshBuilder.CreateBox("axe_head", { width: 0.7, height: 0.4, depth: 0.12 }, scene);
        head.position.z = 0.55;
        head.parent = haft;

        const edge = MeshBuilder.CreateBox("axe_edge", { width: 0.7, height: 0.05, depth: 0.16 }, scene);
        edge.position.z = 0.72;
        edge.parent = haft;

        const haftMat = new StandardMaterial("axeHandleMat", scene);
        haftMat.diffuseColor = new Color3(0.48, 0.32, 0.18);
        const headMat = new StandardMaterial("axeHeadMat", scene);
        headMat.diffuseColor = new Color3(0.76, 0.8, 0.86);
        headMat.specularColor = new Color3(0.9, 0.9, 0.95);
        const edgeMat = new StandardMaterial("axeEdgeMat", scene);
        edgeMat.diffuseColor = new Color3(0.9, 0.9, 0.95);
        edgeMat.specularColor = new Color3(0.95, 0.95, 0.95);

        haft.material = haftMat;
        head.material = headMat;
        edge.material = edgeMat;

        return haft;
    }
    onHit(mesh: AbstractMesh) {
        console.log("Hit with axe:", mesh.name);
    }
}

export class Pickaxe extends Tool {
    constructor(scene: Scene, parent: Node, interaction?: InteractionSystem) {
        super(scene, parent, "Pickaxe", interaction);
    }
    createMesh(scene: Scene): AbstractMesh {
        const haft = MeshBuilder.CreateCylinder("pick_handle", { height: 1.25, diameter: 0.08 }, scene);
        haft.rotation.z = Math.PI / 2;

        const head = MeshBuilder.CreateBox("pick_head", { width: 0.95, height: 0.16, depth: 0.18 }, scene);
        head.position.x = 0.3;
        head.parent = haft;

        const spike = MeshBuilder.CreateBox("pick_spike", { width: 0.3, height: 0.12, depth: 0.18 }, scene);
        spike.position.x = -0.55;
        spike.parent = haft;

        const haftMat = new StandardMaterial("pickHandleMat", scene);
        haftMat.diffuseColor = new Color3(0.42, 0.28, 0.18);
        const headMat = new StandardMaterial("pickHeadMat", scene);
        headMat.diffuseColor = new Color3(0.68, 0.72, 0.78);
        headMat.specularColor = new Color3(0.8, 0.8, 0.85);

        haft.material = haftMat;
        head.material = headMat;
        spike.material = headMat;

        return haft;
    }
    onHit(mesh: AbstractMesh) {
        console.log("Hit with pickaxe:", mesh.name);
    }
}
