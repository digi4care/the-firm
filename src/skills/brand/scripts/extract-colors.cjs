#!/usr/bin/env node
/**
 * extract-colors.cjs
 *
 * Extract dominant colors from an image and compare against brand palette.
 * Uses pure Node.js without external image processing dependencies.
 *
 * For full color extraction from images, integrate with ai-multimodal skill
 * or use ImageMagick via shell commands.
 *
 * Usage:
 *   node extract-colors.cjs <image-path>
 *   node extract-colors.cjs <image-path> --brand-file <path>
 *   node extract-colors.cjs --palette  # Show brand palette from guidelines
 *
 * Integration:
 *   For image color analysis, use: ai-multimodal skill or ImageMagick
 *   magick <image> -colors 10 -depth 8 -format "%c" histogram:info:
 */

const fs = require("node:fs");
const path = require("node:path");

// Default brand guidelines path
const DEFAULT_GUIDELINES_PATH = "docs/brand-guidelines.md";

/**
 * Extract hex colors from markdown content
 */
function extractHexColors(text) {
	const hexPattern = /#[0-9A-Fa-f]{6}\b/g;
	return [...new Set(text.match(hexPattern) || [])];
}

/**
 * Parse brand guidelines for color palette
 */
function parseBrandColors(guidelinesPath) {
	const resolvedPath = path.isAbsolute(guidelinesPath)
		? guidelinesPath
		: path.join(process.cwd(), guidelinesPath);

	if (!fs.existsSync(resolvedPath)) {
		return null;
	}

	const content = fs.readFileSync(resolvedPath, "utf-8");

	const palette = {
		primary: [],
		secondary: [],
		neutral: [],
		semantic: [],
		all: [],
	};

	// Extract colors from different sections
	const sections = [
		{ name: "primary", regex: /### Primary[\s\S]*?(?=###|##|$)/i },
		{ name: "secondary", regex: /### Secondary[\s\S]*?(?=###|##|$)/i },
		{ name: "neutral", regex: /### Neutral[\s\S]*?(?=###|##|$)/i },
		{ name: "semantic", regex: /### Semantic[\s\S]*?(?=###|##|$)/i },
	];

	sections.forEach(({ name, regex }) => {
		const match = content.match(regex);
		if (match) {
			const colors = extractHexColors(match[0]);
			palette[name] = colors;
			palette.all.push(...colors);
		}
	});

	// Dedupe all
	palette.all = [...new Set(palette.all)];

	return palette;
}

/**
 * Convert hex to RGB
 */
function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16),
			}
		: null;
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r, g, b) {
	return (
		"#" +
		[r, g, b]
			.map((x) => {
				const hex = Math.round(x).toString(16);
				return hex.length === 1 ? `0${hex}` : hex;
			})
			.join("")
			.toUpperCase()
	);
}

/**
 * Calculate color distance (Euclidean in RGB space)
 */
function colorDistance(color1, color2) {
	const rgb1 = typeof color1 === "string" ? hexToRgb(color1) : color1;
	const rgb2 = typeof color2 === "string" ? hexToRgb(color2) : color2;

	if (!rgb1 || !rgb2) return Infinity;

	return Math.sqrt((rgb1.r - rgb2.r) ** 2 + (rgb1.g - rgb2.g) ** 2 + (rgb1.b - rgb2.b) ** 2);
}

/**
 * Find nearest brand color
 */
function findNearestBrandColor(color, brandColors) {
	let nearest = null;
	let minDistance = Infinity;

	brandColors.forEach((brandColor) => {
		const distance = colorDistance(color, brandColor);
		if (distance < minDistance) {
			minDistance = distance;
			nearest = brandColor;
		}
	});

	return { color: nearest, distance: minDistance };
}

/**
 * Calculate brand compliance percentage
 * Distance threshold: 50 (out of max ~441 for RGB)
 */
function calculateCompliance(extractedColors, brandColors, threshold = 50) {
	if (!extractedColors || extractedColors.length === 0) return 100;
	if (!brandColors || brandColors.length === 0) return 0;

	let matchCount = 0;

	extractedColors.forEach((color) => {
		const nearest = findNearestBrandColor(color, brandColors);
		if (nearest.distance <= threshold) {
			matchCount++;
		}
	});

	return Math.round((matchCount / extractedColors.length) * 100);
}

/**
 * Generate ImageMagick command for color extraction
 */
function generateImageMagickCommand(imagePath, numColors = 10) {
	return `magick "${imagePath}" -colors ${numColors} -depth 8 -format "%c" histogram:info:`;
}

/**
 * Parse ImageMagick histogram output to extract colors
 */
function parseImageMagickOutput(output) {
	const colors = [];
	const lines = output.trim().split("\n");

	lines.forEach((line) => {
		// Match pattern like: 12345: (255,128,64) #FF8040 srgb(255,128,64)
		const hexMatch = line.match(/#([0-9A-Fa-f]{6})/);
		const countMatch = line.match(/^\s*(\d+):/);

		if (hexMatch) {
			colors.push({
				hex: `#${hexMatch[1].toUpperCase()}`,
				count: countMatch ? parseInt(countMatch[1], 10) : 0,
			});
		}
	});

	// Sort by count (most common first)
	colors.sort((a, b) => b.count - a.count);

	return colors;
}

/**
 * Display brand palette
 */
function displayPalette(palette) {
	if (palette.primary.length > 0) {
		palette.primary.forEach((_c) => {});
	}

	if (palette.secondary.length > 0) {
		palette.secondary.forEach((_c) => {});
	}

	if (palette.neutral.length > 0) {
		palette.neutral.forEach((_c) => {});
	}

	if (palette.semantic.length > 0) {
		palette.semantic.forEach((_c) => {});
	}
}

/**
 * Main function
 */
function main() {
	const args = process.argv.slice(2);
	const jsonOutput = args.includes("--json");
	const showPalette = args.includes("--palette");
	const brandFileIdx = args.indexOf("--brand-file");
	const brandFile = brandFileIdx !== -1 ? args[brandFileIdx + 1] : DEFAULT_GUIDELINES_PATH;
	const brandFileValue = brandFileIdx !== -1 ? args[brandFileIdx + 1] : null;
	const imagePath = args.find((a) => !a.startsWith("--") && a !== brandFileValue);

	// Load brand palette
	const brandPalette = parseBrandColors(brandFile);

	if (!brandPalette) {
		process.exit(1);
	}

	// Show palette mode
	if (showPalette || !imagePath) {
		if (jsonOutput) {
		} else {
			displayPalette(brandPalette);

			if (!imagePath) {
			}
		}
		return;
	}

	// Resolve image path
	const resolvedPath = path.isAbsolute(imagePath) ? imagePath : path.join(process.cwd(), imagePath);

	if (!fs.existsSync(resolvedPath)) {
		process.exit(1);
	}

	// Generate extraction instructions
	const result = {
		image: resolvedPath,
		brandPalette: brandPalette,
		extractionCommand: generateImageMagickCommand(resolvedPath),
		instructions: [
			"1. Run the ImageMagick command to extract colors:",
			`   ${generateImageMagickCommand(resolvedPath)}`,
			"",
			"2. Or use the ai-multimodal skill:",
			`   python .claude/skills/ai-multimodal/scripts/gemini_batch_process.py \\`,
			`     --files "${resolvedPath}" \\`,
			`     --task analyze \\`,
			`     --prompt "Extract the 10 most dominant colors as hex values"`,
			"",
			"3. Then compare extracted colors against brand palette",
		],
		complianceCheck: {
			threshold: 50,
			description: "Colors within distance 50 (RGB space) are considered brand-compliant",
			brandColors: brandPalette.all,
		},
	};

	if (jsonOutput) {
	} else {
		result.instructions.forEach((_line) => {});
	}
}

// Export functions for use as module
module.exports = {
	parseBrandColors,
	hexToRgb,
	rgbToHex,
	colorDistance,
	findNearestBrandColor,
	calculateCompliance,
	parseImageMagickOutput,
};

// Run if called directly
if (require.main === module) {
	main();
}
