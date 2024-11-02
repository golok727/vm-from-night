Playing around with things
## Build vm
```bash
chmod +x build_vm.sh
./build_vm.sh
```

### Test simple program
```bash
rustc main.rs -L ./vm/lib -l static=vm -o ./target/main 
./target/main
```

## use .thing file
```bash
node ./compiler.mjs ./thing/code.thing # jit
node ./compiler.mjs ./thing/code.thing run # jit

node ./compiler.mjs ./thing/code.thing compile && ./target/code # compiled
```