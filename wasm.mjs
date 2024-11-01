import { readFileSync } from "node:fs";

const wasmCode = readFileSync("./vm/lib/vm.wasm");

(async () => {
	const wasm = await WebAssembly.instantiate(wasmCode);
	console.log(wasm.instance.exports.run_vm());
	console.log(wasm.instance.exports);
})();
