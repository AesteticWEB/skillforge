const normalizePath = (filePath) => filePath.replace(/\\/g, "/");
const isFrontendFile = (filePath) =>
  !normalizePath(filePath).includes("/skillforge-next/");

const filterFiles = (files) => files.filter(isFrontendFile);

const quote = (filePath) => `"${filePath.replace(/"/g, '\\"')}"`;

const buildCommand = (command, files) => {
  if (!files.length) {
    return [];
  }
  return `${command} ${files.map(quote).join(" ")}`;
};

module.exports = {
  "*.{ts,html}": (files) => {
    const filtered = filterFiles(files);
    if (!filtered.length) {
      return [];
    }
    return [
      buildCommand("eslint --max-warnings=0 --fix", filtered),
      buildCommand("prettier --write --ignore-path .prettierignore", filtered),
    ].filter(Boolean);
  },
  "*.{css,scss,md,json}": (files) => {
    const filtered = filterFiles(files);
    return buildCommand("prettier --write --ignore-path .prettierignore", filtered);
  },
};
