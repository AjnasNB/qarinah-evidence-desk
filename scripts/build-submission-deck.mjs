import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Local optional authoring tool. Uses the supplied Codex artifact runtime.
// It installs nothing, opens no browser, makes no provider request and publishes nothing.
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const profile = process.env.USERPROFILE;
if (!profile && (!process.env.RUNTIME_NODE_MODULES || !process.env.PRESENTATIONS_SKILL_DIR)) throw new Error('Set RUNTIME_NODE_MODULES and PRESENTATIONS_SKILL_DIR.');
const runtimeModules = process.env.RUNTIME_NODE_MODULES ?? path.join(profile, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const runtimePython = process.env.RUNTIME_PYTHON ?? path.join(profile, '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
const skillDir = process.env.PRESENTATIONS_SKILL_DIR ?? path.join(profile, '.codex/plugins/cache/openai-primary-runtime/presentations/26.1017.22135/skills/presentations');
process.env.RUNTIME_NODE_MODULES ??= runtimeModules;
const { FileBlob, Presentation, PresentationFile } = await import(pathToFileURL(path.join(runtimeModules, '@oai/artifact-tool/dist/artifact_tool.mjs')).href);
const { finalizePresentation, resolvePresentationFont } = await import(pathToFileURL(path.join(skillDir, 'container_tools/artifact_tool_utils.mjs')).href);

const copy = JSON.parse(await fs.readFile(path.join(root, 'docs/submission/SLIDES.json'), 'utf8'));
if (copy.slides.length !== 7) throw new Error('This review deck must have exactly seven slides.');
const revision = process.argv.find(arg => arg.startsWith('--revision='))?.slice('--revision='.length) ?? 'r1';
if (!/^r[1-9][0-9]?$/.test(revision)) throw new Error('Use a bounded revision such as --revision=r2.');
const suffix = revision === 'r1' ? '' : '-' + revision;
const screenshotPath = process.env.SCREENSHOT_PATH ? path.resolve(process.env.SCREENSHOT_PATH) : path.join(root, copy.screenshotPath ?? '.local/submission/assets/product-review.png');
const templatePath = copy.templatePptx ? path.resolve(root, copy.templatePptx) : undefined;
const buildDir = path.join(root, '.local/submission/build' + suffix);
const outputDir = path.join(root, '.local/submission/output');
const rendersDir = path.join(root, '.local/submission/rendered' + suffix);
for (const dir of [buildDir, outputDir, rendersDir]) await fs.mkdir(dir, { recursive: true });
const draftPath = path.join(buildDir, 'candidate.pptx');
const finalPath = path.join(outputDir, 'evidence-desk-review' + suffix + '.pptx');
const pdfPath = path.join(outputDir, 'evidence-desk-review' + suffix + '.pdf');
const resume = process.argv.includes('--resume-export');
const exists = Boolean(await fs.stat(finalPath).catch(() => null));
if (exists && !resume) throw new Error('Final deck exists. Use --resume-export only for its validated derived exports, or choose a new output filename for a revision.');
if (resume && !exists) throw new Error('There is no validated final deck to resume.');
if (resume) {
  const receipt = JSON.parse(await fs.readFile(path.join(buildDir, 'validation.json'), 'utf8'));
  const actual = createHash('sha256').update(await fs.readFile(finalPath)).digest('hex');
  if (actual !== receipt.finalSha256) throw new Error('Existing final deck differs from its validation receipt.');
}

const font = resolvePresentationFont();
const colors = { paper: '#F5F8F6', ink: '#153E35', muted: '#51665B', mint: '#25E6A1', dark: '#102A24', line: '#DCE5DF' };
const presentation = resume || templatePath ? await PresentationFile.importPptx(await FileBlob.load(resume ? finalPath : templatePath)) : Presentation.create({ slideSize: { width: 1280, height: 720 } });
function text(slide, value, x, y, w, h, size = 28, color = colors.ink, bold = false) {
  const box = slide.shapes.add({ geometry: 'textbox', position: { left: x, top: y, width: w, height: h }, fill: 'none', line: { fill: 'none', width: 0 } });
  box.text = value;
  box.text.style = { typeface: font, fontSize: size, color, bold };
  return box;
}
function table(slide, rows, widths, top, height) {
  const t = slide.tables.add({ rows: rows.length, columns: rows[0].length, left: 64, top, width: 1152, height, columnWidths: widths, values: rows });
  t.styleOptions = { headerRow: true, bandedRows: false };
  t.borders.assign({ style: 'solid', fill: colors.line, width: 1 });
  for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) {
    const cell = t.getCell(r, c);
    cell.fill = r === 0 ? colors.ink : '#FFFFFF';
    cell.text.style = { typeface: font, fontSize: 24, color: r === 0 ? '#FFFFFF' : colors.ink, bold: r === 0 };
  }
  return t;
}
const imageBytes = async file => { const value = await fs.readFile(file); return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength); };

