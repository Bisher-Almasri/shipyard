const fs = require('fs');

const file = process.argv[2];

if (!file) {
	console.log('Usage: node log-errors.js <logfile>');
	process.exit(1);
}

const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

const ignored404s = [
	'/favicon.ico',
	'/apple-touch-icon.png',
	'/apple-touch-icon-precomposed.png',
	'/meta.json',
	'.css.map',
	'wlwmanifest.xml',
	'xmlrpc.php',
	'/wp-',
	'/wordpress',
	'/blog/',
	'/cms/',
	'/feed/',
	'/license.txt',
	'/.env',
	'/mcp',
	'/sse'
];

function shouldIgnore(line) {
	return ignored404s.some((x) => line.includes(x));
}

function isRealError(line) {
	// Real server errors
	if (line.includes('[500]')) return true;

	// JS/runtime errors
	if (line.match(/(ReferenceError|TypeError|SyntaxError|Unhandled|Exception)/i)) {
		return true;
	}

	// Explicit error messages
	if (line.match(/Error:|Failed to fetch|Unauthorized|access_denied|exceeds limit/i)) {
		return true;
	}

	// Important 404s only
	if (line.includes('[404]')) {
		if (shouldIgnore(line)) return false;

		return true;
	}

	return false;
}

const errors = [];

for (let i = 0; i < lines.length; i++) {
	const clean = lines[i]
		.replace(/\x1b\[[0-9;]*m/g, '') // remove ANSI colors
		.trim();

	if (isRealError(clean)) {
		errors.push({
			line: i + 1,
			text: clean
		});
	}
}

console.log(`Found ${errors.length} important errors\n`);

for (const err of errors) {
	console.log(`[Line ${err.line}] ${err.text}`);
}
