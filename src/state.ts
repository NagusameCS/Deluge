export type DamageCategory = "wood" | "stone" | "mob" | "animal" | "generic";

export class GameState {
    private inventory = new Map<string, number>();
    private skillPoints = 0;
    private damageBonus: Record<DamageCategory, number> = {
        wood: 0,
        stone: 0,
        mob: 0,
        animal: 0,
        generic: 0,
    };
    private listeners: Array<() => void> = [];

    addResource(name: string, amount = 1) {
        const next = (this.inventory.get(name) || 0) + amount;
        this.inventory.set(name, next);
        this.notify();
    }

    getResource(name: string) {
        return this.inventory.get(name) || 0;
    }

    getAllResources() {
        return Array.from(this.inventory.entries());
    }

    spendResources(cost: Record<string, number>): boolean {
        // Verify first
        for (const [item, needed] of Object.entries(cost)) {
            if (this.getResource(item) < needed) return false;
        }
        // Spend
        for (const [item, needed] of Object.entries(cost)) {
            this.inventory.set(item, this.getResource(item) - needed);
        }
        this.notify();
        return true;
    }

    addSkillPoints(amount: number) {
        this.skillPoints += amount;
        this.notify();
    }

    spendSkillPoints(amount: number) {
        if (this.skillPoints < amount) return false;
        this.skillPoints -= amount;
        this.notify();
        return true;
    }

    getSkillPoints() {
        return this.skillPoints;
    }

    addDamageBonus(category: DamageCategory, amount: number) {
        this.damageBonus[category] += amount;
        this.notify();
    }

    getDamageBonus(category: DamageCategory) {
        return this.damageBonus[category] || 0;
    }

    onChange(cb: () => void) {
        this.listeners.push(cb);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== cb);
        };
    }

    private notify() {
        this.listeners.forEach((cb) => cb());
    }
}
