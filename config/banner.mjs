import jsonfile from "jsonfile";
import template from "lodash/template.js";
import fs from "node:fs";

export const getBanner = () => {
  const headerTemplate = fs.readFileSync("./src/header.txt", "utf8");
  const { version } = jsonfile.readFileSync("package.json");

  const data = {
    version,
    year: new Date().getFullYear(),
  };

  const banner = template(headerTemplate)(data);
  return `/*\n${banner}\n*/`;
};
