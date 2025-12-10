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
import { InteractionSystem } from "./interaction";
import { Slider } from "@babylonjs/gui";

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

  const interaction = new InteractionSystem();
  const player = new Player(scene, canvas, interaction);

  const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
  light.intensity = 0.7;

  createTerrain(scene);
  scatterProps(scene, interaction);
  createHotbar(scene, player);
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

function createTerrain(scene: Scene) {
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

  const grassTex = new Texture("https://assets.babylonjs.com/environments/grass.jpg", scene);
  grassTex.uScale = grassTex.vScale = 8;
  const groundMat = new StandardMaterial("groundMat", scene);
  groundMat.diffuseTexture = grassTex;
  groundMat.specularColor = Color3.Black();
  groundMat.emissiveColor = new Color3(0.015, 0.04, 0.015);
  ground.material = groundMat;

  new PhysicsAggregate(ground, PhysicsShapeType.MESH, { mass: 0, restitution: 0.0, friction: 1.0 }, scene);
}

function scatterProps(scene: Scene, interaction: InteractionSystem) {
  const treeMat = new StandardMaterial("treeMat", scene);
  treeMat.diffuseTexture = new Texture("https://assets.babylonjs.com/environments/wood.jpg", scene);
  treeMat.specularColor = Color3.Black();

  const leafMat = new StandardMaterial("leafMat", scene);
  leafMat.diffuseColor = new Color3(0.2, 0.55, 0.25);
  leafMat.specularColor = new Color3(0.02, 0.05, 0.02);
  leafMat.emissiveColor = new Color3(0.02, 0.05, 0.02);
  leafMat.alpha = 0.95;
  leafMat.diffuseTexture = new Texture("https://assets.babylonjs.com/environments/leaf.jpg", scene);

  const rockMat = new StandardMaterial("rockMat", scene);
  rockMat.diffuseTexture = new Texture("https://assets.babylonjs.com/environments/rock.jpg", scene);
  rockMat.specularColor = new Color3(0.1, 0.1, 0.1);
  rockMat.emissiveColor = new Color3(0.01, 0.01, 0.01);
  rockMat.useParallax = true;
  rockMat.useParallaxOcclusion = true;
  rockMat.parallaxScaleBias = 0.02;

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
    interaction.register(tree, "tree", 60);
    interaction.register(leaves, "tree", 30);
  }

  for (let i = 0; i < 60; i++) {
    const rock = MeshBuilder.CreatePolyhedron("rock" + i, { type: 4, size: 1.6 }, scene);
    rock.position.x = Math.random() * 180 - 90;
    rock.position.z = Math.random() * 180 - 90;
    rock.position.y = 1;
    rock.material = rockMat;
    new PhysicsAggregate(rock, PhysicsShapeType.MESH, { mass: 0 }, scene);
    interaction.register(rock, "rock", 80);
  }
}

// Skybox removed per request

// --- UI ---
function createHotbar(scene: Scene, player: Player) {
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
