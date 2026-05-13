import * as fs from "fs";
import * as yaml from "js-yaml";
import * as path from "path";

export class Config {
  constructor(properties) {
    this.addAll(properties);
  }

  public get(key: string): any {
    return this[key];
  }

  public addAll(properties): any {
    properties = objectToArray(properties);
    for (const property in properties) {
      if (properties.hasOwnProperty(property)) {
        this[property] = properties[property];
      }
    }
    this.postProcess();
  }

  public postProcess(): any {
    const variables = { ...this, ...process.env };
    for (const property in this) {
      if (this.hasOwnProperty(property)) {
        const value = this[property];
        const processedValue = this.processTemplate(value, variables);
        this[property] = processedValue;
      }
    }
  }

  private processTemplate(template, variables): any {
    if (typeof template === "string") {
      return template.replace(
        new RegExp("\\${[^{]+}", "g"),
        (name) => variables[name.substring(2, name.length - 1)]
      );
    }
    return template;
  }
}

const configDir = fs.existsSync(path.join(__dirname, "application.yml"))
  ? __dirname
  : path.join(process.cwd(), "src/config");

const yamlConfigPath = path.join(configDir, "application.yml");
const envYamlConfigPath = path.join(
  configDir,
  `application-${process.env.BACKEND_ENV || "dev"}.yml`
);
const yamlConfig = yaml.load(fs.readFileSync(yamlConfigPath, "utf8"));

if (!fs.existsSync(envYamlConfigPath)) {
}

const envYamlConfig = yaml.load(fs.readFileSync(envYamlConfigPath, "utf8"));

const config = new Config({
  ...objectToArray(yamlConfig),
  ...objectToArray(envYamlConfig),
  ipAddress: ipAddress(),
});

export { config };

function objectToArray(source, currentKey?, target?): any {
  target = target || {};
  for (const property in source) {
    if (source.hasOwnProperty(property)) {
      const newKey = currentKey ? currentKey + "." + property : property;
      const newVal = source[property];

      if (typeof newVal === "object") {
        objectToArray(newVal, newKey, target);
      } else {
        target[newKey] = newVal;
      }
    }
  }
  return target;
}

function ipAddress(): any {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const interfaces = require("os").networkInterfaces();
  for (const dev in interfaces) {
    if (interfaces.hasOwnProperty(dev)) {
      const iface = interfaces[dev];
      for (const alias of iface) {
        if (
          alias.family === "IPv4" &&
          alias.address !== "127.0.0.1" &&
          !alias.internal
        ) {
          return alias.address;
        }
      }
    }
  }

  return null;
}