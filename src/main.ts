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
  DynamicTexture,
  Color3,
  VertexData,
  VertexBuffer,
} from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import havokWasmUrl from "../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm?url";
import { AdvancedDynamicTexture, StackPanel, Rectangle, TextBlock } from "@babylonjs/gui";
import { Player } from "./player";
import { InteractionSystem } from "./interaction";
import { Slider } from "@babylonjs/gui";
import { spawnCreatures } from "./mobs";
import { GameState } from "./state";
import { createCraftingUI } from "./crafting";
import { createSkillUI } from "./skills";

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

  const state = new GameState();
  const interaction = new InteractionSystem(state);
  const textures = createLocalTextures(scene);
  const player = new Player(scene, canvas, interaction);

  const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
  light.intensity = 0.7;

  const terrainSize = createTerrain(scene, textures);
  scatterProps(scene, interaction, terrainSize, textures);
  spawnCreatures(scene, interaction, terrainSize);
  createCraftingUI(scene, state);
  createSkillUI(scene, state);
  createHotbar(scene);
  createSettings(scene, player);

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
  let frequency = 0.03;
  for (let i = 0; i < 6; i++) {
    total += noise2D(x * frequency, z * frequency) * amplitude;
    amplitude *= 0.48;
    frequency *= 1.9;
  }
  return total;
}

function mixColor(a: Color3, b: Color3, t: number) {
  return new Color3(
    a.r * t + b.r * (1 - t),
    a.g * t + b.g * (1 - t),
    a.b * t + b.b * (1 - t)
  );
}

function makeNoiseTexture(scene: Scene, size: number, c1: Color3, c2: Color3, seed: number, scale = 4) {
  const tex = new DynamicTexture("noise" + seed, { width: size, height: size }, scene, false);
  const ctx = tex.getContext();
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  const hash = (x: number, y: number) => {
    return Math.abs(Math.sin(x * 12.9898 + y * 78.233 + seed) % 1);
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x / size) * scale;
      const ny = (y / size) * scale;
      const n = hash(nx, ny) * 0.6 + hash(nx * 2.1, ny * 2.1) * 0.3 + hash(nx * 4.3, ny * 4.3) * 0.1;
      const c = mixColor(c1, c2, n);
      const idx = (y * size + x) * 4;
      data[idx] = Math.floor(c.r * 255);
      data[idx + 1] = Math.floor(c.g * 255);
      data[idx + 2] = Math.floor(c.b * 255);
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  tex.update(false);
  return tex;
}

function createLocalTextures(scene: Scene) {
  return {
    grass: makeNoiseTexture(scene, 512, new Color3(0.18, 0.32, 0.14), new Color3(0.08, 0.18, 0.07), 11, 6),
    rock: makeNoiseTexture(scene, 512, new Color3(0.35, 0.35, 0.36), new Color3(0.18, 0.18, 0.2), 23, 5),
    bark: makeNoiseTexture(scene, 512, new Color3(0.35, 0.24, 0.14), new Color3(0.22, 0.15, 0.1), 31, 10),
    leaves: makeNoiseTexture(scene, 512, new Color3(0.18, 0.5, 0.2), new Color3(0.08, 0.3, 0.12), 41, 8),
  };
}

function createTerrain(scene: Scene, textures: ReturnType<typeof createLocalTextures>) {
  const size = 320;
  const subdivisions = 180;
  const ground = MeshBuilder.CreateGround("ground", { width: size, height: size, subdivisions }, scene);

  const positions = ground.getVerticesData("position")!;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const z = positions[i + 2];
    const h = fbm(x, z) * 14 - 5; // rolling hills
    positions[i + 1] = h;
  }
  ground.updateVerticesData(VertexBuffer.PositionKind, positions);
  VertexData.ComputeNormals(positions, ground.getIndices()!, ground.getVerticesData(VertexBuffer.NormalKind)!);

  const groundMat = new StandardMaterial("groundMat", scene);
  const gTex = textures.grass;
  gTex.uScale = gTex.vScale = 10;
  groundMat.diffuseTexture = gTex;
  groundMat.specularColor = new Color3(0.08, 0.08, 0.08);
  groundMat.emissiveColor = new Color3(0.02, 0.05, 0.02);
  ground.material = groundMat;

  new PhysicsAggregate(ground, PhysicsShapeType.MESH, { mass: 0, restitution: 0.0, friction: 1.0 }, scene);
  return size;
}

