const test = require("node:test");
const assert = require("node:assert/strict");
const mathChallenges = require("../math-challenges.js");

function sequenceRandom(values) {
  let index = 0;
  return () => values[index++ % values.length];
}

test("a round contains two timed sets, two questions each, and every operator", () => {
  const sets = mathChallenges.createRound(sequenceRandom([0, 0.999, 0.1, 0.7, 0.3, 0.8, 0.2, 0.6]));
  assert.equal(sets.length, 2);
  assert.deepEqual(sets.map((set) => set.questions.length), [2, 2]);
  assert.deepEqual(sets.flatMap((set) => set.questions).map((question) => question.operator).sort(), [...mathChallenges.operators].sort());
});

test("challenge trigger times stay inside their round windows", () => {
  assert.deepEqual(mathChallenges.createSchedule(() => 0), [60, 240]);
  assert.deepEqual(mathChallenges.createSchedule(() => 0.999999), [180, 360]);
});

test("addition and subtraction stay between zero and one hundred", () => {
  for (let seed = 0; seed <= 100; seed += 1) {
    const random = () => seed / 101;
    ["add", "subtract"].forEach((operator) => {
      const question = mathChallenges.createQuestion(operator, random);
      assert.ok(question.left >= 0 && question.left <= 100);
      assert.ok(question.right >= 0 && question.right <= 100);
      assert.ok(question.answer >= 0 && question.answer <= 100);
      assert.equal(question.operator === "add" ? question.left + question.right : question.left - question.right, question.answer);
    });
  }
});

test("multiplication and division use the one-to-twelve tables", () => {
  for (let seed = 0; seed < 12; seed += 1) {
    const random = () => seed / 12;
    const multiplication = mathChallenges.createQuestion("multiply", random);
    assert.ok(multiplication.left >= 1 && multiplication.left <= 12);
    assert.ok(multiplication.right >= 1 && multiplication.right <= 12);
    assert.equal(multiplication.left * multiplication.right, multiplication.answer);

    const division = mathChallenges.createQuestion("divide", random);
    assert.ok(division.right >= 1 && division.right <= 12);
    assert.ok(division.answer >= 1 && division.answer <= 12);
    assert.equal(division.left % division.right, 0);
    assert.equal(division.left / division.right, division.answer);
  }
});

test("an injected random function produces deterministic rounds", () => {
  const values = [0.25, 0.75, 0.1, 0.4, 0.9, 0.2, 0.6, 0.3, 0.8];
  assert.deepEqual(mathChallenges.createRound(sequenceRandom(values)), mathChallenges.createRound(sequenceRandom(values)));
});
