if [ ! -f target ]; then
  mkdir -p target
fi

if [ ! -f target ]; then
  mkdir -p vm/lib
fi

rustc --crate-type=staticlib ./vm/vm.rs --out-dir ./vm/lib 
rustc --target wasm32-unknown-unknown --crate-type cdylib ./vm/vm.rs --out-dir ./vm/lib
