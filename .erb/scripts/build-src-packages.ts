import { spawn } from 'child_process';
import path from 'path';

const sourcePackages = {
  '@merged/solid-apollo': [
    `rm -rf node_modules`,
    `mkdir -p _node_modules`,
    `mv _node_modules node_modules`,
    'npm install',
    'npm run build',
    'mv node_modules _node_modules',
  ],
};

const spawnPromise = (...args: Parameters<typeof spawn>) => {
  return new Promise<void>((resolve, reject) => {
    const childProcess = spawn(args[0], args[1], {
      ...args[2],
      stdio: [process.stdin, process.stdout, process.stderr],
    });

    childProcess.on('exit', (code) => {
      if (!code) {
        resolve();
      } else {
        reject(code);
      }
    });
  });
};

(async () => {
  await Promise.all(
    Object.entries(sourcePackages).map(async ([packageName, commands]) => {
      const packageDirectory = path.resolve(
        `${__dirname}/../../node_modules/${packageName}`
      );

      console.log(
        `Building package from source: ${packageName} in ${packageDirectory}`
      );

      await commands.reduce(async (prev, commandLine) => {
        await prev;

        const [command, ...args] = commandLine.split(' ');

        console.log(`Running: "${commandLine}"`);

        await spawnPromise(command, args, {
          cwd: packageDirectory,
          stdio: [process.stdin, process.stdout, process.stderr],
        });
      }, Promise.resolve());
    })
  );
})().catch(console.error);
