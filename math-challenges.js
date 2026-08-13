(function initMathChallenges(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MathChallenges = api;
}(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const operators = ["add", "subtract", "multiply", "divide"];
  const symbols = { add: "+", subtract: "−", multiply: "×", divide: "÷" };

  function randomIndex(length, random) {
    const value = Number(random());
    const normalized = Number.isFinite(value) ? Math.max(0, Math.min(0.999999999999, value)) : 0;
    return Math.floor(normalized * length);
  }

  function randomInteger(min, max, random) {
    return min + randomIndex(max - min + 1, random);
  }

  function shuffledOperators(random = Math.random) {
    const shuffled = [...operators];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const target = randomIndex(index + 1, random);
      [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
    }
    return shuffled;
  }

  function createQuestion(operator, random = Math.random) {
    let left;
    let right;
    let answer;
    if (operator === "add") {
      left = randomInteger(0, 100, random);
      right = randomInteger(0, 100 - left, random);
      answer = left + right;
    } else if (operator === "subtract") {
      left = randomInteger(0, 100, random);
      right = randomInteger(0, left, random);
      answer = left - right;
    } else if (operator === "multiply") {
      left = randomInteger(1, 12, random);
      right = randomInteger(1, 12, random);
      answer = left * right;
    } else if (operator === "divide") {
      right = randomInteger(1, 12, random);
      answer = randomInteger(1, 12, random);
      left = right * answer;
    } else {
      throw new TypeError(`Unknown math operator: ${operator}`);
    }
    return {
      operator,
      symbol: symbols[operator],
      left,
      right,
      answer,
      expression: `${left} ${symbols[operator]} ${right}`
    };
  }

  function createSchedule(random = Math.random) {
    return [
      randomInteger(60, 180, random),
      randomInteger(240, 360, random)
    ];
  }

  function createRound(random = Math.random) {
    const schedule = createSchedule(random);
    const questions = shuffledOperators(random).map((operator) => createQuestion(operator, random));
    return schedule.map((triggerSecond, index) => ({
      triggerSecond,
      questions: questions.slice(index * 2, index * 2 + 2)
    }));
  }

  return { operators, createQuestion, createSchedule, createRound };
}));
