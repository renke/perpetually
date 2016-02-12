import "babel-polyfill";

import {readFileSync, writeFileSync} from "fs";
import {parse} from "react-docgen";

const componentInfo = parse(readFileSync(`${__dirname}/../src/index.js`));

const header = `
Name | Type | Required | Description
-----|------|----------|------------`;

const body = Object.keys(componentInfo.props).map(name => {
  const {description, type, required} = componentInfo.props[name];
  return `
${name} | ${type.name} | ${required ? "✔" : ""} | ${description}`;
});

const readmePath = `${__dirname}/../README.md`;

const readmeContent = readFileSync(readmePath).toString();

const newReadmeContent = readmeContent.replace(/(## API)((?:.|\n)*?)(#)/m,
`$1
${header}${body}

$3`);

writeFileSync(readmePath, newReadmeContent);