function scatterProps(scene: Scene, interaction: InteractionSystem, size: number, textures: ReturnType<typeof createLocalTextures>) {
  const treeMat = new StandardMaterial("treeMat", scene);
  const barkTex = textures.bark;
  barkTex.uScale = barkTex.vScale = 2;
  treeMat.diffuseTexture = barkTex;
  treeMat.specularColor = Color3.Black();

  const leafMat = new StandardMaterial("leafMat", scene);
  leafMat.diffuseColor = new Color3(0.2, 0.55, 0.25);
  leafMat.specularColor = new Color3(0.02, 0.05, 0.02);
  leafMat.emissiveColor = new Color3(0.02, 0.05, 0.02);
  leafMat.alpha = 0.95;
  const leafTex = textures.leaves;
  leafTex.uScale = leafTex.vScale = 2.5;
  leafMat.diffuseTexture = leafTex;

  const rockMat = new StandardMaterial("rockMat", scene);
  const rockTex = textures.rock;
  rockTex.uScale = rockTex.vScale = 3;
  rockMat.diffuseTexture = rockTex;
  rockMat.specularColor = new Color3(0.15, 0.15, 0.15);
  rockMat.emissiveColor = new Color3(0.01, 0.01, 0.01);
  const spread = size / 2 - 20;

  for (let i = 0; i < 50; i++) {
    const tree = MeshBuilder.CreateCylinder("tree" + i, { height: 5, diameter: 0.8 }, scene);
    tree.position.x = Math.random() * spread * 2 - spread;
    tree.position.z = Math.random() * spread * 2 - spread;
    tree.position.y = 2.5;
    tree.material = treeMat;

    const leaves = MeshBuilder.CreateSphere("leaves" + i, { diameter: 3 }, scene);
    leaves.position = tree.position.add(new Vector3(0, 3, 0));
    leaves.material = leafMat;

    new PhysicsAggregate(tree, PhysicsShapeType.CYLINDER, { mass: 0 }, scene);
    new PhysicsAggregate(leaves, PhysicsShapeType.SPHERE, { mass: 0 }, scene);
    interaction.register(tree, { kind: "resource", resourceType: "wood", hp: 60, reward: { Wood: 3, Fiber: 1 }, skillPoints: 1 });
    interaction.register(leaves, { kind: "resource", resourceType: "wood", hp: 30, reward: { Wood: 1, Fiber: 1 }, skillPoints: 1 });
  }

  for (let i = 0; i < 60; i++) {
    const rock = MeshBuilder.CreatePolyhedron("rock" + i, { type: 4, size: 1.6 }, scene);
    rock.position.x = Math.random() * spread * 2 - spread;
    rock.position.z = Math.random() * spread * 2 - spread;
    rock.position.y = 1;
    rock.material = rockMat;
    new PhysicsAggregate(rock, PhysicsShapeType.MESH, { mass: 0 }, scene);
    interaction.register(rock, { kind: "resource", resourceType: "stone", hp: 80, reward: { Stone: 3 }, skillPoints: 1 });
  }
}

// Skybox removed per request

// --- UI ---
function createHotbar(scene: Scene) {
  const ui = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);

  const crosshair = new Rectangle();
  crosshair.width = "16px";
  crosshair.height = "16px";
  crosshair.thickness = 2;
  crosshair.color = "#ffd54f";
  crosshair.background = "rgba(0,0,0,0.15)";
  crosshair.cornerRadius = 3;
  crosshair.horizontalAlignment = Rectangle.HORIZONTAL_ALIGNMENT_CENTER;
  crosshair.verticalAlignment = Rectangle.VERTICAL_ALIGNMENT_CENTER;
  ui.addControl(crosshair);
}

function createSettings(scene: Scene, player: Player) {
  const ui = AdvancedDynamicTexture.CreateFullscreenUI("SettingsUI", true, scene);

  const panel = new StackPanel();
  panel.width = "320px";
  panel.isVertical = true;
  panel.spacing = 8;
  panel.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_RIGHT;
  panel.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_TOP;
  panel.paddingTop = "12px";
  panel.paddingRight = "12px";
  panel.background = "rgba(0,0,0,0.35)";
  panel.isVisible = false;
  ui.addControl(panel);

  const title = new TextBlock();
  title.text = "Settings";
  title.color = "white";
  title.fontSize = 18;
  title.height = "28px";
  panel.addControl(title);

  const addSlider = (labelText: string, min: number, max: number, value: number, onChange: (v: number) => void) => {
    const label = new TextBlock();
    label.text = `${labelText}: ${value.toFixed(1)}`;
    label.color = "white";
    label.height = "24px";
    panel.addControl(label);

    const slider = new Slider();
    slider.minimum = min;
    slider.maximum = max;
    slider.value = value;
    slider.height = "14px";
    slider.color = "#ffd54f";
    slider.background = "#555";
    slider.borderColor = "#222";
    slider.onValueChangedObservable.add((v) => {
      label.text = `${labelText}: ${v.toFixed(1)}`;
      onChange(v);
    });
    panel.addControl(slider);
  };

  addSlider("Mouse Sens", 400, 2000, 1200, (v) => player.setMouseSensitivity(v));
  addSlider("FOV", 0.8, 1.4, player.camera.fov, (v) => player.setFov(v));

  let moveSpeed = 12;
  let dampingVal = 8;
  addSlider("Move Speed", 6, 18, moveSpeed, (v) => {
    moveSpeed = v;
    player.setMovementSettings(moveSpeed, 1.5, dampingVal);
  });
  addSlider("Damping", 2, 14, dampingVal, (v) => {
    dampingVal = v;
    player.setMovementSettings(moveSpeed, 1.5, dampingVal);
  });
  addSlider("Jump", 4, 9, 6.5, (v) => player.setJumpStrength(v));

  // Toggle visibility with "O"
  scene.onKeyboardObservable.add((kbInfo) => {
    if (kbInfo.event.key.toLowerCase() === "o" && kbInfo.type === 1) {
      panel.isVisible = !panel.isVisible;
    }
  });
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
