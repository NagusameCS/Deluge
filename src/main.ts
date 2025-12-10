import "./style.css";
import { WebGPUEngine, Scene, Vector3, HemisphericLight, MeshBuilder, Engine, HavokPlugin, PhysicsAggregate, PhysicsShapeType } from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import { Player } from "./player";

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

async function createEngine() {
  const webGPUSupported = await WebGPUEngine.IsSupportedAsync;
  if (webGPUSupported) {
    const engine = new WebGPUEngine(canvas);
    await engine.initAsync();
    return engine;
  }
  return new Engine(canvas, true);
}

async function createScene(engine: Engine | WebGPUEngine) {
  const scene = new Scene(engine);

  // Initialize Physics
  const havokInstance = await HavokPhysics();
  const havokPlugin = new HavokPlugin(true, havokInstance);
  scene.enablePhysics(new Vector3(0, -9.81, 0), havokPlugin);

  new Player(scene, canvas);

  const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
  light.intensity = 0.7;

  const sphere = MeshBuilder.CreateSphere("sphere", { diameter: 2, segments: 32 }, scene);
  sphere.position.y = 4;

  // Add physics to sphere
  new PhysicsAggregate(sphere, PhysicsShapeType.SPHERE, { mass: 1, restitution: 0.75 }, scene);

  const ground = MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, scene);

  // Add physics to ground
  new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0 }, scene);

  // Add some trees
  for (let i = 0; i < 10; i++) {
    const tree = MeshBuilder.CreateCylinder("tree" + i, { height: 4, diameter: 1 }, scene);
    tree.position.x = Math.random() * 40 - 20;
    tree.position.z = Math.random() * 40 - 20;
    tree.position.y = 2;
    new PhysicsAggregate(tree, PhysicsShapeType.CYLINDER, { mass: 0 }, scene);
  }

  // Add some rocks
  for (let i = 0; i < 10; i++) {
    const rock = MeshBuilder.CreateBox("rock" + i, { size: 2 }, scene);
    rock.position.x = Math.random() * 40 - 20;
    rock.position.z = Math.random() * 40 - 20;
    rock.position.y = 1;
    new PhysicsAggregate(rock, PhysicsShapeType.BOX, { mass: 0 }, scene);
  }

  return scene;
}

async function init() {
  const engine = await createEngine();
  const scene = await createScene(engine);

  engine.runRenderLoop(() => {
    scene.render();
  });

  window.addEventListener("resize", () => {
    engine.resize();
  });
}

init();