if (!resume && templatePath) {
  if (presentation.slides.items.length !== 7) throw new Error('The existing review deck must contain seven slides.');
  await presentation.inspect({ select: '$.slides[*]', include: ['id', 'index', 'layout', 'elements.id', 'elements.kind', 'elements.text'], fileName: path.join(buildDir, 'source-layout.ndjson') });
  for (const [i, item] of copy.slides.entries()) {
    const slide = presentation.slides.items[i];
    const values = item.layout === 'cover' ? [item.title, item.subtitle, item.owner, item.disclosure] : item.layout === 'close' ? [item.title, item.body, item.owner, item.disclosure] : item.layout === 'screenshot' ? [item.title, item.caption, item.disclosure] : item.layout === 'workflow' ? [item.title, item.body, item.disclosure] : [item.title, item.disclosure];
    if (slide.shapes.items.length !== values.length) throw new Error('Unexpected reference text structure on slide ' + (i + 1));
    for (const [j, value] of values.entries()) slide.shapes.items[j].text = value;
    if (item.rows) {
      if (slide.tables.items.length !== 1) throw new Error('Expected one native reference table on slide ' + (i + 1));
      const native = slide.tables.items[0];
      for (let r = 0; r < item.rows.length; r++) for (let c = 0; c < item.rows[r].length; c++) native.cells.set(r, c, item.rows[r][c]);
    }
    if (item.layout === 'screenshot') {
      const image = slide.images.items[0];
      const frame = image.frame, crop = image.crop, fit = image.fit;
      image.replace({ blob: await imageBytes(screenshotPath), contentType: 'image/png', alt: 'Actual Zetaris source review with four cited observations and caller-declared CI disclaimer', fit });
      image.frame = frame; image.crop = item.crop ?? crop;
    }
    slide.speakerNotes.text = item.notes;
  }
} else if (!resume) for (const item of copy.slides) {
  const s = presentation.slides.add();
  const dark = item.layout === 'cover' || item.layout === 'close';
  s.background.fill = dark ? colors.dark : colors.paper;
  const ink = dark ? '#FFFFFF' : colors.ink;
  if (item.layout === 'cover') {
    s.images.add({ blob: await imageBytes(path.join(root, 'public/brand/qarinah-mark.svg')), contentType: 'image/svg+xml', alt: 'Original Qarinah evidence-path mark', fit: 'contain', position: { left: 932, top: 163, width: 260, height: 260 } });
    text(s, item.title, 64, 100, 800, 200, 76, ink, true);
    text(s, item.subtitle, 68, 338, 900, 70, 34, '#D5E9DF');
    text(s, item.owner, 68, 478, 900, 44, 26, '#D5E9DF');
    text(s, item.disclosure, 68, 606, 1136, 58, 25, colors.mint);
  } else if (item.layout === 'close') {
    text(s, item.title, 64, 74, 1120, 100, 56, ink, true);
    text(s, item.body, 68, 239, 1070, 210, 34, '#D5E9DF');
    text(s, item.owner, 68, 492, 1040, 46, 27, ink);
    text(s, item.disclosure, 68, 608, 1100, 54, 25, colors.mint);
  } else {
    text(s, item.title, 64, 50, 1152, 78, 46, ink, true);
    if (item.layout === 'screenshot') {
      s.images.add({ blob: await imageBytes(screenshotPath), contentType: 'image/png', alt: 'Actual local release review with four cited observations and authority disclaimer', fit: 'contain', crop: { left: 0.1375, top: 0.25, right: 0.23, bottom: 0.288888889 }, position: { left: 79, top: 140, width: 1122, height: 460 } });
      text(s, item.caption, 64, 613, 1152, 38, 28, ink, true);
      text(s, item.disclosure, 64, 659, 1152, 35, 23, colors.muted);
    } else if (item.layout === 'workflow') {
      text(s, item.body, 64, 144, 1120, 100, 28, ink);
      table(s, item.rows, [300, 852], 278, 282);
      text(s, item.disclosure, 64, 607, 1136, 65, 24, colors.muted);
    } else if (item.layout === 'sponsors') {
      table(s, item.rows, [310, 270, 572], 168, 382);
      text(s, item.disclosure, 64, 608, 1136, 62, 25, colors.muted);
    } else {
      table(s, item.rows, item.layout === 'architecture' ? [340, 812] : item.layout === 'bytes' ? [840, 312] : [760, 392], 174, 350);
      text(s, item.disclosure, 64, 583, 1136, 104, 25, colors.muted);
    }
  }
  s.speakerNotes.text = item.notes;
}

