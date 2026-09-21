// What only this instance can assert: facts of CompanyGraph's own model and of this
// deployment's registry entry, which the shared tests cannot hold because every instance's differ.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getEntity } from "companygraph-mcp-server/model";
import { serverJson } from "companygraph-mcp-server/deploy";

const s = JSON.parse(fs.readFileSync(path.join(process.cwd(), "dist/snapshot.json"), "utf8"));
const entry = { name: "io.companygraph/mental-model", url: "https://mcp.companygraph.io/mcp" };

test("the root is CompanyGraph", () => {
  assert.equal(s.root, "CompanyGraph");
});

test("the product the company makes resolves by its type and name", () => {
  assert.equal(getEntity(s, "product", "CompanyGraph Core").entity.id, "products/companygraph-core");
});

test("the registry entry is generated from the model and fits the registry", () => {
  const j = serverJson(s, entry, "1.2.3");
  assert.equal(j.$schema, "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json");
  assert.equal(j.name, "io.companygraph/mental-model");
  assert.equal(j.title, "CompanyGraph");
  assert.equal(j.description, "CompanyGraph: Written once, read by both");
  assert.ok(j.description.length <= 100);
  assert.equal(j.version, "1.2.3");
  assert.deepEqual(j.remotes, [{ type: "streamable-http", url: "https://mcp.companygraph.io/mcp" }]);
});

test("a description over the limit is refused rather than truncated", () => {
  const long = { ...s, root: "x".repeat(90) };
  assert.throws(() => serverJson(long, entry, "1.0.0"), /100/);
});

test("the registry entry names the name and address deployment.json holds", () => {
  const d = JSON.parse(fs.readFileSync(path.join(process.cwd(), "deployment.json"), "utf8"));
  assert.deepEqual({ name: d.registry_name, url: `https://${d.domain}/mcp` }, entry);
});

// mcp-publisher logs in by DNS on registry_domain, and the Registry accepts that login only for
// the namespace the domain spells in reverse, so the two have to agree label for label.
test("the registry domain, reversed, is the namespace of the registry name", () => {
  const d = JSON.parse(fs.readFileSync(path.join(process.cwd(), "deployment.json"), "utf8"));
  assert.equal(d.registry_domain.split(".").reverse().join("."), d.registry_name.split("/")[0]);
});

// No test of the JSON-LD field by field: the model names no surface for this deployment yet, so
// the build writes none and the shared page test holds the page to serving none; it arrives with the surface.
