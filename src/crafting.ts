import { Scene } from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, Rectangle, ScrollViewer, StackPanel, TextBlock } from "@babylonjs/gui";
import { GameState } from "./state";

interface Recipe {
    name: string;
    description: string;
    cost: Record<string, number>;
    output: Record<string, number>;
}

const recipes: Recipe[] = [
    {
        name: "Planks",
        description: "2 Wood -> 4 Planks for building",
        cost: { Wood: 2 },
        output: { Plank: 4 },
    },
    {
        name: "Stone Blocks",
        description: "3 Stone -> 2 Stone Blocks",
        cost: { Stone: 3 },
        output: { "Stone Block": 2 },
    },
    {
        name: "Arrows",
        description: "1 Wood + 1 Stone -> 4 Arrows",
        cost: { Wood: 1, Stone: 1 },
        output: { Arrow: 4 },
    },
    {
        name: "Bandage",
        description: "2 Fiber -> 1 Bandage",
        cost: { Fiber: 2 },
        output: { Bandage: 1 },
    },
];

export function createCraftingUI(scene: Scene, state: GameState) {
    const ui = AdvancedDynamicTexture.CreateFullscreenUI("CraftingUI", true, scene);

    const panel = new Rectangle();
    panel.width = 0.35;
    panel.height = 0.55;
    panel.thickness = 2;
    panel.color = "#ffd54f";
    panel.background = "rgba(0,0,0,0.6)";
    panel.cornerRadius = 8;
    panel.isVisible = false;
    panel.horizontalAlignment = Rectangle.HORIZONTAL_ALIGNMENT_LEFT;
    panel.verticalAlignment = Rectangle.VERTICAL_ALIGNMENT_CENTER;
    ui.addControl(panel);

    const content = new StackPanel();
    content.paddingTop = "12px";
    content.spacing = 8;
    panel.addControl(content);

    const title = new TextBlock();
    title.text = "Crafting (C)";
    title.color = "white";
    title.fontSize = 20;
    title.height = "32px";
    content.addControl(title);

    const inventoryText = new TextBlock();
    inventoryText.color = "#c8ffb0";
    inventoryText.textWrapping = true;
    inventoryText.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_LEFT;
    inventoryText.paddingLeft = "4px";
    content.addControl(inventoryText);

    const scroll = new ScrollViewer();
    scroll.height = "320px";
    scroll.thickness = 0;
    scroll.barColor = "#ffd54f";
    content.addControl(scroll);

    const recipeList = new StackPanel();
    recipeList.spacing = 6;
    recipeList.paddingLeft = "4px";
    scroll.addControl(recipeList);

    const feedback = new TextBlock();
    feedback.color = "#ffd54f";
    feedback.height = "24px";
    content.addControl(feedback);

    const updateInventory = () => {
        const entries = state.getAllResources();
        if (!entries.length) {
            inventoryText.text = "Inventory: empty";
            return;
        }
        inventoryText.text =
            "Inventory:\n" + entries.map(([k, v]) => `- ${k}: ${v}`).join("\n");
    };

    const craft = (recipe: Recipe) => {
        const ok = state.spendResources(recipe.cost);
        if (!ok) {
            feedback.text = "Missing ingredients";
            feedback.color = "#ff9e80";
            return;
        }
        for (const [item, amount] of Object.entries(recipe.output)) {
            state.addResource(item, amount);
        }
        feedback.text = `${recipe.name} crafted!`;
        feedback.color = "#c8ffb0";
    };

    recipes.forEach((recipe) => {
        const card = new Rectangle();
        card.height = "92px";
        card.color = "#666";
        card.background = "rgba(255,255,255,0.02)";
        card.thickness = 1;
        card.cornerRadius = 6;

        const cardContent = new StackPanel();
        cardContent.paddingLeft = "8px";
        cardContent.paddingRight = "8px";
        cardContent.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_TOP;
        card.addControl(cardContent);

        const name = new TextBlock();
        name.text = recipe.name;
        name.color = "white";
        name.fontSize = 18;
        name.height = "24px";
        cardContent.addControl(name);

        const desc = new TextBlock();
        desc.text = recipe.description;
        desc.color = "#ddd";
        desc.fontSize = 14;
        desc.height = "20px";
        desc.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_LEFT;
        cardContent.addControl(desc);

        const cost = new TextBlock();
        cost.text = "Cost: " + Object.entries(recipe.cost).map(([k, v]) => `${v} ${k}`).join(", ");
        cost.color = "#ffd54f";
        cost.fontSize = 14;
        cost.height = "20px";
        cost.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_LEFT;
        cardContent.addControl(cost);

        const gain = new TextBlock();
        gain.text = "Gives: " + Object.entries(recipe.output).map(([k, v]) => `${v} ${k}`).join(", ");
        gain.color = "#c8ffb0";
        gain.fontSize = 14;
        gain.height = "20px";
        gain.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_LEFT;
        cardContent.addControl(gain);

        const button = Button.CreateSimpleButton("craft_" + recipe.name, "Craft");
        button.width = "90px";
        button.height = "28px";
        button.color = "#111";
        button.background = "#ffd54f";
        button.cornerRadius = 4;
        button.thickness = 0;
        button.onPointerUpObservable.add(() => craft(recipe));
        cardContent.addControl(button);

        recipeList.addControl(card);
    });

    updateInventory();
    state.onChange(updateInventory);

    scene.onKeyboardObservable.add((kbInfo) => {
        if (kbInfo.event.key.toLowerCase() === "c" && kbInfo.type === 1) {
            panel.isVisible = !panel.isVisible;
            if (panel.isVisible) updateInventory();
        }
    });
}
