const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const CONFIG_PATH = path.join(DATA_DIR, "config.json");

const DEFAULT_CONFIG = {
  lidarrUrl: "",
  lidarrApiKey: "",
};

/** @returns {{ lidarrUrl: string, lidarrApiKey: string }} */
function loadConfig() {
  try {
    const data = fs.readFileSync(CONFIG_PATH, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/** @param {{ lidarrUrl: string, lidarrApiKey: string }} config */
function saveConfig(config) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

module.exports = { loadConfig, saveConfig };
