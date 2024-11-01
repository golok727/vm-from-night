use std::fmt;

const OP_LOAD: u8 = 0x01;
const OP_ADD: u8 = 0x02;
const OP_PRINT: u8 = 0x03;

struct Compiler<'a> {
    ip: usize,
    stack: Vec<i32>,
    code: &'a [u8],
}

#[derive(Debug, Clone)]
enum CompilationError {
    UnknownCode,
    UnexpectedEOF,
    InsufficientArguments,
}

impl fmt::Display for CompilationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let message = match self {
            Self::UnknownCode => "Unknown Byte Code",
            Self::UnexpectedEOF => "Unexpected End of file",
            Self::InsufficientArguments => "InsufficientArguments",
        };

        write!(f, "[CompilationError]: {message}")
    }
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
        while let Some(opcode) = self.read_byte() {
            match opcode {
                OP_LOAD => self.op_load()?,
                OP_ADD => self.op_add()?,
                OP_PRINT => self.op_print()?,
                _ => {
                    return Err(CompilationError::UnknownCode);
                }
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
        let a = self.stack.pop().ok_or(CompilationError::InsufficientArguments)?;
        let b = self.stack.pop().ok_or(CompilationError::InsufficientArguments)?;
        self.stack.push(a + b);
        Ok(())
    }

    pub fn op_print(&mut self) -> Result<(), CompilationError> {
        let to_print = self.stack.last().ok_or(CompilationError::InsufficientArguments)?;
        println!("[STD_OUT] {}", to_print);
        Ok(())
    }

    pub fn op_load(&mut self) -> Result<(), CompilationError> {
        let value = i32::from_le_bytes([
            self.read_byte().ok_or(CompilationError::UnexpectedEOF)?,
            self.read_byte().ok_or(CompilationError::UnexpectedEOF)?,
            self.read_byte().ok_or(CompilationError::UnexpectedEOF)?,
            self.read_byte().ok_or(CompilationError::UnexpectedEOF)?,
        ]);

        self.stack.push(value);
        Ok(())
    }
}

#[no_mangle]
pub fn compile_code(code: &[u8]) {
    let mut compiler = Compiler::new(code);
    compiler.compile().unwrap();
}
