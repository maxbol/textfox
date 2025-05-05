import fs from "fs"
import path from "path"
import postcss from "postcss"
import atImport from "postcss-import"
import { config } from "process";

function printUsageAndExit() {
  console.error("Usage: flatten-css <path-to-textfox> <path-to-config-css> <path-to-build-dir> <path-to-install-dir>");
  process.exit(1);
}

// Stolen from https://raw.githubusercontent.com/broccolijs/node-copy-dereference/refs/heads/master/index.js
function copyDereferenceSync(src, dest) {
  // We could try readdir'ing and catching ENOTDIR exceptions, but that is 3x
  // slower than stat'ing in the common case that we have a file.
  var srcStats = fs.statSync(src)
  if (srcStats.isDirectory()) {
    // We do not copy the directory mode by passing a second argument to
    // mkdirSync, because we wouldn't be able to populate read-only
    // directories. If we really wanted to preserve directory modes, we could
    // call chmodSync at the end.
    fs.mkdirSync(dest)
    var entries = fs.readdirSync(src).sort()
    for (var i = 0; i < entries.length; i++) {
      copyDereferenceSync(src + path.sep + entries[i], dest + path.sep + entries[i])
    }
  } else if (srcStats.isFile()) {
    var contents = fs.readFileSync(src)
    fs.writeFileSync(dest, contents, { flag: 'wx', mode: srcStats.mode })
  } else {
    throw new Error('Unexpected file type for ' + src)
  }
  fs.utimesSync(dest, srcStats.atime, srcStats.mtime)
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 4) {
    printUsageAndExit();
  }

  const textFoxPackagePath = args[0];
  const configCssPath = args[1];
  const buildDirPath = args[2];
  const installDirPath = args[3];

  if (!fs.existsSync(textFoxPackagePath) || !fs.lstatSync(textFoxPackagePath).isDirectory()) {
    console.error(`<path-to-textfox> ${textFoxPackagePath} either doesn't exist or is not a directory`);
    printUsageAndExit();
  }

  if (!fs.existsSync(configCssPath) || !fs.lstatSync(configCssPath).isFile()) {
    console.error(`<path-to-config-css> ${configCssPath} either doesn't exist or is not a file`);
    printUsageAndExit();
  }

  fs.mkdirSync(`${buildDirPath}/chrome/`, { recursive: true, });
  const chromeEntries = fs.readdirSync(`${textFoxPackagePath}/chrome`);
  for (const entry of chromeEntries) {
    console.log(`Copying ${textFoxPackagePath}/chrome/${entry} to ${buildDirPath}/chrome/${entry}`);
    copyDereferenceSync(`${textFoxPackagePath}/chrome/${entry}`, `${buildDirPath}/chrome/${entry}`);
  }
  console.log(`Copying ${configCssPath} to ${buildDirPath}/chrome/config.css`);
  copyDereferenceSync(configCssPath, `${buildDirPath}/chrome/config.css`);

  fs.mkdirSync(`${installDirPath}/chrome/`, { recursive: true, });
  for (const cssFile of [`userContent.css`, `userChrome.css`]) {
    const buildPath = `${buildDirPath}/chrome/${cssFile}`;
    const installPath = `${installDirPath}/chrome/${cssFile}`;
    const css = fs.readFileSync(buildPath, "utf8");
    const result = await postcss().use(atImport({
      filter: (importPath) => {
        return path.basename(importPath) !== "colors.css";
      }
    })).process(css, {
      from: buildPath,
    });
    fs.writeFileSync(installPath, result.css, { encoding: "utf8" });
  }
}

main()
