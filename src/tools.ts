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
                this.interaction.handleHit(hit.pickedMesh, this.type);
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
        const blade = MeshBuilder.CreateBox("sword_blade", { width: 0.08, height: 0.2, depth: 1.4 }, scene);
        blade.position.z = 0.5;
        const hilt = MeshBuilder.CreateBox("sword_hilt", { width: 0.3, height: 0.08, depth: 0.2 }, scene);
        hilt.position.z = -0.15;
        hilt.position.y = -0.1;

        const handle = MeshBuilder.CreateCylinder("sword_handle", { height: 0.4, diameter: 0.08 }, scene);
        handle.rotation.x = Math.PI / 2;
        handle.position.z = -0.35;
        handle.position.y = -0.1;

        hilt.parent = blade;
        handle.parent = blade;

        const bladeMat = new StandardMaterial("bladeMat", scene);
        bladeMat.diffuseColor = new Color3(0.85, 0.85, 0.9);
        const hiltMat = new StandardMaterial("hiltMat", scene);
        hiltMat.diffuseColor = new Color3(0.4, 0.25, 0.1);

        blade.material = bladeMat;
        hilt.material = hiltMat;
        handle.material = hiltMat;

        return blade;
    }
    onHit(mesh: AbstractMesh) {
        console.log("Hit with sword:", mesh.name);
        if (mesh.name.includes("enemy")) {
            mesh.dispose();
        }
    }
}

export class Crossbow extends Tool {
    constructor(scene: Scene, parent: Node, interaction?: InteractionSystem) {
        super(scene, parent, "Crossbow", interaction);
    }
    createMesh(scene: Scene): AbstractMesh {
        const body = MeshBuilder.CreateBox("crossbow_body", { width: 0.5, height: 0.12, depth: 0.6 }, scene);
        const bow = MeshBuilder.CreateCylinder("crossbow_bow", { height: 0.7, diameter: 0.08 }, scene);
        bow.rotation.z = Math.PI / 2;
        bow.position.z = 0.2;
        bow.parent = body;

        const limbLeft = MeshBuilder.CreateBox("crossbow_limb_left", { width: 0.06, height: 0.08, depth: 0.4 }, scene);
        limbLeft.position.x = -0.28;
        limbLeft.position.z = 0.2;
        limbLeft.parent = body;
        const limbRight = limbLeft.clone("crossbow_limb_right")!;
        limbRight.position.x = 0.28;

        const mat = new StandardMaterial("crossbowMat", scene);
        mat.diffuseColor = new Color3(0.35, 0.2, 0.1);
        body.material = mat;
        bow.material = mat;
        limbLeft.material = mat;
        limbRight.material = mat;

        return body;
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
        const handle = MeshBuilder.CreateCylinder("axe_handle", { height: 1.2, diameter: 0.08 }, scene);
        handle.rotation.x = Math.PI / 2;
        handle.position.z = 0.1;

        const head = MeshBuilder.CreateBox("axe_head", { width: 0.6, height: 0.35, depth: 0.12 }, scene);
        head.position.z = 0.45;
        head.parent = handle;

        const handleMat = new StandardMaterial("axeHandleMat", scene);
        handleMat.diffuseColor = new Color3(0.5, 0.35, 0.2);
        const headMat = new StandardMaterial("axeHeadMat", scene);
        headMat.diffuseColor = new Color3(0.7, 0.75, 0.8);
        headMat.specularColor = new Color3(0.8, 0.8, 0.9);

        handle.material = handleMat;
        head.material = headMat;

        return handle;
    }
    onHit(mesh: AbstractMesh) {
        console.log("Hit with axe:", mesh.name);
        if (mesh.name.includes("tree")) {
            mesh.dispose();
        }
    }
}

export class Pickaxe extends Tool {
    constructor(scene: Scene, parent: Node, interaction?: InteractionSystem) {
        super(scene, parent, "Pickaxe", interaction);
    }
    createMesh(scene: Scene): AbstractMesh {
        const handle = MeshBuilder.CreateCylinder("pick_handle", { height: 1.2, diameter: 0.08 }, scene);
        handle.rotation.z = Math.PI / 2;

        const head = MeshBuilder.CreateBox("pick_head", { width: 0.8, height: 0.15, depth: 0.2 }, scene);
        head.position.x = 0.3;
        head.parent = handle;

        const spike = MeshBuilder.CreateBox("pick_spike", { width: 0.3, height: 0.12, depth: 0.18 }, scene);
        spike.position.x = -0.55;
        spike.parent = handle;

        const handleMat = new StandardMaterial("pickHandleMat", scene);
        handleMat.diffuseColor = new Color3(0.45, 0.3, 0.18);
        const headMat = new StandardMaterial("pickHeadMat", scene);
        headMat.diffuseColor = new Color3(0.65, 0.7, 0.75);

        handle.material = handleMat;
        head.material = headMat;
        spike.material = headMat;

        return handle;
    }
    onHit(mesh: AbstractMesh) {
        console.log("Hit with pickaxe:", mesh.name);
        if (mesh.name.includes("rock")) {
            mesh.dispose();
        }
    }
}
