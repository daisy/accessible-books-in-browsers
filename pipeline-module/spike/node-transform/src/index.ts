import { readFile, writeFile } from "node:fs/promises";
import { DOMParser, XMLSerializer } from "xmldom";

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath || !outputPath) {
  throw new Error("Usage: node index.js <input.xml> <output.xml>");
}

const source = await readFile(inputPath, "utf8");
const document = new DOMParser().parseFromString(source, "application/xml");

if (!document.documentElement) {
  throw new Error(`No document element found in ${inputPath}`);
}

document.documentElement.setAttribute("processed-by-node", new Date().toISOString());
await writeFile(outputPath, new XMLSerializer().serializeToString(document), "utf8");
