mkdir -p target
mkdir -p vm/lib
rustc --crate-type=staticlib ./vm/vm.rs --out-dir ./vm/lib 
# rustc --target wasm32-unknown-unknown --crate-type cdylib ./vm/vm.rs --out-dir ./vm/lib
