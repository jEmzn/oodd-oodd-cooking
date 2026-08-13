const test = require("node:test");
const assert = require("node:assert/strict");
const data = require("../recipes.js");

function permutations(items) {
  if (items.length < 2) return [items];
  return items.flatMap((item, index) => permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [item, ...rest]));
}

function combinations(items, maxLength, start = 0, selected = [], result = []) {
  if (selected.length) result.push([...selected]);
  if (selected.length === maxLength) return result;
  for (let index = start; index < items.length; index += 1) {
    selected.push(items[index]);
    combinations(items, maxLength, index, selected, result);
    selected.pop();
  }
  return result;
}

test("all menu component permutations resolve to the same menu", () => {
  data.menus.forEach((menu) => {
    permutations(menu.components).forEach((components) => {
      const plate = { kind: "plate", components, dishId: null, invalid: false };
      assert.equal(data.normalizePlate(plate).dishId, menu.id, `${menu.id}: ${components.join(",")}`);
    });
  });
});

test("plate menu components and steps keep cooked food before rice", () => {
  const expected = {
    "chicken-rice": {
      components: ["boiledMeat", "steamedRice"],
      steps: [{ tool: "pot", ingredients: ["meat"] }, { ingredients: ["steamedRice"] }]
    },
    "red-pork-rice": {
      components: ["grilledMeat", "boiledSauce", "steamedRice"],
      steps: [{ tool: "grill", ingredients: ["meat"] }, { tool: "pot", ingredients: ["sauce"] }, { ingredients: ["steamedRice"] }]
    },
    "braised-pork-rice": {
      components: ["boiledMeatSauce", "boiledEgg", "steamedRice"],
      steps: [{ tool: "pot", ingredients: ["meat", "sauce"] }, { tool: "pot", ingredients: ["egg"] }, { ingredients: ["steamedRice"] }]
    },
    "sticky-grilled-pork": {
      components: ["grilledMeat", "stickyRice"],
      steps: [{ tool: "grill", ingredients: ["meat"] }, { ingredients: ["stickyRice"] }]
    },
    "kaprao-pork-egg": {
      components: ["friedMeatVegetable", "friedEgg", "steamedRice"],
      steps: [{ tool: "pan", ingredients: ["meat", "vegetable"] }, { tool: "pan", ingredients: ["egg"] }, { ingredients: ["steamedRice"] }]
    },
    "shrimp-fried-rice": {
      components: ["friedRice"],
      steps: [{ tool: "pan", ingredients: ["steamedRice", "meat", "vegetable", "egg"] }]
    }
  };

  data.menus.forEach((menu) => assert.deepEqual({ components: menu.components, steps: menu.steps }, expected[menu.id], menu.id));
});

test("multi-ingredient station recipes accept any deposit order", () => {
  assert.equal(data.findExactTransformation("pot", ["sauce", "meat"]).id, "boiled-meat-sauce");
  assert.equal(data.findExactTransformation("pan", ["vegetable", "meat"]).id, "fried-meat-vegetable");
  assert.equal(data.canStageIngredients("pot", ["meat"]), true);
  assert.equal(data.canStageIngredients("pot", ["sauce", "meat"]), true);
  assert.equal(data.canStageIngredients("pan", ["vegetable"]), true);
  assert.equal(data.canStageIngredients("pot", ["meat", "egg"]), false);
});

test("every cooking transformation is required by a menu step and component", () => {
  data.transformations.forEach((transformation) => {
    const matchingMenus = data.menus.filter((menu) => menu.components.includes(transformation.output)
      && menu.steps.some((step) => step.tool === transformation.tool
        && permutations(step.ingredients).some((ingredients) => ingredients.length === transformation.inputs.length
          && ingredients.every((ingredient, index) => ingredient === transformation.inputs[index]))));
    assert.ok(matchingMenus.length, `${transformation.id} must be used by a menu`);
  });
  assert.equal(data.ingredients.friedMeat, undefined);
  assert.equal(data.findExactTransformation("pan", ["meat"]), null);
});

test("only current menu recipes can start cooking", () => {
  const rawIngredients = ["meat", "vegetable", "egg", "sauce", "steamedRice", "stickyRice"];
  const expected = new Set([
    "grill:meat",
    "pan:egg",
    "pan:egg,meat,steamedRice,vegetable",
    "pan:meat,vegetable",
    "pot:egg",
    "pot:meat",
    "pot:meat,sauce",
    "pot:sauce"
  ]);
  const actual = new Set();
  ["pan", "pot", "grill"].forEach((tool) => {
    combinations(rawIngredients, 4).forEach((inputs) => {
      permutations(inputs).forEach((orderedInputs) => {
        const transformation = data.findExactTransformation(tool, orderedInputs);
        if (transformation) actual.add(`${tool}:${[...inputs].sort().join(",")}`);
      });
    });
  });
  assert.deepEqual(actual, expected);
});

test("fried rice consumes all four components in one pan operation", () => {
  const transformation = data.findExactTransformation("pan", ["egg", "vegetable", "meat", "steamedRice"]);
  assert.equal(transformation.id, "fried-rice");
  const plate = data.appendIngredient(data.createPlate(), transformation.output);
  assert.equal(plate.dishId, "shrimp-fried-rice");
});

test("raw ingredients can be held without a plate", () => {
  assert.deepEqual(data.createIngredient("meat"), { kind: "ingredient", ingredientId: "meat" });
  assert.deepEqual(data.getInventoryImages(data.createIngredient("egg")), data.ingredients.egg.images);
});

test("plate components can be assembled in any order, including rice first", () => {
  data.menus.forEach((menu) => {
    permutations(menu.components).forEach((components) => {
      let plate = data.createPlate();
      components.forEach((component) => {
        plate = data.appendIngredient(plate, component);
        assert.equal(plate.invalid, false, `${menu.id}: ${components.join(",")}`);
      });
      assert.equal(plate.dishId, menu.id, `${menu.id}: ${components.join(",")}`);
    });
  });
});

test("wrong or extra components are invalid without mutating the previous plate", () => {
  const cookedOnly = data.appendIngredient(data.createPlate(), "boiledMeat");
  const wrongComponent = data.appendIngredient(cookedOnly, "stickyRice");
  assert.equal(wrongComponent.invalid, true);
  assert.deepEqual(cookedOnly, { kind: "plate", components: ["boiledMeat"], dishId: null, invalid: false });

  const riceOnly = data.appendIngredient(data.createPlate(), "steamedRice");
  const extraComponent = data.appendIngredient(riceOnly, "steamedRice");
  assert.equal(extraComponent.invalid, true);
  assert.deepEqual(riceOnly, { kind: "plate", components: ["steamedRice"], dishId: null, invalid: false });
  assert.equal(data.appendIngredient(extraComponent, "boiledMeat"), null);
});
