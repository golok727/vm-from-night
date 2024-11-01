testing some things out

## Build compiler
```bash
chmod +x build_compiler.sh
./build_compiler.sh
```

### Test simple program

```bash
rustc main.rs -L ./compiler/lib -l static=compiler -o ./target/main
./target/main
```

## use .pgm file
```bash
node ./cli.mjs ./thing.pgm
```