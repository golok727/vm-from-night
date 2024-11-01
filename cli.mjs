import { execSync } from "node:child_process";
import fs, { writeFileSync } from "node:fs";
import path from "node:path";

class Parser {
	constructor(src) {
		this.src = src;
	}

	parse() {}
}

const template = `
extern "Rust" {
    fn run_vm(code: &[u8]);
}
{{ constants }}
fn main() {
{{ beforeRun }}
unsafe {
  run_vm({{ compileCodeArgs }});
}
{{ afterRun }}
}
`;

function codeGen(fill = Object.create(null)) {
	const code = template.replaceAll(/\{\{\s*(\w+)\s*\}\}/g, (_, match) => {
		if (fill[match] !== undefined) {
			const thing = fill[match];
			if (Array.isArray(thing)) return thing.join("\n");
			return fill[match];
		}
		return "";
	});

	return code;
}

function clean(dir = path.resolve("./temp")) {
	console.log("> Cleaning Artifacts!");
	fs.rm(dir, { recursive: true, force: true }, () =>
		console.log("> Cleaned Artifacts!")
	);
}

function quit(code = 1) {
	code === 1 ? console.error("Quitting...") : console.log("> Quitting...");
	process.exit(code);
}

function compileWithRustC(code, outName) {
	const rsFilePath = path.resolve(`./temp/${outName || "main"}.rs`);
	const tempDir = path.dirname(rsFilePath);

	fs.mkdirSync(tempDir, { recursive: true });
	writeFileSync(path.resolve(`./temp/${outName || "main"}.rs`), code, {});
	console.info("> Staring compilation!");

	try {
		execSync(`rustc ${rsFilePath} -L ./vm/lib -l static=compiler`);
	} catch (err) {
		console.error("> Error compiling");
		clean(tempDir);
		quit(1);
	} finally {
		clean(tempDir);
	}
}

function createExecutable(instructionsFilePath, outName = "compiled") {
	const filePath = path.resolve(instructionsFilePath);

	const buffer = fs.readFileSync(filePath);

	const bufferInput = Array.from(buffer)
		.map((v) => `0x${v.toString(16)}`)
		.join(",");

	const code = codeGen({
		constants: [`const INSTRUCTIONS: &[u8] = &[${bufferInput}];`],
		compileCodeArgs: "INSTRUCTIONS",
	});

	compileWithRustC(code, outName);
}

try {
	const [filename] = process.argv.splice(2);
	if (filename === undefined) throw "Usage: cli.mjs any.pgm";
	createExecutable(filename);
} catch (e) {
	console.error("Error creating executable!");
	console.error(e);
}
