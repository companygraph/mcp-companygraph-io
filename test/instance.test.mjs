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

// The shared page test holds the served graph to what the build wrote, which compares the
// generator with itself. This holds what the build wrote to the model, field by field, so a
// change to the server's jsonld() that alters the organization's keys, the addresses or a
// pointer fails here rather than reaching a crawler.
test("a crawler is told the organization and the endpoint the model names", () => {
  const graph = JSON.parse(fs.readFileSync(path.join(process.cwd(), "dist/jsonld.json"), "utf8"))["@graph"];

  const identity = s.entities.find((e) => e.id === s.rootId);
  const surface = s.entities.find((e) => e.type === "surface"
    && String(e.fields?.["built-by"] ?? "").endsWith("/mcp-companygraph-io") && e.name.includes("MCP server"));
  const origin = surface.fields.url.replace(/\/$/, "");

  const organization = graph.find((n) => n["@type"] === "Organization");
  assert.equal(organization["@id"], `${origin}/#organization`, "the organization is this host's copy, not a pointer elsewhere");
  assert.equal(organization.name, identity.name, "the name is the identity's");
  assert.equal(organization.url, identity.fields.url, "the url is the identity's");
  // Minimal, as the family settled: a sibling defines its own copy and keeps it to these keys.
  assert.deepEqual(Object.keys(organization).sort(), ["@id", "@type", "name", "sameAs", "url"]);

  // There is no profile in this instance, so the addresses come from the identity's own Also at.
  const table = identity.sections.find((x) => x.heading === "Also at").tables[0];
  const want = table.rows.map((r) => r[table.columns.indexOf("URL")])
    .filter((u) => !u.startsWith(origin) && u.replace(/\/$/, "") !== identity.fields.url.replace(/\/$/, ""));
  assert.deepEqual(organization.sameAs, want, "every address is one the identity's Also at holds");

  const api = graph.find((n) => n["@type"] === "WebAPI");
  assert.equal(api.url, `${origin}/mcp`, "the API is the endpoint the model names");
  assert.equal(api.description, surface.tagline, "its description is the surface's own tagline");
  assert.equal(api.provider["@id"], organization["@id"], "and it resolves to the organization in this document");

  // A crawler reads a graph per document, so a bare `{"@id": …}` has to resolve inside this one,
  // and every id has to describe one thing rather than two.
  const ids = graph.map((n) => n["@id"]);
  assert.equal(new Set(ids).size, ids.length, `two nodes share an @id: ${ids.join(", ")}`);
  const pointers = [];
  const walk = (o) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (!o || typeof o !== "object") return;
    const keys = Object.keys(o);
    if (keys.length === 1 && keys[0] === "@id") pointers.push(o["@id"]);
    else for (const [k, v] of Object.entries(o)) if (k !== "@id") walk(v);
  };
  walk(graph);
  assert.ok(pointers.length, "the graph makes at least one reference");
  const dangling = pointers.filter((id) => !ids.includes(id));
  assert.deepEqual(dangling, [], `a pointer resolves nowhere in this document: ${dangling.join(", ")}`);
});
