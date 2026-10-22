import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Focused local edit of preserved r4. No installation, account or provider action.
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const profile = process.env.USERPROFILE;
const modules = process.env.RUNTIME_NODE_MODULES ?? path.join(profile, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const python = process.env.RUNTIME_PYTHON ?? path.join(profile, '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
const skill = process.env.PRESENTATIONS_SKILL_DIR ?? path.join(profile, '.codex/plugins/cache/openai-primary-runtime/presentations/26.1017.22135/skills/presentations');
process.env.RUNTIME_NODE_MODULES ??= modules;
const { FileBlob, PresentationFile } = await import(pathToFileURL(path.join(modules, '@oai/artifact-tool/dist/artifact_tool.mjs')).href);
const { finalizePresentation } = await import(pathToFileURL(path.join(skill, 'container_tools/artifact_tool_utils.mjs')).href);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const source = path.join(root, '.local/submission/output/evidence-desk-review-r4.pptx');
const expectedSource = 'ff5678a7098e59ae32220c5d68f7b4918f1e0e2f87a9539a776db7d610163310';
if (sha(await fs.readFile(source)) !== expectedSource) throw new Error('Preserved r4 source hash differs.');
const build = path.join(root, '.local/submission/build-r5-final');
const rendered = path.join(root, '.local/submission/rendered-r5');
const output = path.join(root, '.local/submission/output');
const pptx = path.join(output, 'evidence-desk-review-r5.pptx');
const pdf = path.join(output, 'evidence-desk-review-r5.pdf');
for (const file of [pptx, pdf]) if (await fs.stat(file).catch(() => null)) throw new Error('Final r5 already exists; preserve it.');
for (const directory of [build, rendered, output]) await fs.mkdir(directory, { recursive: true });
const copy = JSON.parse(await fs.readFile(path.join(root, 'docs/submission/SLIDES.json'), 'utf8'));
if (copy.slides.length !== 7 || copy.templatePptx !== '.local/submission/output/evidence-desk-review-r4.pptx') throw new Error('Expected seven-slide r4-based copy.');
const presentation = await PresentationFile.importPptx(await FileBlob.load(source));
if (presentation.slides.items.length !== 7) throw new Error('Expected seven native source slides.');
const slides = presentation.slides.items;
if (slides[0].shapes.items.length !== 4 || slides[5].shapes.items.length !== 2 || slides[6].shapes.items.length !== 4 || slides[5].tables.items.length !== 1) throw new Error('Source element structure differs.');
slides[0].shapes.items[3].text = copy.slides[0].disclosure;
slides[5].tables.items[0].cells.set(3, 1, copy.slides[5].rows[3][1]);
slides[5].tables.items[0].cells.set(3, 2, copy.slides[5].rows[3][2]);
slides[5].shapes.items[1].text = copy.slides[5].disclosure;
slides[6].shapes.items[1].text = copy.slides[6].body;
slides[6].shapes.items[3].text = copy.slides[6].disclosure;
for (const index of [0, 5, 6]) slides[index].speakerNotes.text = copy.slides[index].notes;
for (const [index, slide] of slides.entries()) {
  const png = await presentation.export({ slide, format: 'png', scale: 1 });
  await fs.writeFile(path.join(rendered, `slide-${String(index + 1).padStart(2, '0')}.png`), new Uint8Array(await png.arrayBuffer()));
}
const candidate = path.join(build, 'candidate.pptx');
await (await PresentationFile.exportPptx(presentation)).save(candidate);
const tableSlides = [2, 4, 5, 6];
const validation = await finalizePresentation({
  workspaceDir: root, candidatePath: candidate, finalPath: pptx, pythonExecutable: python,
  integrityValidatorPath: path.join(skill, 'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath: path.join(skill, 'container_tools/inspect_presentation_layout_geometry.py'),
  explicitTotalSlideCount: 7, requiredNativeTableOwnerSlides: tableSlides, requiredNativeChartOwnerSlides: [],
  layoutArgs: ['--expected-slide-size-emu', '12192000,6858000', '--validate-bullet-geometry', '--validate-heading-fit', ...tableSlides.flatMap(number => ['--require-native-table-slide', String(number)])],
  fontPolicy: { basis: 'reference', families: ['Arial'], referencePath: source, referenceSha256: expectedSource },
  verifyArtifactToolImport: true, receiptPath: path.join(build, 'validation.json')
});
let pdfMode = 'native-artifact-export';
try {
  const native = await presentation.export({ format: 'pdf' });
  await fs.writeFile(pdf, new Uint8Array(await native.arrayBuffer()));
} catch {
  const require = createRequire(path.join(modules, 'entry-deck-export.cjs'));
  const { PDFDocument } = require('pdf-lib');
  const document = await PDFDocument.create();
  for (let index = 1; index <= 7; index++) {
    const image = await document.embedPng(await fs.readFile(path.join(rendered, `slide-${String(index).padStart(2, '0')}.png`)));
    document.addPage([960, 540]).drawImage(image, { x: 0, y: 0, width: 960, height: 540 });
  }
  await fs.writeFile(pdf, await document.save());
  pdfMode = 'image-page PDF from inspected slide renders; edit native content in PPTX';
}
const receipt = { generatedAt: new Date().toISOString(), slides: 7, changedSlides: [1, 6, 7], sourceSha256: expectedSource, pptx: path.relative(root, pptx), pdf: path.relative(root, pdf), pptxSha256: sha(await fs.readFile(pptx)), pdfSha256: sha(await fs.readFile(pdf)), pdfMode, validation };
await fs.writeFile(path.join(build, 'outputs.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ pptx, pdf, changedSlides: receipt.changedSlides, pptxSha256: receipt.pptxSha256, pdfSha256: receipt.pdfSha256, pdfMode }));
