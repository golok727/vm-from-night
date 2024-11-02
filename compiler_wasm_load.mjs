import { readFileSync } from "node:fs";

const wasmCode = readFileSync("./vm/lib/vm.wasm");

const decoder = new TextDecoder("utf-8");
export function readString(ptr, len, instance) {
	const m = new Uint8Array(instance.exports.memory.buffer, ptr, len);
	return decoder.decode(m.slice(0, len));
}

async function loadWasm() {
	const wasm = await WebAssembly.instantiate(wasmCode, {
		env: {
			// for these two function we don't have ownership of the string so rust will free it
			js_print_value: (ptr, length) => {
				{
					const message = readString(ptr, length, wasm.instance);
					console.log(message);
				}
			},
			js_report_error: (ptr, length) => {
				const message = readString(ptr, length, wasm.instance);
				console.error(message);
			},
		},
	});
	return wasm;
}

export async function executeByteCode(byteCode) {
	const wasm = await loadWasm();

	const ptr = wasm.instance.exports.__wasm_alloc(byteCode.byteLength);
	const mem = new Uint8Array(
		wasm.instance.exports.memory.buffer,
		ptr,
		byteCode.byteLength
	);

	mem.set(new Uint8Array(byteCode));

	wasm.instance.exports.execute_bytecode(ptr, byteCode.byteLength);
	wasm.instance.exports.__wasm_free(ptr, byteCode.byteLength);
}
