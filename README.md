testing some things out

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

## use .pgm file
```bash
node ./cli.mjs ./thing.pgm
```