for (const [i, slide] of presentation.slides.items.entries()) {
  const png = await presentation.export({ slide, format: 'png', scale: 1 });
  await fs.writeFile(path.join(rendersDir, `slide-${String(i + 1).padStart(2, '0')}.png`), new Uint8Array(await png.arrayBuffer()));
}
if (!resume) await (await PresentationFile.exportPptx(presentation)).save(draftPath);
const result = resume ? JSON.parse(await fs.readFile(path.join(buildDir, 'validation.json'), 'utf8')) : await finalizePresentation({ workspaceDir: root, candidatePath: draftPath, finalPath, pythonExecutable: runtimePython, integrityValidatorPath: path.join(skillDir, 'container_tools/inspect_presentation_package_integrity.py'), layoutValidatorPath: path.join(skillDir, 'container_tools/inspect_presentation_layout_geometry.py'), explicitTotalSlideCount: 7, requiredNativeTableOwnerSlides: [2, 4, 5, 6], requiredNativeChartOwnerSlides: [], layoutArgs: ['--expected-slide-size-emu', '12192000,6858000', '--validate-bullet-geometry', '--validate-heading-fit', ...[2, 4, 5, 6].flatMap(slide => ['--require-native-table-slide', String(slide)])], fontPolicy: templatePath ? { basis: 'reference', families: [font], referencePath: templatePath, referenceSha256: createHash('sha256').update(await fs.readFile(templatePath)).digest('hex') } : { basis: 'design', families: [font] }, verifyArtifactToolImport: true, receiptPath: path.join(buildDir, 'validation.json') }).catch(async error => { await fs.writeFile(path.join(buildDir, 'finalizer-error.json'), JSON.stringify({ message: error.message }, null, 2)); throw new Error(error.message.split('\n')[0] + ' (see private build finalizer-error.json)'); });
let pdfMode = 'native-artifact-export';
try {
  const pdf = await presentation.export({ format: 'pdf' });
  await fs.writeFile(pdfPath, new Uint8Array(await pdf.arrayBuffer()));
} catch (error) {
  // The supplied Windows runtime may lack the native PDF standard-font alias.
  // Preserve the editable PPTX and make a disclosed image-page PDF from its renders.
  const requireRuntime = createRequire(path.join(runtimeModules, 'submission-export.cjs'));
  const { PDFDocument } = requireRuntime('pdf-lib');
  const pdf = await PDFDocument.create();
  for (let i = 1; i <= 7; i++) {
    const png = await pdf.embedPng(await fs.readFile(path.join(rendersDir, `slide-${String(i).padStart(2, '0')}.png`)));
    pdf.addPage([960, 540]).drawImage(png, { x: 0, y: 0, width: 960, height: 540 });
  }
  await fs.writeFile(pdfPath, await pdf.save());
  pdfMode = 'image-page PDF from Artifact Tool slide renders; editable objects remain in PPTX';
  await fs.writeFile(path.join(buildDir, 'pdf-export-limitation.json'), JSON.stringify({ nativeError: error.message, fallback: pdfMode }, null, 2));
}
const bytes = await fs.readFile(finalPath);
await fs.writeFile(path.join(buildDir, 'outputs.json'), JSON.stringify({ generatedAt: new Date().toISOString(), font, slides: 7, pptx: path.relative(root, finalPath), pdf: path.relative(root, pdfPath), pdfMode, pptxSha256: createHash('sha256').update(bytes).digest('hex'), finalizer: result }, null, 2));
console.log(JSON.stringify({ slides: 7, font, pptx: finalPath, pdf: pdfPath, pdfMode, rendered: rendersDir }));
