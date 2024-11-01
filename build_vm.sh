mkdir -p target
mkdir -p vm/lib
rustc --crate-type=staticlib ./vm/vm.rs -o ./vm/lib/libvm.a
