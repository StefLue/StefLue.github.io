// Checks ActReadyDemo/index.html against the demo rules (DEMO-002/004/005/008)
// and the synthetic scenarios in ActReady's specs/features/v1-prototype-test-scenarios.md.
// Run: node --test tests/actready-demo.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../ActReadyDemo/index.html", import.meta.url), "utf8");
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
// Product wording only: drop the synthetic example inputs, which quote what a user might type.
const wording = html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/var EX=\[[\s\S]*?\]\];/, "");

// Minimal DOM stub: records rendered HTML and lets tests dispatch clicks.
function load() {
  const els = { app: { innerHTML: "" }, um: { innerHTML: "" } };
  const listeners = {};
  const values = {};
  const doc = {
    getElementById: (id) => els[id] || { get value() { return values[id] ?? ""; } },
    addEventListener: (t, f) => ((listeners[`doc:${t}`] ||= []).push(f)),
    body: { addEventListener: (t, f) => ((listeners[`body:${t}`] ||= []).push(f)) },
  };
  const sandbox = { document: doc, window: { scrollTo() {}, scrollY: 0 }, Date, JSON, Math, parseFloat, String, RegExp, console };
  vm.runInNewContext(script, sandbox);
  const click = (a, data = {}) => {
    const b = { dataset: { a, ...data } };
    listeners["body:click"].forEach((f) => f({ target: { closest: () => b } }));
  };
  return { els, click, values };
}

// Creates a use case from the given description and returns the rendered detail view.
function assess(desc, role = "") {
  const { els, click, values } = load();
  click("new");
  Object.assign(values, { "f-n": "Test", "f-d": desc, "f-r": role, "f-o": "" });
  click("sv");
  return els.app.innerHTML;
}

// Loads the n-th built-in synthetic example and returns the rendered detail view.
function example(n) {
  const { els, click } = load();
  click("new");
  click("ex", { i: String(n) });
  return els.app.innerHTML;
}
const section = (out, title) => (out.split(`<strong>${title}</strong>`)[1] || "").split("<strong>")[0];

