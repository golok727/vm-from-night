import { execSync } from "node:child_process";
import fs, { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const OP_LOAD = 0x01;
const OP_ADD = 0x02;
const OP_PRINT = 0x03;

class InstructionBuffer {
	constructor(initialSize = 1024) {
		this._buffer = Buffer.alloc(initialSize);
		this._length = 0;
	}

	_ensureCapacity(size) {
		if (this._length + size > this._buffer.length) {
			const newSize = Math.max(this._buffer.length * 2, this._length + size);
			const newBuffer = Buffer.alloc(newSize);
			this._buffer.copy(newBuffer);
			this._buffer = newBuffer;
		}
	}

	pushLoad(value) {
		this._ensureCapacity(5);
		this._buffer.writeUInt8(OP_LOAD, this._length);
		this._buffer.writeInt32LE(value, this._length + 1);
		this._length += 5;
	}

	pushAdd() {
		this._ensureCapacity(1);
		this._buffer.writeUInt8(OP_ADD, this._length);
		this._length += 1;
	}

	pushPrint() {
		this._ensureCapacity(1);
		this._buffer.writeUInt8(OP_PRINT, this._length);
		this._length += 1;
	}

	getBuffer() {
		return this._buffer.slice(0, this._length);
	}
}

/**
 * @type {Record<string, (buffer: InstructionBuffer, args: string) => void>} buffer
 */
const Operations = {
	LOAD: (buffer, args) => {
		if (args === null) throw new Error("LOAD: argument missing");
		const match = args.trim().match(/^(\d+)/);

		if (!match) throw new Error("LOAD: Bad usage (LOAD <int>)");

		const val = Number.parseInt(match[1]);

		buffer.pushLoad(val);
	},
	ADD: (buffer) => {
		buffer.pushAdd();
	},
	PRINT: (buffer) => {
		buffer.pushPrint();
	},
};

const INSTRUCTION_REGEX = /(?<instruction>\w+)\s?\s+?(?<args>.*)/;
class Compiler {
	constructor(src) {
		this.src = src;
		this.buffer = new InstructionBuffer();
	}

	parse() {
		const lines = this.src.split("\n");
		for (const line of lines) {
			const match = line.match(INSTRUCTION_REGEX);
			if (match?.groups) {
				const { instruction, args } = match.groups;
				if (instruction && Operations[instruction]) {
					Operations[instruction](this.buffer, args ?? null);
				} else {
					console.warn(`Invalid op: "${instruction}". Skipping!`);
				}
			}
		}
		return this.buffer.getBuffer();
	}
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

/**
 *
 * @param {Buffer} byteCode
 * @param {string} outName
 */
function createExecutable(byteCode, outName = "compiled") {
	const bufferInput = Array.from(byteCode)
		.map((v) => `0x${v.toString(16)}`)
		.join(",");

	const code = codeGen({
		constants: [`const INSTRUCTIONS: &[u8] = &[${bufferInput}];`],
		compileCodeArgs: "INSTRUCTIONS",
	});

	console.log(code);

	compileWithRustC(code, outName);
}

try {
	const [filePath] = process.argv.splice(2);

	if (filePath === undefined) throw "Usage: cli.mjs any.pgm";

	const src = readFileSync(path.resolve(filePath), { encoding: "utf-8" });

	const outName = path.basename(filePath, path.extname(filePath));
	const compiler = new Compiler(src, outName);
	const byteCode = compiler.parse();

	createExecutable(byteCode, outName);
} catch (e) {
	console.error("Error creating executable!");
	console.error(e);
}
