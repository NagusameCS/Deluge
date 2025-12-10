import { Scene } from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, Rectangle, StackPanel, TextBlock } from "@babylonjs/gui";
import type { DamageCategory } from "./state";
import { GameState } from "./state";

interface Upgrade {
    id: string;
    name: string;
    description: string;
    cost: number;
    bonus: { category: DamageCategory; amount: number };
}

const upgrades: Upgrade[] = [
    {
        id: "gather_i",
        name: "Lumberjack",
        description: "+6 damage vs wood",
        cost: 1,
        bonus: { category: "wood", amount: 6 },
    },
    {
        id: "miner_i",
        name: "Miner",
        description: "+6 damage vs stone",
        cost: 1,
        bonus: { category: "stone", amount: 6 },
    },
    {
        id: "hunter_i",
        name: "Hunter",
        description: "+6 damage vs mobs",
        cost: 1,
        bonus: { category: "mob", amount: 6 },
    },
    {
        id: "tamer_i",
        name: "Tamer",
        description: "+4 damage vs animals",
        cost: 1,
        bonus: { category: "animal", amount: 4 },
    },
];

export function createSkillUI(scene: Scene, state: GameState) {
    const ui = AdvancedDynamicTexture.CreateFullscreenUI("SkillUI", true, scene);

    const panel = new Rectangle();
    panel.width = 0.26;
    panel.height = 0.42;
    panel.thickness = 2;
    panel.color = "#80deea";
    panel.background = "rgba(0,0,0,0.55)";
    panel.cornerRadius = 8;
    panel.isVisible = false;
    panel.horizontalAlignment = Rectangle.HORIZONTAL_ALIGNMENT_RIGHT;
    panel.verticalAlignment = Rectangle.VERTICAL_ALIGNMENT_CENTER;
    ui.addControl(panel);

    const content = new StackPanel();
    content.paddingTop = "12px";
    content.spacing = 6;
    panel.addControl(content);

    const title = new TextBlock();
    title.text = "Upgrades (U)";
    title.color = "white";
    title.fontSize = 20;
    title.height = "28px";
    content.addControl(title);

    const skillText = new TextBlock();
    skillText.color = "#c8ffb0";
    skillText.height = "24px";
    content.addControl(skillText);

    const feedback = new TextBlock();
    feedback.color = "#ffd54f";
    feedback.height = "24px";
    content.addControl(feedback);

    const update = () => {
        skillText.text = `Skill Points: ${state.getSkillPoints()}`;
    };

    const purchase = (upgrade: Upgrade) => {
        if (!state.spendSkillPoints(upgrade.cost)) {
            feedback.text = "Need more skill points";
            feedback.color = "#ff9e80";
            return;
        }
        state.addDamageBonus(upgrade.bonus.category, upgrade.bonus.amount);
        feedback.text = `${upgrade.name} acquired!`;
        feedback.color = "#c8ffb0";
    };

    upgrades.forEach((upgrade) => {
        const card = new Rectangle();
        card.height = "80px";
        card.color = "#666";
        card.background = "rgba(255,255,255,0.04)";
        card.thickness = 1;
        card.cornerRadius = 6;

        const cardContent = new StackPanel();
        cardContent.paddingLeft = "8px";
        cardContent.paddingRight = "8px";
        cardContent.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_TOP;
        card.addControl(cardContent);

        const name = new TextBlock();
        name.text = `${upgrade.name} (${upgrade.cost}pt)`;
        name.color = "white";
        name.fontSize = 18;
        name.height = "24px";
        cardContent.addControl(name);

        const desc = new TextBlock();
        desc.text = upgrade.description;
        desc.color = "#ddd";
        desc.fontSize = 14;
        desc.height = "20px";
        desc.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_LEFT;
        cardContent.addControl(desc);

        const button = Button.CreateSimpleButton("upgrade_" + upgrade.id, "Upgrade");
        button.width = "90px";
        button.height = "24px";
        button.color = "#111";
        button.background = "#80deea";
        button.cornerRadius = 4;
        button.thickness = 0;
        button.onPointerUpObservable.add(() => purchase(upgrade));
        cardContent.addControl(button);

        content.addControl(card);
    });

    update();
    state.onChange(update);

    scene.onKeyboardObservable.add((kbInfo) => {
        if (kbInfo.event.key.toLowerCase() === "u" && kbInfo.type === 1) {
            panel.isVisible = !panel.isVisible;
            if (panel.isVisible) update();
        }
    });
}
