import { camelCase, pascalCase } from 'change-case';
import { execSync } from 'child_process';
import colors from 'colors';
import fs from 'fs';
import Handlebars from 'handlebars';
import { JSDOM } from 'jsdom';
import path from 'path';
import prettier from 'prettier';
import { optimize } from 'svgo';

type IconMetaData = Record<string, string[]>;

/**
 * SVG attributes that should be stripped from icon content. These are
 * presentational attributes set on the source SVG that conflict with the
 * runtime styling applied by the Icon wrapper component.
 */
const FILTERED_ATTRIBUTES = [
  'fill-opacity',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-opacity',
  'stroke-width',
  'stroke',
  'style',
];

/** A directory containing source SVG files. */
export interface SvgSource {
  /** Absolute or cwd-relative path to the directory. */
  path: string;
  /** Label for log output (e.g. 'lucide', 'custom'). */
  label: string;
  /**
   * Path to a JSON manifest whose keys are the source's canonical icon names.
   * When set, SVGs absent from the manifest are skipped — lucide ships
   * deprecated alias SVGs (byte-identical duplicates of canonical icons)
   * that its `icon-nodes.json` manifest deliberately omits.
   */
  manifest?: string;
}

export interface ImportIconsConfig {
  /**
   * Directories to scan for SVG files. When multiple sources contain the same
   * filename, later entries take priority (override earlier ones).
   */
  svgSources: SvgSource[];

  /** Paths to tags.json metadata files. Entries are deep-merged in order. */
  metadataSources: string[];

  /** Directory where generated component files are written. */
  outputPath: string;

  /** Directory containing the Handlebars templates. */
  templateDir: string;

  /**
   * Import path used in generated files for the SVGComponent type.
   * e.g. '../Icon/types' when generating inside the same package, or
   * '@grafana/icons' when an external consumer is generating its own
   * icon set using the same pipeline.
   */
  typeImportPath: string;

  /**
   * Expected icon dimensions. If set, a warning is logged for any SVG whose
   * width or height doesn't match.
   */
  iconSize?: number;

  /** SVG filenames (without extension) to exclude from processing. */
  excludeIcons?: string[];

  /**
   * Custom export name overrides. Keys are SVG filenames (without extension),
   * values are the desired PascalCase component name.
   */
  renamedIcons?: Record<string, string>;

  /**
   * Abbreviations that should be fully uppercased in generated component names.
   * For example, `["efl", "fa", "uefa"]` converts `EflCup` to `EFLCup`,
   * `FaCup` to `FACup`, and `UefaChampionsLeague` to `UEFAChampionsLeague`.
   */
  acronyms?: string[];

  /**
   * Explicit casing overrides for individual words. Keys are the lowercase
   * word as it appears in the kebab-case filename, values are the desired
   * casing in both the component name and title. For example,
   * `{ "youtube": "YouTube" }` produces component name `YouTube` and title
   * `"YouTube"`.
   */
  wordCasing?: Record<string, string>;
}

/**
 * Format TypeScript source using the project's .prettierrc config.
 */
export const prettierFormatTypescript = async (
  content: string,
): Promise<string> => {
  const config = await prettier.resolveConfig(process.cwd());
  return prettier.format(content, {
    ...config,
    parser: 'typescript',
  });
};

/**
 * Convert SVG attribute names from kebab-case to React camelCase, strip
 * blacklisted attributes, and remove fill attributes that aren't currentColor.
 */
const filterSvgAttributes = (svgContent: string): string => {
  const filteredContent = FILTERED_ATTRIBUTES.reduce((result, attr) => {
    const regex = new RegExp(`\\s*${attr}="[^"]*"`, 'g');
    return result.replace(regex, '');
  }, svgContent);

  const withoutFill = filteredContent.replace(
    /\s*fill="(?!currentColor")[^"]*"/g,
    '',
  );

  return withoutFill.replace(
    /\b([a-z]+(?:-[a-z]+)+)=/g,
    (_, attrName: string) => `${camelCase(attrName)}=`,
  );
};

