import { readFileSync } from "node:fs";

const wasmCode = readFileSync("./vm/lib/vm.wasm");

const decoder = new TextDecoder("utf-8");
async function loadWasm() {
	const wasm = await WebAssembly.instantiate(wasmCode, {
		env: {
			js_print_value: (ptr, length) => {
				const messageBuffer = wasm.instance.exports.memory.buffer.slice(
					ptr,
					ptr + length
				);
				const uint8Array = new Uint8Array(messageBuffer);
				const message = decoder.decode(uint8Array);
				console.log(message);
			},
			js_report_error: (ptr, length) => {
				const messageBuffer = wasm.instance.exports.memory.buffer.slice(
					ptr,
					ptr + length
				);
				const uint8Array = new Uint8Array(messageBuffer);
				const message = decoder.decode(uint8Array);
				console.error(message);
			},
		},
	});
	return wasm;
}

export async function executeByteCode(byteCode) {
	const wasm = await loadWasm();
	const ptr = wasm.instance.exports.alloc(1020);

	const memory = wasm.instance.exports.memory.buffer;

	const byteCodeView = new Uint8Array(byteCode);

	const memBufferView = new Uint8Array(memory);
	memBufferView.set(byteCodeView, ptr);

	wasm.instance.exports.execute_bytecode(ptr, byteCodeView.byteLength);
}
