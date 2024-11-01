const OP_LOAD: u8 = 0x01;
const OP_ADD: u8 = 0x02;
const OP_PRINT: u8 = 0x03;

struct Compiler<'a> {
    ip: usize,
    stack: Vec<i32>,
    code: &'a [u8],
}

enum CompilationError {
    UnknownCode,
    UnexpectedEOF,
}

impl<'a> Compiler<'a> {
    pub fn new(code: &'a [u8]) -> Self {
        Self {
            ip: 0,
            stack: Vec::new(),
            code,
        }
    }

    pub fn compile(&mut self) -> Result<(), CompilationError> {
        match self.code[self.ip] {
            OP_LOAD => self.op_load()?,
            OP_ADD => self.op_add()?,
            OP_PRINT => self.op_print()?,
            _ => {
                return Err(CompilationError::UnknownCode);
            }
        }
        Ok(())
    }

    #[inline]
    pub fn read_byte(&mut self) -> Option<u8> {
        if self.ip < self.code.len() {
            let item = Some(self.code[self.ip]);
            self.ip += 1;
            item
        } else {
            None
        }
    }

    pub fn op_add(&mut self) -> Result<(), CompilationError> {
        Ok(())
    }

    pub fn op_print(&mut self) -> Result<(), CompilationError> {
        Ok(())
    }

    pub fn op_load(&mut self) -> Result<(), CompilationError> {
        self.read_byte().ok_or(CompilationError::UnexpectedEOF)?;

        let a = self.read_byte().ok_or(CompilationError::UnexpectedEOF)?;
        let b = self.read_byte().ok_or(CompilationError::UnexpectedEOF)?;
        let c = self.read_byte().ok_or(CompilationError::UnexpectedEOF)?;
        let d = self.read_byte().ok_or(CompilationError::UnexpectedEOF)?;

        let value = i32::from_le_bytes([a, b, c, d]);
        dbg!(value);
        self.stack.push(value);
        todo!();
        // Ok(())
    }
}

#[no_mangle]
pub fn compile_code(code: &[u8]) {
    let mut compiler = Compiler::new(code);
    let _ = compiler.compile();
}
