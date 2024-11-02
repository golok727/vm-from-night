use std::fmt;

const OP_LOAD: u8 = 0x01;
const OP_ADD: u8 = 0x02;
const OP_PRINT: u8 = 0x03;

#[cfg(target_arch = "wasm32")]
extern "C" {
    fn js_print_value(msg: *const u8, len: usize); // Only called in WASM context
    fn js_report_error(msg: *const u8, len: usize);
}

fn platform_std_out(value: i32) {
    let message = format!("[STD_OUT]: {value}");

    #[cfg(target_arch = "wasm32")]
    unsafe {
        let bytes = message.as_bytes();
        js_print_value(bytes.as_ptr(), message.len());
    }

    #[cfg(not(target_arch = "wasm32"))]
    println!("{}", &message);
}

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
        platform_std_out(*to_print);
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
pub fn execute_bytecode(code: *const u8, length: usize) {
    let bytecode = unsafe { std::slice::from_raw_parts(code, length) };

    let mut compiler = Vm::new(bytecode);

    if let Err(e) = compiler.compile() {
        let message = format!("Error during VM execution: {}", e);
        eprintln!("{}", &message);

        #[cfg(target_arch = "wasm32")]
        {
            let bytes = message.as_bytes();
            unsafe {
                js_report_error(bytes.as_ptr(), message.len());
            }
        }
    }
}

#[no_mangle]
pub fn alloc(len: usize) -> *mut u8 {
    let mut buf = Vec::with_capacity(len);
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf);
    return ptr;
}
