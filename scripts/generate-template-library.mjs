import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceFile = path.join(projectRoot, 'library_manifest.json');
const outputFile = path.join(projectRoot, 'generated', 'template-library.ts');

async function safeReadJson(filePath) {
	try {
		return JSON.parse(await fs.readFile(filePath, 'utf8'));
	} catch (_error) {
		return null;
	}
}

async function fileExists(filePath) {
	try {
		await fs.access(filePath);
		return true;
	} catch (_error) {
		return false;
	}
}

async function buildLibraryPayload() {
	if (!(await fileExists(sourceFile))) {
		return {
			sourceFolder: path.basename(projectRoot),
			assetTheme: [],
			entries: [],
		};
	}

	const rootManifest = await safeReadJson(sourceFile);
	const rootAssetTheme = rootManifest && Array.isArray(rootManifest.assetTheme) ? rootManifest.assetTheme : [];
	const entries = Array.isArray(rootManifest?.entries)
		? rootManifest.entries
				.filter((entry) => entry && entry.ast)
				.map((entry) => {
					const nextEntry = { ...entry };
					if (Array.isArray(nextEntry.assetTheme)) delete nextEntry.assetTheme;
					return nextEntry;
				})
		: [];
	entries.sort((a, b) => String(a.frameName || '').localeCompare(String(b.frameName || '')));

	return {
		sourceFolder: path.basename(projectRoot),
		assetTheme: rootAssetTheme,
		entries,
	};
}

function buildSource(payload) {
	return (
		"import { NormalizedNode, ThemeVariableSnapshot } from '../types';\n\n" +
		"export type BundledTemplateEntry = {\n" +
		"\tframeName: string;\n" +
		"\tfolder: string;\n" +
		"\tassetTheme?: ThemeVariableSnapshot[];\n" +
		"\tschema: any;\n" +
		"\tast: NormalizedNode;\n" +
		"\tassets: {\n" +
		"\t\tmockup?: string;\n" +
		"\t\tflattenedLive?: string;\n" +
		"\t\tflattenedTextBaked?: string;\n" +
		"\t\tproductAssets: string[];\n" +
		"\t\tpreviewPages?: string[];\n" +
		"\t\tcssFiles?: string[];\n" +
		"\t\tjsFiles?: string[];\n" +
		"\t};\n" +
		"};\n\n" +
		"export const BUNDLED_TEMPLATE_LIBRARY: {\n" +
		"\tsourceFolder: string;\n" +
		"\tassetTheme: ThemeVariableSnapshot[];\n" +
		"\tentries: BundledTemplateEntry[];\n" +
		"} = " +
		JSON.stringify(payload) +
		";\n"
	);
}

const payload = await buildLibraryPayload();
await fs.mkdir(path.dirname(outputFile), { recursive: true });
if (await fileExists(sourceFile)) {
	await fs.writeFile(sourceFile, JSON.stringify(payload), 'utf8');
}
await fs.writeFile(outputFile, buildSource(payload), 'utf8');
