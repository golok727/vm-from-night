const OP_LOAD: u8 = 0x01;
const OP_ADD: u8 = 0x02;
const OP_PRINT: u8 = 0x03;

struct Compiler<'a> {
    ip: usize,
    stack: Vec<i32>,
    code: &'a [u8],
}

impl<'a> Compiler<'a> {
    pub fn new(code: &'a [u8]) -> Self {
        Self {
            ip: 0,
            stack: Vec::new(),
            code,
        }
    }

    pub fn compile(&self) -> Result<(), ()> {
        Ok(())
    }
}

#[no_mangle]
pub fn compile_code(code: &[u8]) {
    let mut compiler = Compiler::new(code);
    compiler.compile().unwrap();
}
