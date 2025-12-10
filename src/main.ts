import "./style.css";
import {
  WebGPUEngine,
  Scene,
  Vector3,
  HemisphericLight,
  MeshBuilder,
  Engine,
  HavokPlugin,
  PhysicsAggregate,
  PhysicsShapeType,
  StandardMaterial,
  Texture,
  Color3,
  VertexData,
  VertexBuffer,
} from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import havokWasmUrl from "../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm?url";
import { AdvancedDynamicTexture, StackPanel, Rectangle, TextBlock } from "@babylonjs/gui";
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

  const havokInstance = await HavokPhysics({ locateFile: () => havokWasmUrl });
  const havokPlugin = new HavokPlugin(true, havokInstance);
  scene.enablePhysics(new Vector3(0, -9.81, 0), havokPlugin);

  const player = new Player(scene, canvas);

  const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
  light.intensity = 0.7;

  createTerrain(scene);
  scatterProps(scene);
  createHotbar(scene, player);

  return scene;
}

// --- Terrain generation ---
function noise2D(x: number, z: number, seed = 1337) {
  const n = Math.sin(x * 12.9898 + z * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

function fbm(x: number, z: number) {
  let total = 0;
  let amplitude = 1;
  let frequency = 0.06;
  for (let i = 0; i < 5; i++) {
    total += noise2D(x * frequency, z * frequency) * amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return total;
}

function createTerrain(scene: Scene) {
  const size = 200;
  const subdivisions = 120;
  const ground = MeshBuilder.CreateGround("ground", { width: size, height: size, subdivisions }, scene);

  const positions = ground.getVerticesData("position")!;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const z = positions[i + 2];
    const h = fbm(x, z) * 8 - 3;
    positions[i + 1] = h;
  }
  ground.updateVerticesData(VertexBuffer.PositionKind, positions);
  VertexData.ComputeNormals(positions, ground.getIndices()!, ground.getVerticesData(VertexBuffer.NormalKind)!);

  const grassTex = new Texture("https://assets.babylonjs.com/environments/grass.jpg", scene);
  grassTex.uScale = grassTex.vScale = 6;
  const groundMat = new StandardMaterial("groundMat", scene);
  groundMat.diffuseTexture = grassTex;
  groundMat.specularColor = Color3.Black();
  ground.material = groundMat;

  new PhysicsAggregate(ground, PhysicsShapeType.MESH, { mass: 0, restitution: 0.1, friction: 0.8 }, scene);
}

function scatterProps(scene: Scene) {
  const treeMat = new StandardMaterial("treeMat", scene);
  treeMat.diffuseTexture = new Texture("https://assets.babylonjs.com/environments/wood.jpg", scene);
  treeMat.specularColor = Color3.Black();

  const leafMat = new StandardMaterial("leafMat", scene);
  leafMat.diffuseColor = new Color3(0.2, 0.5, 0.2);
  leafMat.specularColor = Color3.Black();

  const rockMat = new StandardMaterial("rockMat", scene);
  rockMat.diffuseTexture = new Texture("https://assets.babylonjs.com/environments/rock.jpg", scene);
  rockMat.specularColor = Color3.Black();

  for (let i = 0; i < 50; i++) {
    const tree = MeshBuilder.CreateCylinder("tree" + i, { height: 5, diameter: 0.8 }, scene);
    tree.position.x = Math.random() * 180 - 90;
    tree.position.z = Math.random() * 180 - 90;
    tree.position.y = 2.5;
    tree.material = treeMat;

    const leaves = MeshBuilder.CreateSphere("leaves" + i, { diameter: 3 }, scene);
    leaves.position = tree.position.add(new Vector3(0, 3, 0));
    leaves.material = leafMat;

    new PhysicsAggregate(tree, PhysicsShapeType.CYLINDER, { mass: 0 }, scene);
    new PhysicsAggregate(leaves, PhysicsShapeType.SPHERE, { mass: 0 }, scene);
  }

  for (let i = 0; i < 60; i++) {
    const rock = MeshBuilder.CreatePolyhedron("rock" + i, { type: 4, size: 1.6 }, scene);
    rock.position.x = Math.random() * 180 - 90;
    rock.position.z = Math.random() * 180 - 90;
    rock.position.y = 1;
    rock.material = rockMat;
    new PhysicsAggregate(rock, PhysicsShapeType.MESH, { mass: 0 }, scene);
  }
}

// --- UI ---
function createHotbar(scene: Scene, player: Player) {
  const ui = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
  const panel = new StackPanel();
  panel.isVertical = false;
  panel.height = "80px";
  panel.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_BOTTOM;
  panel.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_CENTER;
  panel.spacing = 8;
  ui.addControl(panel);

  const toolNames = ["Sword", "Crossbow", "Axe", "Pickaxe"];
  const slots: Rectangle[] = [];

  toolNames.forEach((name, idx) => {
    const slot = new Rectangle();
    slot.width = "80px";
    slot.height = "70px";
    slot.color = "#888";
    slot.thickness = 2;
    slot.cornerRadius = 6;
    slot.background = "rgba(0,0,0,0.45)";

    const label = new TextBlock();
    label.text = `${idx + 1}. ${name}`;
    label.color = "white";
    label.fontSize = 16;
    label.paddingTop = 6;

    slot.addControl(label);
    panel.addControl(slot);
    slots.push(slot);
  });

  const updateHighlight = (index: number) => {
    slots.forEach((slot, i) => {
      slot.color = i === index ? "#ffd54f" : "#888";
      slot.thickness = i === index ? 3 : 2;
      slot.background = i === index ? "rgba(255, 213, 79, 0.25)" : "rgba(0,0,0,0.45)";
    });
  };

  updateHighlight(0);
  player.onToolChanged((index) => updateHighlight(index));
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
