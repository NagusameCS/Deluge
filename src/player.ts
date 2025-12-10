import { Scene, Vector3, MeshBuilder, PhysicsAggregate, PhysicsShapeType, UniversalCamera, TransformNode, ActionManager, ExecuteCodeAction } from "@babylonjs/core";
import { Tool, Sword, Crossbow, Axe, Pickaxe } from "./tools";

export class Player {
    public mesh: TransformNode;
    public camera: UniversalCamera;
    public aggregate: PhysicsAggregate;
    private inputMap: Record<string, boolean> = {};
    private baseSpeed = 12;
    private sprintMultiplier = 1.5;
    private acceleration = 35;
    private damping = 6;

    private tools: Tool[] = [];
    private currentToolIndex: number = 0;
    private toolChanged?: (index: number, tool: Tool) => void;

    constructor(scene: Scene, canvas: HTMLCanvasElement) {
        // Player Mesh (Capsule)
        const playerMesh = MeshBuilder.CreateCapsule("player", { height: 2, radius: 0.5 }, scene);
        playerMesh.position.y = 10;
        playerMesh.isVisible = false;
        this.mesh = playerMesh;

        // Physics
        // Mass 80kg, Friction 0 (to avoid sticking to walls), Restitution 0 (no bounce)
        this.aggregate = new PhysicsAggregate(playerMesh, PhysicsShapeType.CAPSULE, { mass: 80, friction: 0, restitution: 0 }, scene);
        this.aggregate.body.setMassProperties({
            inertia: new Vector3(0, 0, 0) // Lock rotation so player doesn't tip over
        });

        // Camera
        this.camera = new UniversalCamera("playerCamera", new Vector3(0, 0.8, 0), scene);
        this.camera.parent = playerMesh;
        this.camera.attachControl(canvas, true);
        this.camera.minZ = 0.1;
        const mouseInput = this.camera.inputs.attached["mouse"] as any;
        if (mouseInput) mouseInput.angularSensibility = 1200; // snappier look

        // Remove default keyboard controls as we'll handle physics movement
        this.camera.inputs.removeByType("FreeCameraKeyboardMoveInput");

        // Initialize Tools
        this.tools.push(new Sword(scene, this.camera));
        this.tools.push(new Crossbow(scene, this.camera));
        this.tools.push(new Axe(scene, this.camera));
        this.tools.push(new Pickaxe(scene, this.camera));

        this.tools[this.currentToolIndex].activate();
        this.notifyToolChanged();

        // Input
        scene.actionManager = new ActionManager(scene);
        scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (evt) => {
            const key = evt.sourceEvent.key;
            if (["1", "2", "3", "4"].includes(key)) {
                this.switchTool(parseInt(key) - 1);
            }
            this.inputMap[key.toLowerCase()] = true;
        }));
        scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, (evt) => {
            this.inputMap[evt.sourceEvent.key.toLowerCase()] = false;
        }));

        // Mouse Input
        scene.onPointerDown = (evt) => {
            if (evt.button === 0) { // Left click
                // Lock pointer if not locked
                if (document.pointerLockElement !== canvas) {
                    canvas.requestPointerLock();
                } else {
                    this.tools[this.currentToolIndex].action();
                }
            }
        };

        // Update Loop
        scene.onBeforeRenderObservable.add(() => {
            this.update();
        });
    }

    public onToolChanged(cb: (index: number, tool: Tool) => void) {
        this.toolChanged = cb;
    }

    private notifyToolChanged() {
        if (this.toolChanged) this.toolChanged(this.currentToolIndex, this.tools[this.currentToolIndex]);
    }

    private switchTool(index: number) {
        if (index >= 0 && index < this.tools.length) {
            this.tools[this.currentToolIndex].deactivate();
            this.currentToolIndex = index;
            this.tools[this.currentToolIndex].activate();
            this.notifyToolChanged();
        }
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
        const blend = Math.min(1, this.acceleration * delta);
        const newVel = Vector3.Lerp(currentVel, targetVel, blend);

        // Damping to reduce slide when no input
        if (moveDir.lengthSquared() === 0) {
            const damp = Math.max(0, 1 - this.damping * delta);
            newVel.x *= damp;
            newVel.z *= damp;
        }

        // Simple Jump
        if (this.inputMap[" "] && Math.abs(currentVel.y) < 0.2) {
            newVel.y = 6.5;
        }

        this.aggregate.body.setLinearVelocity(newVel);
    }
}
