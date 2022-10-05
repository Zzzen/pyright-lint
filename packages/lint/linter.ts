import { Program } from '@zzzen/pyright-internal/dist/analyzer/program'

export class Linter {
    program: Program

    static createProgram() {

    }

    constructor(program: Program) {
        this.program = program
    }
}
