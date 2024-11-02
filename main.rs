extern "Rust" {
    fn execute_bytecode(code: *const u8, length: usize);
}

#[repr(C)]
#[derive(Debug)]
enum Instruction {
    Load(i32),
    Print,
    Add,
}

impl Instruction {
    #[inline]
    fn op_code(&self) -> u8 {
        match self {
            Instruction::Load(_) => 0x01,
            Instruction::Add => 0x02,
            Instruction::Print => 0x03,
        }
    }

    fn to_bytes(&self) -> Vec<u8> {
        let op_code = self.op_code();
        match self {
            Instruction::Load(value) => {
                let mut bytes = vec![op_code];
                bytes.extend_from_slice(&value.to_le_bytes());
                bytes
            }
            _ => vec![op_code],
        }
    }
}

fn main() {
    use std::fs;
    use std::io::Write;
    let mut bytecode: Vec<u8> = vec![];

    use Instruction::*;
    #[rustfmt::skip]
    let instructions: Vec<Instruction> = vec![
        Load(10),
        Load(10),
        Add,
        Print,
        Load(30),
        Add,
        Print,
        Load(50),
        Add,
        Print,
    ];

    for instruction in instructions {
        bytecode.extend(instruction.to_bytes());
    }

    unsafe {
        execute_bytecode(bytecode.as_ptr(), bytecode.len());
    }

    let mut binary_file = fs::File::create("./thing/thing.instructions").unwrap();
    binary_file.write_all(bytecode.as_ref()).unwrap();
}
