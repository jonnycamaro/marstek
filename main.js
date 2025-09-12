"use strict";

const utils = require("@iobroker/adapter-core");
const ModbusRTU = require("modbus-serial");
const { registers } = require("./src/registers");

class MarstekVenusAdapter extends utils.Adapter {
  constructor(options = {}) {
    super({
      ...options,
      name: "marstek",
    });

    this.client = null;
    this.pollTimer = null;
    this.connected = false;
    this.isReading = false;

    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }

  async onReady() {
    this.setState("info.connection", false, true);

    await this.ensureObjects();
    await this.connect();
    await this.subscribeStatesAsync("data.*").catch((e) => this.log.warn(`Subscribe failed: ${e.message}`));
    this.startPolling();
  }

  async ensureObjects() {
    for (const reg of registers) {
      const id = `data.${reg.id}`;
      await this.setObjectNotExistsAsync(id, {
        type: "state",
        common: {
          name: reg.name,
          type: reg.stateType,
          role: reg.role,
          read: true,
          write: !!reg.writeable,
          unit: reg.unit || undefined,
          states: reg.states || undefined,
        },
        native: {
          address: reg.address,
          length: reg.length,
          scale: reg.scale || 1,
          type: reg.type,
        },
      });
      // ensure correct write flag on existing objects too
      await this.extendObjectAsync(id, { common: { write: !!reg.writeable } });
    }
  }

  async connect() {
    const host = this.config.host;
    const port = Number(this.config.port);
    const unitId = Number(this.config.unitId || 1);
    const connectTimeoutMs = Number(this.config.connectTimeoutMs || 3000);

    if (!host || !port) {
      this.log.error("Missing host or port in adapter configuration");
      return;
    }

    try {
      if (!this.client) {
        this.client = new ModbusRTU();
      }
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("connect timeout")), connectTimeoutMs);
        this.client.connectTCP(host, { port }, (err) => {
          clearTimeout(timer);
          if (err) return reject(err);
          resolve();
        });
      });
      this.client.setID(unitId);
      this.client.setTimeout(connectTimeoutMs);
      this.connected = true;
      this.setState("info.connection", true, true);
      this.log.info(`Connected to Modbus ${host}:${port} (unit ${unitId})`);
    } catch (e) {
      this.connected = false;
      this.setState("info.connection", false, true);
      this.log.warn(`Could not connect to Modbus ${host}:${port}: ${e.message}`);
      await this.disconnect();
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        try {
          this.client.close(() => {});
        } catch (e) {
          // ignore
        }
      }
    } finally {
      this.connected = false;
      this.setState("info.connection", false, true);
    }
  }

  startPolling() {
    const pollIntervalMs = Number(this.config.pollIntervalMs || 5000);
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => this.pollOnce().catch((e) => this.log.debug(String(e))), pollIntervalMs);
    // initial
    this.pollOnce().catch((e) => this.log.debug(String(e)));
  }

  async pollOnce() {
    if (this.isReading) return;
    this.isReading = true;
    try {
      if (!this.connected) {
        await this.connect();
        if (!this.connected) return;
      }

      // Group reads by function code and contiguous addresses for efficiency
      const byFc = new Map();
      for (const reg of registers) {
        const key = `${reg.fc}:${reg.address}`;
        byFc.set(key, reg);
      }

      // For simplicity, read each register/span individually first; optimize later
      for (const reg of registers) {
        try {
          let value;
          if (reg.fc === 3) {
            value = await this.readHolding(reg);
          } else if (reg.fc === 4) {
            value = await this.readInput(reg);
          } else {
            continue;
          }

          if (value !== undefined) {
            await this.setStateAsync(`data.${reg.id}`, { val: value, ack: true });
          }
        } catch (e) {
          this.log.debug(`Read error ${reg.name} @${reg.address}: ${e.message}`);
        }
      }
    } finally {
      this.isReading = false;
    }
  }

  decodeRegisters(reg, data) {
    const scale = reg.scale || 1;
    const type = reg.type;

    const toSigned = (val, bits) => {
      const max = 1 << (bits - 1);
      return val >= max ? val - (1 << bits) : val;
    };

    // data is array of 16-bit words
    if (type === "uint16") {
      return (data[0] * (reg.scale ? reg.scale : 1));
    }
    if (type === "int16") {
      const raw = toSigned(data[0], 16);
      return raw * (reg.scale ? reg.scale : 1);
    }
    if (type === "uint32") {
      const raw = (data[0] << 16) + data[1];
      return raw * scale;
    }
    if (type === "int32") {
      const rawUnsigned = (data[0] << 16) + data[1];
      const raw = toSigned(rawUnsigned, 32);
      return raw * scale;
    }
    if (type === "char") {
      const bytes = [];
      for (const word of data) {
        bytes.push((word >> 8) & 0xff, word & 0xff);
      }
      return Buffer.from(bytes).toString("utf8").replace(/\u0000+$/, "").trim();
    }
    return undefined;
  }

  async readHolding(reg) {
    const resp = await this.client.readHoldingRegisters(reg.address, reg.length / 2);
    return this.decodeRegisters(reg, resp.data);
  }

  async readInput(reg) {
    const resp = await this.client.readInputRegisters(reg.address, reg.length / 2);
    return this.decodeRegisters(reg, resp.data);
  }

  async onStateChange(id, state) {
    if (!state || state.ack) return;
    try {
      const prefix = this.namespace + ".";
      const localId = id.startsWith(prefix) ? id.slice(prefix.length) : id;
      if (!localId.startsWith("data.")) return;
      const regId = localId.slice("data.".length);
      const reg = registers.find((r) => r.id === regId);
      if (!reg) {
        this.log.debug(`Unknown register for state change: ${id}`);
        return;
      }
      if (!reg.writeable) {
        this.log.warn(`Attempt to write read-only state ${id}`);
        return;
      }
      await this.handleWrite(reg, state.val);
    } catch (e) {
      this.log.warn(`Failed to handle write for ${id}: ${e.message}`);
    }
  }

  encodeWrite(reg, val) {
    const scale = reg.scale || 1;
    const type = reg.type;
    if (typeof val === "string" && type !== "char") {
      val = Number(val);
    }
    if (type === "uint16") {
      const raw = Math.round(val / scale);
      return [raw & 0xffff];
    }
    if (type === "int16") {
      const raw = Math.round(val / scale);
      return [raw & 0xffff];
    }
    if (type === "uint32" || type === "int32") {
      const raw = Math.round(val / scale) >>> 0;
      return [(raw >>> 16) & 0xffff, raw & 0xffff];
    }
    if (type === "char") {
      const buf = Buffer.from(String(val), "utf8");
      const words = [];
      for (let i = 0; i < reg.length; i += 2) {
        const hi = buf[i] || 0;
        const lo = buf[i + 1] || 0;
        words.push((hi << 8) | lo);
      }
      return words;
    }
    throw new Error(`Unsupported write type ${type}`);
  }

  async handleWrite(reg, val) {
    if (!this.connected) await this.connect();
    const words = this.encodeWrite(reg, val);
    await this.client.writeRegisters(reg.address, words);
    await this.setStateAsync(`data.${reg.id}`, { val, ack: true });
  }

  onUnload(callback) {
    try {
      if (this.pollTimer) clearInterval(this.pollTimer);
      this.disconnect().finally(() => callback());
    } catch (e) {
      callback();
    }
  }
}

if (module.parent) {
  module.exports = (options) => new MarstekVenusAdapter(options);
} else {
  new MarstekVenusAdapter();
}


