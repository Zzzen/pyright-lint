import * as fs from "fs";
import * as path from "path";
import { Linter } from "../linter";

const e2eDir = path.join(__dirname, "e2e");
const dirs = fs.readdirSync(e2eDir);

expect.addSnapshotSerializer({
  test: (val) => val && typeof val.start === 'number' && typeof val.length === 'number',
  print: (val: any) => {
    return `TextRange(${val.start}, ${val.length})`;
  }
})

describe("e2e", () => {
  for (const dirName of dirs) {
    const dir = path.join(e2eDir, dirName);
    it("should pass " + dirName, (done) => {
      const linter = new Linter({ projectRoot: dir });
      const service = linter.service;
      // service.setCompletionCallback(cb => {
      //   console.log({
      //     diagnostics: cb.diagnostics,
      //   })
      //   done()
      // })
      while (service.backgroundAnalysisProgram.program.analyze()) {}
      // const files = globbySync(appliedConfig.include, {})
      const errors = linter.lintFiles();
      expect(errors).toMatchSnapshot(dirName);
      done();
    });
  }
});
