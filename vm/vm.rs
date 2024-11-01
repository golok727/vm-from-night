use std::fmt;

const OP_LOAD: u8 = 0x01;
const OP_ADD: u8 = 0x02;
const OP_PRINT: u8 = 0x03;

struct Vm<'a> {
    ip: usize,
    stack: Vec<i32>,
    code: &'a [u8],
}

#[derive(Debug, Clone)]
enum VmError {
    UnknownCode,
    UnexpectedEOF,
    InsufficientArguments,
}

impl fmt::Display for VmError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let message = match self {
            Self::UnknownCode => "Unknown Byte Code",
            Self::UnexpectedEOF => "Unexpected End of file",
            Self::InsufficientArguments => "InsufficientArguments",
        };

        write!(f, "[VmError]: {message}")
    }
}

impl<'a> Vm<'a> {
    pub fn new(code: &'a [u8]) -> Self {
        Self {
            ip: 0,
            stack: Vec::new(),
            code,
        }
    }

    pub fn compile(&mut self) -> Result<(), VmError> {
        while let Some(opcode) = self.read_byte() {
            match opcode {
                OP_LOAD => self.op_load()?,
                OP_ADD => self.op_add()?,
                OP_PRINT => self.op_print()?,
                _ => {
                    return Err(VmError::UnknownCode);
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

    pub fn op_add(&mut self) -> Result<(), VmError> {
        let a = self.stack.pop().ok_or(VmError::InsufficientArguments)?;
        let b = self.stack.pop().ok_or(VmError::InsufficientArguments)?;
        self.stack.push(a + b);
        Ok(())
    }

    pub fn op_print(&mut self) -> Result<(), VmError> {
        let to_print = self.stack.last().ok_or(VmError::InsufficientArguments)?;
        println!("[STD_OUT] {}", to_print);
        Ok(())
    }

    pub fn op_load(&mut self) -> Result<(), VmError> {
        let value = i32::from_le_bytes([
            self.read_byte().ok_or(VmError::UnexpectedEOF)?,
            self.read_byte().ok_or(VmError::UnexpectedEOF)?,
            self.read_byte().ok_or(VmError::UnexpectedEOF)?,
            self.read_byte().ok_or(VmError::UnexpectedEOF)?,
        ]);

        self.stack.push(value);
        Ok(())
    }
}

#[no_mangle]
pub fn run_vm(code: &[u8]) {
    let mut compiler = Vm::new(code);
    compiler.compile().unwrap();
}
