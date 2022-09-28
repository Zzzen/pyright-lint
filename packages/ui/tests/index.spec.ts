import { FileSystemResolver, TestFileSystem } from '@pyright/tests/harness/vfs/filesystem';


type X = FileSystemResolver;
const fs = new TestFileSystem(false);

console.log(fs)