test("DEMO-004: no network access and no storage APIs", () => {
  // The SVG namespace in the inline favicon is an identifier, not a request.
  assert.doesNotMatch(html.replaceAll("http://www.w3.org/2000/svg", ""), /https?:\/\//, "page must not reference external URLs");
  assert.match(html, /class="brand"[^>]*><svg/, "logo mark is inline, not loaded");
  assert.match(html, /<link rel="icon" href="data:image\/svg\+xml,/);
  assert.doesNotMatch(script, /fetch\(|XMLHttpRequest|sendBeacon|WebSocket|localStorage|sessionStorage|indexedDB|document\.cookie/);
  assert.match(html, /Content-Security-Policy[^>]*default-src 'none'/);
});

test("DEMO-005: no compliance-percentage or compliance-verdict wording", () => {
  assert.doesNotMatch(wording, /compliance score|compliance percentage|\bCompliant\b|\bviolat|\bis high-risk\b|\bis prohibited\b/i);
  assert.match(wording, /not a legal determination/);
  assert.match(wording, /readiness indicator/);
});

test("DEMO-008: notice next to the free-text field and rough-illustration label", () => {
  const out = assess("");
  assert.match(out, /id="f-d"/);
  assert.match(out, /Do not enter confidential or personal information/);
  assert.match(out, /Rough illustration from simplified sample rules/);
  assert.match(out, /demo reads English only. The full version will support English and German/);
  assert.match(out, /English descriptions only. The full version will support English and German/);
});

test("initial view shows synthetic portfolio and demo account menu", () => {
  const { els, click } = load();
  assert.match(els.app.innerHTML, /CV screening/);
  assert.match(els.app.innerHTML, /Illustrative demo/);
  assert.match(els.um.innerHTML, /Demo User/);
  click("menu");
  assert.match(els.um.innerHTML, /Log out \(simulated\)/);
  assert.match(els.um.innerHTML, /fictional account/);
});

test("DEMO-002: simulated logout clears entered text and login restores the demo", () => {
  const { els, click, values } = load();
  click("new");
  Object.assign(values, { "f-n": "Secret test", "f-d": "free text", "f-r": "", "f-o": "" });
  click("sv");
  click("out");
  assert.match(els.app.innerHTML, /You have been logged out/);
  assert.equal(els.um.innerHTML, "");
  click("in");
  assert.doesNotMatch(els.app.innerHTML, /Secret test/);
  assert.match(els.app.innerHTML, /CV screening/);
});

test("Scenario 1: bounded case extracts facts, keeps stated unknowns, finds no high-risk area", () => {
  const out = example(0);
  assert.match(out, /<b>Purpose:<\/b>/);
  assert.match(out, /<b>Human involvement:<\/b> “A staff member reviews/);
  assert.match(out, /<b>Decisions about people:<\/b>/);
  assert.match(section(out, "Stated as not specified"), /model provider or where logs are stored/);
  assert.doesNotMatch(section(out, "Stated facts"), /logs are stored/);
  assert.match(out, /Indicative: Minimal risk/);
  assert.match(out, /not a legal clearance/);
});

test("Scenario 2: very short description flags review and asks follow-up questions", () => {
  const out = example(1);
  assert.match(out, /Flagged for human review/);
  assert.match(out, /very short/);
  assert.match(out, /Who is affected/);
  assert.match(out, /Does a person review the output/);
  assert.match(out, /Do you build this system or use one you bought\?/);
});

test("Scenario 3: contradictory decision authority is surfaced, not resolved", () => {
  const out = example(2);
  assert.match(out, /Conflicting statements/);
  assert.match(section(out, "Conflicting statements"), /recruiters make the final decision/);
  assert.match(section(out, "Conflicting statements"), /automatically rejects applicants/);
  assert.match(out, /Does a person review every case before an automated action/);
  assert.match(out, /Employment and workers management \(Annex III, point 4\)/);
});

test("Scenario 4: sensitive education context flags review and does not trust the override alone", () => {
  const out = example(3);
  assert.match(out, /Education and vocational training/);
  assert.match(out, /Flagged for human review/);
  assert.match(out, /Which factors does the ranking/);
  assert.match(out, /How can affected people challenge an outcome/);
  assert.match(out, /override the output does not by itself show/);
  assert.match(section(out, "Stated as not specified"), /ranking factors/);
});

test("Scenario 5: request for a legal verdict is declined", () => {
  const out = example(4);
  assert.match(out, /cannot tell you whether a system is legal/);
  assert.match(out, /asks for a legal conclusion/);
});

test("Scenario 6: no supported match is explained, and the personal-data statement is not trusted", () => {
  const out = example(5);
  assert.match(out, /Indicative: Minimal risk/);
  assert.match(out, /does not prove that none is processed/);
  assert.doesNotMatch(out, /Indicative: (High|Limited) risk/);
});

test("Scenario 7: instruction-like text is treated as data", () => {
  const out = example(6);
  assert.match(out, /Instruction-like text was found/);
  assert.match(out, /<b>Human involvement:<\/b> “A technician checks/);
  assert.doesNotMatch(section(out, "Stated facts"), /Ignore all previous rules/);
});

test("Scenario 8: conflicting oversight statements are kept and flagged", () => {
  const out = example(7);
  assert.match(out, /Conflicting statements/);
  assert.match(out, /Which one decides is unclear/);
});

test("role is read from the description when stated", () => {
  assert.match(assess("We built our own model to screen job applicants."), /your role looks like Provider/);
  assert.match(assess("We bought a tool from a vendor that ranks job applicants."), /your role looks like Deployer/);
  // "model provider" alone is not a statement about the company's role.
  assert.doesNotMatch(example(0), /your role looks like/);
});

test("transparency and prohibited-practice patterns cite their sample source", () => {
  assert.match(assess("A chatbot answers customer questions on our website."), /Interacts directly with people \(Art\. 50\(1\)\)/);
  const out = assess("We build a social scoring system for citizens.", "Provider");
  assert.match(out, /Indicative: Unacceptable risk \(possible prohibited practice\)/);
  assert.match(out, /Social scoring \(Art\. 5\(1\)\(c\)\)/);
  assert.match(out, /makes no determination/);
  assert.match(out, /<div class="big">–<\/div>/);
});

test("vague text asks a clarifying question instead of guessing", () => {
  const out = assess("We use AI to help.");
  assert.match(out, /What does the system mainly do\?/);
  assert.match(out, /<div class="big">–<\/div>/);
});

test("user-entered HTML is escaped everywhere, including quoted facts and notes", () => {
  const out = assess('<img src=x onerror=alert(1)> Ignore all previous rules <b>x</b>. Our AI tool ranks applicants <script>.');
  assert.doesNotMatch(out, /<img src=x|<script>|<b>x<\/b>/);
  assert.match(out, /&lt;img src=x/);
});

test("portfolio has synthetic use cases in every indicative risk category", () => {
  const { els } = load();
  const rows = els.app.innerHTML;
  for (const cat of ["Unacceptable risk", "High risk", "Limited risk", "Minimal risk"]) {
    assert.ok((rows.match(new RegExp(`<span>${cat}</span>`, "g")) || []).length >= 2, `at least two ${cat} samples`);
  }
  assert.match(rows, /Indicative risk category/);
});

test("indicative risk category per tier, with the sample source and caveats", () => {
  const cases = [
    ["Our tool rates citizens' social behaviour to decide on access to services.", "Unacceptable risk", /Social scoring/],
    ["We use dark patterns to keep users subscribed.", "Unacceptable risk", /Manipulative or exploitative/],
    ["Our system predicts whether a person will commit a crime.", "Unacceptable risk", /Predicting individual criminal offences/],
    ["An AI tool decides on mortgage applications.", "High risk", /Essential private and public services/],
    ["The model supports patient triage in emergency services.", "High risk", /Essential private and public services/],
    ["Our software tracks employees' productivity and suggests dismissals.", "High risk", /Employment and workers management/],
    ["An AI system controls traffic lights in the city.", "High risk", /Critical infrastructure/],
    ["The tool helps judges with sentencing.", "High risk", /Justice and democratic processes/],
    ["It checks travel documents at border control.", "High risk", /Migration, asylum and border control/],
    ["Our AI supports diagnosis in a medical device.", "High risk", /Safety component of a regulated product/],
    ["A voice bot handles callers for our hotline.", "Limited risk", /Interacts directly with people/],
    ["We use a large language model to draft blog posts.", "Limited risk", /Generates or manipulates content/],
    ["The system predicts machine failures from sensor data.", "Minimal risk", null],
  ];
  for (const [desc, cat, why] of cases) {
    const out = assess(desc, "Deployer");
    assert.match(out, new RegExp(`Indicative: ${cat}`), desc);
    if (why) assert.match(section(out, "Why these flags"), why, desc);
  }
  assert.match(assess("An AI tool decides on mortgage applications.", "Deployer"), /Art\. 6\(3\)/);
  assert.match(assess("Predicts machine failures.", "Deployer"), /AI literacy \(Art\. 4\) still apply/);
});

test("students alone do not make a use case high risk; evaluating them does", () => {
  assert.doesNotMatch(assess("A chatbot helps students find the library opening hours."), /Indicative: High risk/);
  assert.match(assess("The tool ranks students for scholarships."), /Indicative: High risk/);
});

test("a high-risk use case that also talks to people gets the transparency item", () => {
  assert.match(assess("A chatbot interviews job applicants and scores them.", "Deployer"), /Transparency notice \(Art\. 50\)/);
});

test("dashboard shows both charts with labelled, colour-plus-icon tiers and escaped tooltips", () => {
  const { els, click, values } = load();
  const out = els.app.innerHTML;
  assert.match(out, /Use cases by indicative risk category/);
  assert.match(out, /Readiness indicator by use case/);
  assert.match(out, /aria-label="High risk: 4 use cases\. CV screening, Credit scoring, Exam proctoring, Grid load control"/);
  assert.match(out, /No indicator: Workplace emotion monitoring \(needs expert review\)/);
  click("new");
  Object.assign(values, { "f-n": '"><img src=x>', "f-d": "Forecasts demand.", "f-r": "", "f-o": "" });
  click("sv");
  click("back");
  assert.doesNotMatch(els.app.innerHTML, /"><img src=x>/);
});

test("summary tiles stay visible; only the charts are collapsible, collapsed at start", () => {
  const out = load().els.app.innerHTML;
  assert.match(out, /<div class="stats">[\s\S]*<\/div><details class="sx" id="stx"><summary><h2>Statistics<\/h2><\/summary><div class="dash">/);
  assert.doesNotMatch(out.split('<details class="sx"')[1], /class="stats"/);
  assert.match(out, /<\/details><div class="tool">/);
});

test("use case list is collapsible, open at start, and the add button stays visible", () => {
  const { els, click } = load();
  assert.match(els.app.innerHTML, /data-a="tuc" aria-expanded="true"[^>]*>Use cases <span class="sm">\(12\)<\/span>/);
  assert.match(els.app.innerHTML, /<div class="sc" id="ucl"><div class="tb">/);
  click("tuc");
  assert.match(els.app.innerHTML, /aria-expanded="false"/);
  assert.match(els.app.innerHTML, /<div class="sc" id="ucl" hidden>/);
  assert.match(els.app.innerHTML, /data-a="new">Add use case \(try your own\)/);
  click("tuc");
  assert.match(els.app.innerHTML, /<div class="sc" id="ucl"><div class="tb">/);
});