/**
 * Build a title-cased display name from a kebab-case filename. Each word is
 * capitalized, words that match a configured acronym are fully uppercased,
 * and words with explicit casing overrides use that exact form.
 *
 * Examples (with acronyms `["efl", "uefa"]`, wordCasing `{ "youtube": "YouTube" }`):
 * - `"efl-cup"` → `"EFL Cup"`
 * - `"uefa-champions-league"` → `"UEFA Champions League"`
 * - `"youtube"` → `"YouTube"`
 * - `"waves-arrow-down"` → `"Waves Arrow Down"`
 */
const buildTitle = (
  filename: string,
  acronymSet: Set<string>,
  wordCasingMap: Map<string, string>,
): string =>
  filename
    .split('-')
    .map((word) => {
      if (wordCasingMap.has(word)) return wordCasingMap.get(word)!;
      if (acronymSet.has(word)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');

/**
 * Deep-merge two icon metadata objects, combining tag arrays for keys that
 * exist in both sources.
 */
const mergeIconMetaData = (
  base: IconMetaData,
  override: IconMetaData,
): IconMetaData => {
  const result: Record<string, string[]> = { ...base };

  for (const [key, values] of Object.entries(override)) {
    if (Object.hasOwn(result, key)) {
      result[key] = [...new Set([...result[key], ...values])];
    } else {
      result[key] = values;
    }
  }

  return result;
};

/**
 * Generic SVG-to-React-component import pipeline. Reads SVG files from one or
 * more source directories, optimizes them with SVGO, generates typed React
 * components via Handlebars templates, and writes barrel exports with an
 * AllIcons registry and icon metadata.
 */
export const importIcons = async (config: ImportIconsConfig): Promise<void> => {
  const {
    svgSources,
    metadataSources,
    outputPath,
    templateDir,
    typeImportPath,
    iconSize,
    excludeIcons = [],
    renamedIcons = {},
    acronyms = [],
    wordCasing = {},
  } = config;

  // Build regex replacements for acronyms and wordCasing overrides. Each
  // entry's PascalCase form (e.g. "Uefa", "Youtube") is replaced with the
  // desired casing (e.g. "UEFA", "YouTube"), but only at PascalCase word
  // boundaries (followed by an uppercase letter or end of string).
  const nameReplacements = [
    ...acronyms.map((a) => ({
      pattern: new RegExp(
        `${a.charAt(0).toUpperCase()}${a.slice(1).toLowerCase()}(?=[A-Z]|$)`,
        'g',
      ),
      replacement: a.toUpperCase(),
    })),
    ...Object.entries(wordCasing).map(([word, casing]) => ({
      pattern: new RegExp(
        `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}(?=[A-Z]|$)`,
        'g',
      ),
      replacement: casing,
    })),
  ];
  const acronymSet = new Set(acronyms.map((a) => a.toLowerCase()));
  const wordCasingMap = new Map(
    Object.entries(wordCasing).map(([k, v]) => [k.toLowerCase(), v]),
  );

  // Compile templates
  const iconTemplate = Handlebars.compile(
    fs.readFileSync(path.join(templateDir, 'Icon.tsx.hbs'), 'utf8'),
  );
  const iconTwoColourTemplate = Handlebars.compile(
    fs.readFileSync(path.join(templateDir, 'IconTwoColour.tsx.hbs'), 'utf8'),
  );
  const indexTemplate = Handlebars.compile(
    fs.readFileSync(path.join(templateDir, 'index.ts.hbs'), 'utf8'),
  );
  const allIconsTemplate = Handlebars.compile(
    fs.readFileSync(path.join(templateDir, 'allIcons.ts.hbs'), 'utf8'),
  );
  const iconMetadataTemplate = Handlebars.compile(
    fs.readFileSync(path.join(templateDir, 'iconMetaData.ts.hbs'), 'utf8'),
  );

  const warnings: Array<{ filename: string; width: number; height: number }> =
    [];

  /**
   * One DOM parser for the whole run.
   *
   * Constructing a `JSDOM` per icon leaks roughly 1.4MB each — a window brings
   * its own global object, event loop and timers, and `window.close()` does not
   * give that back. At ~2,000 lucide icons the process reached the V8 heap limit
   * and aborted partway through (exit 134), which is what broke the scheduled
   * consolidated-deps run. Reusing a single window keeps the run flat at a few
   * hundred MB.
   */
  const scratchHost = new JSDOM(
    '<!doctype html><body></body>',
  ).window.document.createElement('div');
  const parseSvg = (markup: string): Element | null => {
    // HTML parsing, matching the previous `new JSDOM(markup)` exactly — an XML
    // parse would serialize children with an added `xmlns` and self-closing
    // tags, changing every generated component.
    scratchHost.innerHTML = markup;
    return scratchHost.querySelector('svg');
  };

  // Ensure output directory exists
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  // Merge metadata from all sources
  let iconMetaData: IconMetaData = {};
  for (const metaPath of metadataSources) {
    if (fs.existsSync(metaPath)) {
      const data: IconMetaData = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      iconMetaData = mergeIconMetaData(iconMetaData, data);
    }
  }

  // Discover SVG files from all sources. Later sources override earlier ones.
  // Excludes only apply to earlier sources — later sources can provide
  // replacements for excluded names (e.g. custom icons replacing deprecated
  // upstream icons).
  const excludeSet = new Set(excludeIcons);
  const filesByName = new Map<string, { source: string; file: string }>();
  const lastSourceIndex = svgSources.length - 1;

  for (const [sourceIndex, source] of svgSources.entries()) {
    if (!fs.existsSync(source.path)) continue;

    const canonicalNames = source.manifest
      ? new Set(
          Object.keys(JSON.parse(fs.readFileSync(source.manifest, 'utf8'))),
        )
      : null;
    const isLastSource = sourceIndex === lastSourceIndex;
    const files = fs
      .readdirSync(source.path)
      .filter((f) => f.endsWith('.svg'))
      .filter((f) => isLastSource || !excludeSet.has(f.replace(/\.svg$/, '')))
      .filter(
        (f) =>
          canonicalNames === null ||
          canonicalNames.has(f.replace(/\.svg$/, '')),
      );

    for (const file of files) {
      const name = file.replace(/\.svg$/, '');
      const existing = filesByName.get(name);
      if (existing) {
        console.warn(
          `${colors.yellow('!')} ${source.label} icon overrides ${existing.source} icon: ${file}`,
        );
      }
      filesByName.set(name, { source: source.label, file });
    }
  }

  const svgFiles = [...filesByName.values()].sort((a, b) =>
    a.file.localeCompare(b.file),
  );

  // Build a lookup from source label → directory path
  const sourcePaths = new Map(svgSources.map((s) => [s.label, s.path]));

  // Process each SVG
  const iconNames: Record<string, { pascalCase: string; tags: string }> = {};

  for (const { file, source } of svgFiles) {
    const filename = path.parse(file).name;
    const iconName =
      renamedIcons[filename] ??
      nameReplacements.reduce(
        (name, { pattern, replacement }) => name.replace(pattern, replacement),
        pascalCase(filename).replaceAll('_', ''),
      );

    const svgPath = `${sourcePaths.get(source)}/${file}`;
    const svgString = fs.readFileSync(svgPath, 'utf8');
    const { data: optimizedSvgString } = optimize(svgString, {
      path: svgPath,
      multipass: true,
    });

    const svgElement = parseSvg(optimizedSvgString);
    const tags = Object.hasOwn(iconMetaData, filename)
      ? iconMetaData[filename]
      : [];

    if (svgElement === null) {
      throw new Error(`SVG element not found for ${file}`);
    }

    const width = parseInt(svgElement.getAttribute('width') ?? '0', 10);
    const height = parseInt(svgElement.getAttribute('height') ?? '0', 10);
    const viewBox =
      svgElement.getAttribute('viewBox') ?? `0 0 ${width} ${height}`;
    const fill = svgElement.getAttribute('fill');

    if (iconSize !== undefined && (width !== iconSize || height !== iconSize)) {
      warnings.push({ filename, width, height });
    }

    // Detect two-color icons via data-role attributes on inner elements
    const bgElements = svgElement.querySelectorAll('[data-role="background"]');
    const fgElements = svgElement.querySelectorAll('[data-role="foreground"]');
    const isTwoColour =
      fill === 'solid' && bgElements.length > 0 && fgElements.length > 0;

    let iconOutput: string;

    if (isTwoColour) {
      // Extract default colors from the first attributed element of each role
      const bgDefault = bgElements[0].getAttribute('fill') ?? 'white';
      const fgDefault = fgElements[0].getAttribute('fill') ?? 'currentColor';

      // Replace fill values with JSX expressions and strip data-role attributes
      let twoColourContent = svgElement.innerHTML;

      // Replace background-role fills with {backgroundColor}
      bgElements.forEach((el) => {
        const elFill = el.getAttribute('fill');
        if (elFill) {
          // Build a regex matching this specific element's opening tag with its fill
          const escaped = el.outerHTML.replace(/\s*data-role="background"/, '');
          const withJsx = escaped.replace(
            `fill="${elFill}"`,
            'fill={backgroundColor}',
          );
          twoColourContent = twoColourContent.replace(el.outerHTML, withJsx);
        }
      });

      // Replace foreground-role fills with {foregroundColor}
      fgElements.forEach((el) => {
        const elFill = el.getAttribute('fill');
        if (elFill) {
          const escaped = el.outerHTML.replace(/\s*data-role="foreground"/, '');
          const withJsx = escaped.replace(
            `fill="${elFill}"`,
            'fill={foregroundColor}',
          );
          twoColourContent = twoColourContent.replace(el.outerHTML, withJsx);
        }
      });

      const svgContent = filterSvgAttributes(twoColourContent);

      iconOutput = await prettierFormatTypescript(
        iconTwoColourTemplate({
          name: iconName,
          title: buildTitle(filename, acronymSet, wordCasingMap),
          viewBox,
          svgContent,
          fill,
          typeImportPath,
          backgroundColor: bgDefault,
          foregroundColor: fgDefault,
        }),
      );
    } else {
      const svgContent = filterSvgAttributes(svgElement.innerHTML);

      iconOutput = await prettierFormatTypescript(
        iconTemplate({
          name: iconName,
          title: buildTitle(filename, acronymSet, wordCasingMap),
          viewBox,
          svgContent,
          fill,
          typeImportPath,
        }),
      );
    }

    const iconOutputPath = `${outputPath}/${iconName}.tsx`;

    // On case-insensitive filesystems, overwriting a file doesn't update the
    // directory entry's case. Unconditionally remove before writing so the
    // new filename is always recorded with the correct capitalization.
    try {
      fs.unlinkSync(iconOutputPath);
    } catch {
      // File doesn't exist yet — that's fine
    }

    try {
      fs.writeFileSync(iconOutputPath, iconOutput, 'utf8');
      console.log(
        `${colors.green('✓')} Wrote icon component file to: ${colors.bold(iconOutputPath)}`,
      );
    } catch (error) {
      console.error(
        `${colors.red('✗')} An error occurred writing icon component file '${iconOutputPath}': ${error}`,
      );
    }

    iconNames[filename] = {
      pascalCase: iconName,
      tags: JSON.stringify(tags),
    };
  }

  // Remove stale icon components that no longer have a source SVG.
  // Uses case-insensitive comparison because macOS (case-insensitive FS)
  // may report a file under its original case after an overwrite with a
  // differently-cased name.
  const generatedNamesLower = new Set(
    Object.values(iconNames).map((v) => `${v.pascalCase}.tsx`.toLowerCase()),
  );
  const existingFiles = fs
    .readdirSync(outputPath)
    .filter((f) => f.endsWith('.tsx'));

  for (const file of existingFiles) {
    if (!generatedNamesLower.has(file.toLowerCase())) {
      fs.unlinkSync(`${outputPath}/${file}`);
      console.log(
        `${colors.red('✗')} Removed stale icon component: ${colors.bold(file)}`,
      );
    }
  }

  // When there are no icons, write valid empty barrel files and exit early.
  if (Object.keys(iconNames).length === 0) {
    const emptyIndex =
      'export {};\n' +
      'export type IconName = never;\n' +
      'export { AllIcons } from "./allIcons";\n' +
      'export { iconMetaData } from "./iconMetaData";\n';
    const emptyAllIcons =
      `import type { SVGComponent } from '${typeImportPath}';\n` +
      'import type { IconName } from ".";\n' +
      'export const AllIcons: Record<IconName, SVGComponent> = {};\n';
    const emptyMetaData =
      'import type { IconName } from ".";\n' +
      'export const iconMetaData: Record<IconName, string[]> = {};\n';

    fs.writeFileSync(
      `${outputPath}/index.ts`,
      await prettierFormatTypescript(emptyIndex),
      'utf8',
    );
    fs.writeFileSync(
      `${outputPath}/allIcons.ts`,
      await prettierFormatTypescript(emptyAllIcons),
      'utf8',
    );
    fs.writeFileSync(
      `${outputPath}/iconMetaData.ts`,
      await prettierFormatTypescript(emptyMetaData),
      'utf8',
    );

    try {
      execSync(
        `eslint --fix ${outputPath}/index.ts ${outputPath}/allIcons.ts`,
        { stdio: 'pipe' },
      );
    } catch {
      // eslint --fix may exit non-zero for unfixable issues
    }

    console.log(
      `${colors.yellow('!')} No SVG files found — wrote empty barrel files.`,
    );
    return;
  }

  // Generate barrel exports
  const templateData = { iconNames, typeImportPath };

  const indexOutput = await prettierFormatTypescript(
    indexTemplate(templateData),
  );
  const indexOutputPath = `${outputPath}/index.ts`;
  fs.writeFileSync(indexOutputPath, indexOutput, 'utf8');
  console.log(
    `${colors.green('✓')} Wrote icon exports to: ${colors.bold(indexOutputPath)}`,
  );

  const allIconsOutput = await prettierFormatTypescript(
    allIconsTemplate(templateData),
  );
  const allIconsOutputPath = `${outputPath}/allIcons.ts`;
  fs.writeFileSync(allIconsOutputPath, allIconsOutput, 'utf8');
  console.log(
    `${colors.green('✓')} Wrote allIcons export to: ${colors.bold(allIconsOutputPath)}`,
  );

  // Fix import/export ordering via eslint
  try {
    execSync(`eslint --fix ${indexOutputPath} ${allIconsOutputPath}`, {
      stdio: 'pipe',
    });
  } catch {
    // eslint --fix exits non-zero if there are unfixable issues; the
    // fixable ones (import/export order) will still have been applied.
  }
  console.log(
    `${colors.green('✓')} Fixed lint ordering for: ${colors.bold(indexOutputPath)}, ${colors.bold(allIconsOutputPath)}`,
  );

  const iconMetadataOutput = await prettierFormatTypescript(
    iconMetadataTemplate(templateData),
  );
  const iconMetadataOutputPath = `${outputPath}/iconMetaData.ts`;
  fs.writeFileSync(iconMetadataOutputPath, iconMetadataOutput, 'utf8');
  console.log(
    `${colors.green('✓')} Wrote iconMetaData to: ${colors.bold(iconMetadataOutputPath)}`,
  );

  if (warnings.length) {
    console.error(
      `${colors.yellow('!')} The viewbox dimensions for the following components were not ${iconSize}×${iconSize}:`,
    );
    warnings.forEach(({ filename, width, height }) => {
      console.error(
        `${colors.yellow('↳')} ${filename}: ${colors.bold(`${width}×${height}`)}`,
      );
    });
  }
};

/**
 * CLI entry point. When run directly with `tsx scripts/importIcons.ts <config>`,
 * reads the config JSON file and runs the pipeline. The templateDir path in
 * the config is resolved relative to the config file's directory.
 */
const configPath = process.argv[2];
if (configPath) {
  const resolvedConfigPath = path.resolve(configPath);
  const configDir = path.dirname(resolvedConfigPath);
  const raw: ImportIconsConfig = JSON.parse(
    fs.readFileSync(resolvedConfigPath, 'utf8'),
  );

  // Resolve templateDir relative to the config file location
  const config: ImportIconsConfig = {
    ...raw,
    templateDir: path.resolve(configDir, raw.templateDir),
    svgSources: raw.svgSources.map((s) => ({
      ...s,
      path: path.resolve(configDir, s.path),
      ...(s.manifest ? { manifest: path.resolve(configDir, s.manifest) } : {}),
    })),
    metadataSources: raw.metadataSources.map((p) => path.resolve(configDir, p)),
    outputPath: path.resolve(configDir, raw.outputPath),
  };

  importIcons(config);
}
