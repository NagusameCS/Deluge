import { Scene, Vector3, MeshBuilder, PhysicsAggregate, PhysicsShapeType, UniversalCamera, TransformNode, ActionManager, ExecuteCodeAction, Ray, StandardMaterial, Color3, Matrix } from "@babylonjs/core";
import { InteractionSystem } from "./interaction";

export class Player {
    public mesh: TransformNode;
    public camera: UniversalCamera;
    public aggregate: PhysicsAggregate;
    private inputMap: Record<string, boolean> = {};
    private baseSpeed = 12;
    private sprintMultiplier = 1.5;
    private acceleration = 40;
    private damping = 8;
    private jumpStrength = 6.5;

    private mouseInput: any;
    private fireCooldown = 0;
    private fireRate = 0.18;
    private bulletDamage = 24;
    private interaction: InteractionSystem;

    constructor(scene: Scene, canvas: HTMLCanvasElement, interaction: InteractionSystem) {
        // Player Mesh (Capsule)
        const playerMesh = MeshBuilder.CreateCapsule("player", { height: 2, radius: 0.5 }, scene);
        playerMesh.position.y = 10;
        playerMesh.isVisible = false;
        this.mesh = playerMesh;

        // Physics
        // Mass 80kg, Friction 0 (to avoid sticking to walls), Restitution 0 (no bounce)
        this.aggregate = new PhysicsAggregate(playerMesh, PhysicsShapeType.CAPSULE, { mass: 80, friction: 0.6, restitution: 0 }, scene);
        this.aggregate.body.setMassProperties({
            inertia: new Vector3(0, 0, 0) // Lock rotation so player doesn't tip over
        });
        this.aggregate.body.setLinearDamping(0.3);
        this.aggregate.body.setAngularDamping(1);

        // Camera
        this.camera = new UniversalCamera("playerCamera", new Vector3(0, 0.8, 0), scene);
        this.camera.parent = playerMesh;
        this.camera.attachControl(canvas, true);
        this.camera.minZ = 0.1;
        this.mouseInput = this.camera.inputs.attached["mouse"] as any;
        if (this.mouseInput) this.mouseInput.angularSensibility = 1200; // snappier look

        // Remove default keyboard controls as we'll handle physics movement
        this.camera.inputs.removeByType("FreeCameraKeyboardMoveInput");

        this.interaction = interaction;
        this.createGun(scene);

        // Input
        scene.actionManager = new ActionManager(scene);
        scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (evt) => {
            const key = evt.sourceEvent.key;
            this.inputMap[key.toLowerCase()] = true;
        }));
        scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, (evt) => {
            this.inputMap[evt.sourceEvent.key.toLowerCase()] = false;
        }));

        // Mouse Input
        scene.onPointerDown = (evt) => {
            if (evt.button === 0) { // Left click
                if (document.pointerLockElement !== canvas) {
                    canvas.requestPointerLock();
                } else {
                    this.tryShoot();
                }
            }
        };

        // Update Loop
        scene.onBeforeRenderObservable.add(() => {
            this.update();
        });
    }

    public setMouseSensitivity(value: number) {
        if (this.mouseInput) this.mouseInput.angularSensibility = value;
    }

    public setFov(value: number) {
        this.camera.fov = value;
    }

    public setMovementSettings(baseSpeed: number, sprintMultiplier: number, damping: number) {
        this.baseSpeed = baseSpeed;
        this.sprintMultiplier = sprintMultiplier;
        this.damping = damping;
    }

    public setJumpStrength(value: number) {
        this.jumpStrength = value;
    }

    private update() {
        const forward = this.camera.getDirection(Vector3.Forward());
        const right = this.camera.getDirection(Vector3.Right());

        // Flatten vectors to XZ plane
        forward.y = 0;
        right.y = 0;
        forward.normalize();
        right.normalize();

        let moveDir = Vector3.Zero();

        if (this.inputMap["w"]) moveDir.addInPlace(forward);
        if (this.inputMap["s"]) moveDir.subtractInPlace(forward);
        if (this.inputMap["d"]) moveDir.addInPlace(right);
        if (this.inputMap["a"]) moveDir.subtractInPlace(right);

        moveDir.normalize();

        const currentVel = this.aggregate.body.getLinearVelocity();

        // Movement speed with sprint
        const targetSpeed = this.baseSpeed * (this.inputMap["shift"] ? this.sprintMultiplier : 1);
        const targetVel = moveDir.scale(targetSpeed);
        targetVel.y = currentVel.y;

        // Smooth acceleration
        const delta = this.mesh.getScene().getEngine().getDeltaTime() / 1000;
        this.fireCooldown = Math.max(0, this.fireCooldown - delta);
        const blend = Math.min(1, this.acceleration * delta);
        const newVel = Vector3.Lerp(currentVel, targetVel, blend);

        // Damping to reduce slide when no input
        if (moveDir.lengthSquared() === 0) {
            const damp = Math.max(0, 1 - this.damping * delta);
            newVel.x *= damp;
            newVel.z *= damp;
        }

        const grounded = this.isGrounded();

        // Simple Jump
        if (this.inputMap[" "] && grounded && Math.abs(currentVel.y) < 0.4) {
            newVel.y = this.jumpStrength;
        }

        // Clamp micro-bounce when grounded
        if (grounded && newVel.y > 0 && !this.inputMap[" "]) {
            newVel.y = 0;
        }

        // Keep head steady when grounded
        if (grounded && !this.inputMap[" "]) {
            newVel.y = 0;
        }

        this.aggregate.body.setLinearVelocity(newVel);
    }

    private isGrounded(): boolean {
        const origin = this.mesh.getAbsolutePosition().clone();
        const ray = new Ray(origin, new Vector3(0, -1, 0), 1.2);
        const hit = this.mesh.getScene().pickWithRay(ray, (m) => m.name.startsWith("ground"));
        return !!(hit && hit.hit && hit.distance <= 1.1);
    }

    private createGun(scene: Scene) {
        const body = MeshBuilder.CreateBox("gunBody", { width: 0.3, height: 0.18, depth: 0.6 }, scene);
        body.position = new Vector3(0.5, -0.4, 1);
        body.parent = this.camera;
        const barrel = MeshBuilder.CreateBox("gunBarrel", { width: 0.12, height: 0.12, depth: 0.6 }, scene);
        barrel.position = new Vector3(0.45, -0.32, 1.5);
        barrel.parent = this.camera;

        const mat = new StandardMaterial("gunMat", scene);
        mat.diffuseColor = new Color3(0.15, 0.18, 0.22);
        mat.specularColor = new Color3(0.25, 0.25, 0.25);
        body.material = mat;
        barrel.material = mat;
    }

    private tryShoot() {
        if (this.fireCooldown > 0) return;
        this.fireCooldown = this.fireRate;
        const scene = this.mesh.getScene();
        const ray = scene.createPickingRay(
            scene.getEngine().getRenderWidth() / 2,
            scene.getEngine().getRenderHeight() / 2,
            Matrix.Identity(),
            this.camera
        );
        const hit = scene.pickWithRay(ray, (m) => !!m && m !== this.mesh);
        if (hit && hit.pickedMesh) {
            this.interaction.handleHit(hit.pickedMesh, this.bulletDamage);
        }
    }
}
