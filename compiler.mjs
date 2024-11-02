#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs, { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { executeByteCode } from "./compiler_wasm_load.mjs";

const OP_LOAD = 0x01;
const OP_ADD = 0x02;
const OP_PRINT = 0x03;
const OP_END = 0x04;

class DynBuffer {
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

	writeU8(value) {
		this._ensureCapacity(1);
		this._length = this._buffer.writeUInt8(value, this._length);
	}

	writeInt32(value) {
		this._ensureCapacity(4);
		this._length = this._buffer.writeInt32LE(value, this._length);
	}

	getBuffer() {
		return this._buffer.subarray(0, this._length); // Return only the used portion of the buffer
	}
}

/**
 * @type {Record<string, (buffer: DynBuffer, args: string) => void>} buffer
 */
const Operations = {
	LOAD: (buffer, args) => {
		if (args === null) throw new Error("LOAD: argument missing");
		const match = args.trim().match(/^(\d+)/);

		if (!match) throw new Error("LOAD: Bad usage (LOAD <int>)");

		const val = Number.parseInt(match[1]);

		buffer.writeU8(OP_LOAD);
		buffer.writeInt32(val);
	},
	ADD: (buffer) => {
		buffer.writeU8(OP_ADD);
	},
	PRINT: (buffer) => {
		buffer.writeU8(OP_PRINT);
	},
	END: (buffer) => {
		buffer.writeU8(OP_END);
	},
};

const INSTRUCTION_REGEX = /(?<instruction>\w+)(?<args>.*)?/;
class Compiler {
	constructor(src) {
		this.src = src;
		this.buffer = new DynBuffer();
	}

	parse() {
		const lines = this.src.split("\n");
		for (const line of lines) {
			const match = line.trim().match(INSTRUCTION_REGEX);
			if (match?.groups) {
				const { instruction, args } = match.groups;
				if (instruction && Operations[instruction.toUpperCase()]) {
					Operations[instruction.toUpperCase()](this.buffer, args ?? null);
				} else {
					console.warn(`Invalid op: "${instruction}". Skipping!`);
				}
			}
		}
		return this.buffer.getBuffer();
	}
}

const template = `
extern "C" {
    fn execute_bytecode(code: *const u8, length: usize);
}
{{ constants }}
fn main() {
{{ beforeRun }}
unsafe {
  execute_bytecode({{ compileCodeArgs }});
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

function compileWithRustC(code, outName, { optimized = true } = {}) {
	const rsFilePath = path.resolve(`./temp/${outName || "main"}.rs`);
	const tempDir = path.dirname(rsFilePath);

	fs.mkdirSync(tempDir, { recursive: true });
	writeFileSync(path.resolve(`./temp/${outName || "main"}.rs`), code, {});
	console.info("> Staring compilation!");

	try {
		// todo
		const OPT_FLAGS = optimized ? "" : "";
		execSync(
			`rustc ${rsFilePath} ${OPT_FLAGS} -L ./vm/lib -l static=vm -o ./target/${outName}`
		);
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
		compileCodeArgs: "INSTRUCTIONS.as_ptr(), INSTRUCTIONS.len()",
	});

	compileWithRustC(code, outName);
}

(async () => {
	try {
		const [filePath, opt] = process.argv.splice(2);

		if (filePath === undefined) throw "Usage: compiler.mjs any.thing";

		const src = readFileSync(path.resolve(filePath), { encoding: "utf-8" });
		const compiler = new Compiler(src);
		const byteCode = compiler.parse();

		switch (opt) {
			case undefined:
			case "run": {
				await executeByteCode(byteCode);
				break;
			}

			case "compile": {
				const outName = path.basename(filePath, path.extname(filePath));

				createExecutable(byteCode, outName);
				break;
			}

			default:
				throw `Invalid option: ${opt}`;
		}
	} catch (e) {
		console.error("Error", e);
	}
})();
